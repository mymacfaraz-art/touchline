// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: MATCH RESULT PERSISTER
// Atomic persistence of match simulation results and football-world updates.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { MatchSimulationResult } from '../../simulation/models/simulation-contracts';
import { toTacticDocument, DomainTactics } from '../../domain/types/tactics';
import { MatchPersistenceError } from '../errors/orchestration.errors';
import { SquadSelection } from '../types/orchestration.types';

export class MatchResultPersister {
  /**
   * Atomically persists a completed match simulation result and updates
   * all relevant football-world entities within a single database transaction.
   */
  public async persistMatchResult(params: {
    fixtureId: string;
    gameSeasonId: string;
    competitionSeasonId: string;
    phaseType: string;
    homeClubId: string;
    awayClubId: string;
    homeTactics: DomainTactics;
    awayTactics: DomainTactics;
    homeSquad: SquadSelection;
    awaySquad: SquadSelection;
    simulationResult: MatchSimulationResult;
  }): Promise<{ matchId: string }> {
    const { simulationResult, fixtureId, gameSeasonId, competitionSeasonId, phaseType, homeClubId, awayClubId } = params;

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Double-check fixture is not already completed inside transaction
        const existingFixture = await tx.fixture.findUnique({
          where: { id: fixtureId },
        });

        if (!existingFixture) {
          throw new Error(`Fixture '${fixtureId}' not found.`);
        }
        if (existingFixture.status === 'COMPLETED') {
          throw new Error(`Fixture '${fixtureId}' is already completed.`);
        }

        // 2. Prepare snapshots
        const homeTacticsSnapshot = toTacticDocument(params.homeTactics);
        const awayTacticsSnapshot = toTacticDocument(params.awayTactics);

        const homeLineupSnapshot = {
          startingXI: params.homeSquad.startingXI,
          bench: params.homeSquad.bench,
        };
        const awayLineupSnapshot = {
          startingXI: params.awaySquad.startingXI,
          bench: params.awaySquad.bench,
        };

        // 3. Create Match record
        const match = await tx.match.create({
          data: {
            fixtureId,
            homeScore: simulationResult.homeScore,
            awayScore: simulationResult.awayScore,
            homeScoreHT: simulationResult.homeScoreHT,
            awayScoreHT: simulationResult.awayScoreHT,
            homeTacticsSnapshot: homeTacticsSnapshot as any,
            awayTacticsSnapshot: awayTacticsSnapshot as any,
            homeLineupSnapshot: homeLineupSnapshot as any,
            awayLineupSnapshot: awayLineupSnapshot as any,
            snapshotSchemaVersion: '1',
            seed: String(simulationResult.seed),
            simulationEngineVersion: simulationResult.simulationEngineVersion,
            simulatedAt: new Date(simulationResult.executedAt),
          },
        });

        // 4. Update Fixture status to COMPLETED
        await tx.fixture.update({
          where: { id: fixtureId },
          data: { status: 'COMPLETED' },
        });

        // 5. Create MatchStatistics
        const stats = simulationResult.statistics;
        await tx.matchStatistics.create({
          data: {
            matchId: match.id,
            homePossession: stats.homeStats.possession,
            awayPossession: stats.awayStats.possession,
            homeShots: stats.homeStats.shots,
            awayShots: stats.awayStats.shots,
            homeShotsOnTarget: stats.homeStats.shotsOnTarget,
            awayShotsOnTarget: stats.awayStats.shotsOnTarget,
            homeXg: stats.homeStats.xg,
            awayXg: stats.awayStats.xg,
            homePasses: stats.homeStats.passes,
            awayPasses: stats.awayStats.passes,
            homePassAccuracy: stats.homeStats.passAccuracy,
            awayPassAccuracy: stats.awayStats.passAccuracy,
            homeFouls: stats.homeStats.fouls,
            awayFouls: stats.awayStats.fouls,
            homeYellowCards: stats.homeStats.yellowCards,
            awayYellowCards: stats.awayStats.yellowCards,
            homeRedCards: stats.homeStats.redCards,
            awayRedCards: stats.awayStats.redCards,
            homeCorners: stats.homeStats.corners,
            awayCorners: stats.awayStats.corners,
            homeTackles: stats.homeStats.tackles,
            awayTackles: stats.awayStats.tackles,
            homeInterceptions: stats.homeStats.interceptions,
            awayInterceptions: stats.awayStats.interceptions,
          },
        });

        // 6. Create MatchEvent records
        if (simulationResult.events && simulationResult.events.length > 0) {
          await tx.matchEvent.createMany({
            data: simulationResult.events.map((e) => ({
              matchId: match.id,
              minute: e.minute,
              addedTime: e.addedTime ?? null,
              kind: e.kind as any,
              teamId: e.teamId,
              primaryPlayerId: e.primaryPlayerId ?? null,
              secondaryPlayerId: e.secondaryPlayerId ?? null,
              xgValue: e.xgValue ?? null,
              metadata: e.metadata ? (e.metadata as any) : null,
              description: e.description,
            })),
          });
        }

        // 7. Create PlayerMatchPerformance records & update PlayerCondition / Stats
        for (const perf of simulationResult.playerPerformances) {
          await tx.playerMatchPerformance.create({
            data: {
              matchId: match.id,
              playerId: perf.playerId,
              teamId: perf.teamId,
              isStarting: perf.isStarting,
              minutesPlayed: perf.minutesPlayed,
              rating: perf.rating,
              goals: perf.goals,
              assists: perf.assists,
              shots: perf.shots,
              shotsOnTarget: perf.shotsOnTarget,
              keyPasses: perf.keyPasses,
              passesCompleted: perf.passesCompleted,
              passAccuracy: perf.passAccuracy,
              tackles: perf.tackles,
              interceptions: perf.interceptions,
              aerialDuelsWon: perf.aerialDuelsWon,
              yellowCards: perf.yellowCards,
              redCards: perf.redCards,
              xg: perf.xg,
              xgAssisted: perf.xgAssisted,
              wasSubstitutedOff: perf.wasSubstitutedOff,
              substitutedOffMinute: perf.substitutedOffMinute ?? null,
            },
          });

          // 7a. Update PlayerCondition (fatigue accumulation & fitness/form adjust)
          const existingCond = await tx.playerCondition.findUnique({
            where: {
              playerId_gameSeasonId: {
                playerId: perf.playerId,
                gameSeasonId,
              },
            },
          });

          if (existingCond) {
            const matchFatigue = Math.round((perf.minutesPlayed / 90) * 15);
            const newFatigue = Math.min(100, existingCond.fatigue + matchFatigue);
            const newFitness = Math.max(0, existingCond.fitness - matchFatigue * 0.8);
            const newForm = Math.round(existingCond.form * 0.7 + perf.rating * 10 * 0.3);

            await tx.playerCondition.update({
              where: { id: existingCond.id },
              data: {
                fatigue: newFatigue,
                fitness: newFitness,
                form: newForm,
              },
            });
          }

          // 7b. Update PlayerCompetitionStats accumulator
          const registration = await tx.playerClubRegistration.findFirst({
            where: {
              playerId: perf.playerId,
              clubId: perf.teamId,
              gameSeasonId,
              isActive: true,
            },
          });

          if (registration) {
            const isCleanSheet =
              (perf.teamId === homeClubId && simulationResult.awayScore === 0) ||
              (perf.teamId === awayClubId && simulationResult.homeScore === 0);

            const existingStats = await tx.playerCompetitionStats.findUnique({
              where: {
                registrationId_competitionSeasonId: {
                  registrationId: registration.id,
                  competitionSeasonId,
                },
              },
            });

            if (existingStats) {
              const newApps = existingStats.appearances + 1;
              const newAvgRating =
                (existingStats.averageRating * existingStats.appearances + perf.rating) / newApps;

              await tx.playerCompetitionStats.update({
                where: { id: existingStats.id },
                data: {
                  appearances: newApps,
                  starts: existingStats.starts + (perf.isStarting ? 1 : 0),
                  minutesPlayed: existingStats.minutesPlayed + perf.minutesPlayed,
                  goals: existingStats.goals + perf.goals,
                  assists: existingStats.assists + perf.assists,
                  yellowCards: existingStats.yellowCards + perf.yellowCards,
                  redCards: existingStats.redCards + perf.redCards,
                  cleanSheets: existingStats.cleanSheets + (isCleanSheet ? 1 : 0),
                  averageRating: newAvgRating,
                },
              });
            } else {
              await tx.playerCompetitionStats.create({
                data: {
                  playerId: perf.playerId,
                  registrationId: registration.id,
                  competitionSeasonId,
                  appearances: 1,
                  starts: perf.isStarting ? 1 : 0,
                  minutesPlayed: perf.minutesPlayed,
                  goals: perf.goals,
                  assists: perf.assists,
                  yellowCards: perf.yellowCards,
                  redCards: perf.redCards,
                  cleanSheets: isCleanSheet ? 1 : 0,
                  averageRating: perf.rating,
                },
              });
            }
          }
        }

        // 8. Update SeasonClubParticipation standings (for LEAGUE_ROUNDS / GROUP phases)
        if (phaseType === 'LEAGUE_ROUNDS' || phaseType === 'GROUP') {
          await this.updateStandings(tx, competitionSeasonId, homeClubId, awayClubId, simulationResult.homeScore, simulationResult.awayScore);
        }

        return { matchId: match.id };
      });
    } catch (err: any) {
      throw new MatchPersistenceError(fixtureId, err.message || String(err));
    }
  }

  /**
   * Updates standings for home and away clubs in SeasonClubParticipation.
   */
  private async updateStandings(
    tx: any,
    competitionSeasonId: string,
    homeClubId: string,
    awayClubId: string,
    homeScore: number,
    awayScore: number
  ): Promise<void> {
    const isHomeWin = homeScore > awayScore;
    const isAwayWin = awayScore > homeScore;
    const isDraw = homeScore === awayScore;

    // Update Home Club
    const homePart = await tx.seasonClubParticipation.findUnique({
      where: { competitionSeasonId_clubId: { competitionSeasonId, clubId: homeClubId } },
    });
    if (homePart) {
      await tx.seasonClubParticipation.update({
        where: { id: homePart.id },
        data: {
          played: homePart.played + 1,
          won: homePart.won + (isHomeWin ? 1 : 0),
          drawn: homePart.drawn + (isDraw ? 1 : 0),
          lost: homePart.lost + (isAwayWin ? 1 : 0),
          goalsFor: homePart.goalsFor + homeScore,
          goalsAgainst: homePart.goalsAgainst + awayScore,
          points: homePart.points + (isHomeWin ? 3 : isDraw ? 1 : 0),
        },
      });
    }

    // Update Away Club
    const awayPart = await tx.seasonClubParticipation.findUnique({
      where: { competitionSeasonId_clubId: { competitionSeasonId, clubId: awayClubId } },
    });
    if (awayPart) {
      await tx.seasonClubParticipation.update({
        where: { id: awayPart.id },
        data: {
          played: awayPart.played + 1,
          won: awayPart.won + (isAwayWin ? 1 : 0),
          drawn: awayPart.drawn + (isDraw ? 1 : 0),
          lost: awayPart.lost + (isHomeWin ? 1 : 0),
          goalsFor: awayPart.goalsFor + awayScore,
          goalsAgainst: awayPart.goalsAgainst + homeScore,
          points: awayPart.points + (isAwayWin ? 3 : isDraw ? 1 : 0),
        },
      });
    }
  }
}
