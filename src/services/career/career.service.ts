// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 7: CAREER & SEASON SERVICES
// Comprehensive Career Lifecycle, Calendar, Standings, Knockout & Advancement
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { MatchdayOrchestrator } from '../../orchestration/matchday-orchestrator';
import { StandingsRow, MatchdayAdvancementResult, SeasonSummary } from '../../domain/types/career-progression';

export class CareerService {
  /**
   * Creates an independent career with initial season, selected club, and optional manager identity.
   */
  public async createCareer(params: {
    userId: string;
    name: string;
    selectedClubId?: string;
    managerName?: string;
    startYear?: number;
  }): Promise<{ careerId: string; gameSeasonId: string }> {
    const { userId, name, selectedClubId, managerName, startYear = 2024 } = params;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Career record
      const career = await tx.career.create({
        data: {
          userId,
          name,
        },
      });

      // 2. Create initial GameSeason
      const gameSeason = await tx.gameSeason.create({
        data: {
          careerId: career.id,
          yearStart: startYear,
          yearEnd: startYear + 1,
          isCurrent: true,
          isComplete: false,
        },
      });

      // 3. Update career currentGameSeasonId
      await tx.career.update({
        where: { id: career.id },
        data: { currentGameSeasonId: gameSeason.id },
      });

      // 4. Create manager record if provided
      if (managerName) {
        const [firstName, ...rest] = managerName.split(' ');
        const lastName = rest.join(' ') || '';
        await tx.manager.create({
          data: {
            userId,
            firstName: firstName || 'Manager',
            lastName: lastName || '',
            nationality: 'ENG',
            clubId: selectedClubId || null,
            isAI: false,
          },
        });
      }

      // 5. Initialize ClubSeasonState for clubs
      const clubs = await tx.club.findMany({ take: 50 });
      for (const club of clubs) {
        await tx.clubSeasonState.create({
          data: {
            clubId: club.id,
            gameSeasonId: gameSeason.id,
            transferBudget: club.reputation * 1_000_000,
            wageBudget: club.reputation * 50_000,
            boardConfidence: 60,
            fanHappiness: 60,
            squadMorale: 70,
            facilityLevel: 'AVERAGE',
            boardAmbition: 'MID_TABLE',
          },
        });
      }

      return { careerId: career.id, gameSeasonId: gameSeason.id };
    });
  }

  /**
   * Loads career state, ensuring isolation from other careers.
   */
  public async loadCareer(careerId: string) {
    const career = await prisma.career.findUnique({
      where: { id: careerId },
      include: {
        gameSeasons: {
          orderBy: { yearStart: 'desc' },
          include: {
            competitionSeasons: {
              include: {
                competition: true,
                phases: true,
                clubParticipations: {
                  include: { club: true },
                },
              },
            },
          },
        },
      },
    });

    if (!career) {
      throw new Error(`Career with ID '${careerId}' not found.`);
    }

    return career;
  }
}

export class SeasonProgressionService {
  private orchestrator: MatchdayOrchestrator;

  constructor(orchestrator?: MatchdayOrchestrator) {
    this.orchestrator = orchestrator || new MatchdayOrchestrator();
  }

  /**
   * Advances the matchweek calendar for a given competition season or game season.
   * Simulates all scheduled fixtures for the next matchweek idempotently.
   */
  public async advanceToNextMatchday(params: {
    competitionSeasonId: string;
    matchWeek?: number;
  }): Promise<MatchdayAdvancementResult> {
    const { competitionSeasonId } = params;

    // 1. Find the target phase
    const phases = await prisma.competitionPhase.findMany({
      where: { competitionSeasonId },
      orderBy: { order: 'asc' },
      include: {
        fixtures: {
          where: { status: 'SCHEDULED' },
          orderBy: { matchDate: 'asc' },
        },
      },
    });

    const activePhase = phases.find((p) => p.fixtures.length > 0);
    if (!activePhase) {
      return {
        simulatedFixturesCount: 0,
        completedFixtures: [],
        standingsUpdated: false,
        nextMatchDate: new Date(),
        isSeasonComplete: true,
      };
    }

    // Determine target matchWeek
    const targetWeek = params.matchWeek ?? activePhase.fixtures[0].matchWeek;
    const fixturesToPlay = activePhase.fixtures.filter((f) => f.matchWeek === targetWeek);

    const completedFixtures = [];

    // 2. Simulate each scheduled fixture
    for (const fixture of fixturesToPlay) {
      if (fixture.status === 'COMPLETED') continue;

      const result = await this.orchestrator.orchestrateMatchday({
        fixtureId: fixture.id,
      });

      completedFixtures.push({
        fixtureId: fixture.id,
        homeClubId: result.homeClubId,
        awayClubId: result.awayClubId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      });
    }

    // Check if remaining fixtures exist
    const remaining = await prisma.fixture.count({
      where: {
        competitionPhase: { competitionSeasonId },
        status: 'SCHEDULED',
      },
    });

    return {
      simulatedFixturesCount: completedFixtures.length,
      completedFixtures,
      standingsUpdated: completedFixtures.length > 0,
      nextMatchDate: new Date(),
      isSeasonComplete: remaining === 0,
    };
  }

  /**
   * Retrieves authoritative league table standings derived strictly from persisted records.
   */
  public async getStandings(competitionSeasonId: string): Promise<StandingsRow[]> {
    const participations = await prisma.seasonClubParticipation.findMany({
      where: { competitionSeasonId },
      include: { club: true },
    });

    const rows: StandingsRow[] = participations.map((p) => ({
      clubId: p.clubId,
      clubName: p.club.name,
      clubCode: p.club.code,
      played: p.played,
      won: p.won,
      drawn: p.drawn,
      lost: p.lost,
      goalsFor: p.goalsFor,
      goalsAgainst: p.goalsAgainst,
      goalDifference: p.goalsFor - p.goalsAgainst,
      points: p.points,
      promotionStatus: p.promotionStatus,
    }));

    // Standard football sort: Points DESC, Goal Difference DESC, Goals For DESC, Club Name ASC
    return rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.clubName.localeCompare(b.clubName);
    });
  }

  /**
   * Finalizes the current season, calculates winners, and rolls over to the next season atomically.
   */
  public async rolloverSeason(params: {
    careerId: string;
    currentGameSeasonId: string;
  }): Promise<{ newGameSeasonId: string; summary: SeasonSummary }> {
    const { careerId, currentGameSeasonId } = params;

    return await prisma.$transaction(async (tx) => {
      const currentSeason = await tx.gameSeason.findUnique({
        where: { id: currentGameSeasonId },
        include: {
          competitionSeasons: {
            include: {
              competition: true,
              clubParticipations: {
                include: { club: true },
                orderBy: [{ points: 'desc' }, { goalsFor: 'desc' }],
              },
            },
          },
        },
      });

      if (!currentSeason) {
        throw new Error(`GameSeason '${currentGameSeasonId}' not found.`);
      }

      // Mark current season complete
      await tx.gameSeason.update({
        where: { id: currentGameSeasonId },
        data: { isCurrent: false, isComplete: true },
      });

      const champions: { competitionCode: string; clubId: string; clubName: string }[] = [];
      const promotedClubs: string[] = [];
      const relegatedClubs: string[] = [];

      for (const cs of currentSeason.competitionSeasons) {
        if (cs.clubParticipations.length > 0) {
          const winner = cs.clubParticipations[0];
          await tx.competitionSeason.update({
            where: { id: cs.id },
            data: { isComplete: true, winnerClubId: winner.clubId },
          });

          champions.push({
            competitionCode: cs.competition.code,
            clubName: winner.club.name,
            clubId: winner.clubId,
          });

          // Process promotion & relegation if configured
          if (cs.competition.hasRelegation && cs.competition.relegationSpots > 0) {
            const relSpots = cs.competition.relegationSpots;
            const toRelegate = cs.clubParticipations.slice(-relSpots);
            for (const rel of toRelegate) {
              await tx.seasonClubParticipation.update({
                where: { id: rel.id },
                data: { promotionStatus: 'RELEGATED' },
              });
              relegatedClubs.push(rel.club.name);
            }
          }
        }
      }

      // Create Next GameSeason (e.g. 2025/26)
      const nextYearStart = currentSeason.yearStart + 1;
      const nextYearEnd = currentSeason.yearEnd + 1;

      const newSeason = await tx.gameSeason.create({
        data: {
          careerId,
          yearStart: nextYearStart,
          yearEnd: nextYearEnd,
          isCurrent: true,
          isComplete: false,
        },
      });

      // Update Career currentGameSeasonId
      await tx.career.update({
        where: { id: careerId },
        data: { currentGameSeasonId: newSeason.id },
      });

      // Rollover active player registrations into the new season
      const activeRegs = await tx.playerClubRegistration.findMany({
        where: {
          gameSeasonId: currentGameSeasonId,
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date(`${nextYearStart}-07-01`) } },
          ],
        },
      });

      for (const reg of activeRegs) {
        await tx.playerClubRegistration.create({
          data: {
            playerId: reg.playerId,
            clubId: reg.clubId,
            gameSeasonId: newSeason.id,
            registrationType: reg.registrationType,
            startDate: new Date(`${nextYearStart}-07-01`),
            endDate: reg.endDate,
            isActive: true,
          },
        });

        // Initialize clean condition for new season
        await tx.playerCondition.create({
          data: {
            playerId: reg.playerId,
            gameSeasonId: newSeason.id,
            fitness: 100,
            fatigue: 0,
            morale: 75,
            confidence: 75,
            sharpness: 75,
            form: 50,
            tacticalFamiliarity: 60,
          },
        });
      }

      // Recreate CompetitionSeasons for new season
      for (const cs of currentSeason.competitionSeasons) {
        const newCompSeason = await tx.competitionSeason.create({
          data: {
            competitionId: cs.competitionId,
            gameSeasonId: newSeason.id,
            isComplete: false,
          },
        });

        // Create main league phase
        await tx.competitionPhase.create({
          data: {
            competitionSeasonId: newCompSeason.id,
            name: `${cs.competition.code} Regular Season`,
            phaseType: 'LEAGUE_ROUNDS',
            order: 1,
            isComplete: false,
          },
        });

        // Copy participating clubs
        for (const p of cs.clubParticipations) {
          await tx.seasonClubParticipation.create({
            data: {
              competitionSeasonId: newCompSeason.id,
              clubId: p.clubId,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              points: 0,
            },
          });
        }
      }

      const summary: SeasonSummary = {
        gameSeasonId: currentGameSeasonId,
        yearStart: currentSeason.yearStart,
        yearEnd: currentSeason.yearEnd,
        champions,
        promotedClubs,
        relegatedClubs,
        topScorers: [],
      };

      return { newGameSeasonId: newSeason.id, summary };
    });
  }
}
