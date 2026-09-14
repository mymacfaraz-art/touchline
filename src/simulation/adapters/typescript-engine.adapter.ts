import {
  IMatchEngine,
  MatchSimulationInput,
  MatchSimulationResult,
} from '../models/simulation-contracts';
import { SeededRNG } from '../engine/rng';
import { DomainMatchEvent, PlayerMatchPerformance, TeamMatchStats } from '../../domain/types/match';
import { PlayerSimulationState } from '../models/simulation-contracts';

/**
 * Pure TypeScript implementation of IMatchEngine.
 * Uses SeededRNG to guarantee 100% deterministic, explainable, and
 * reproducible simulation results — identical inputs + seed = identical output.
 *
 * This is the foundation-phase implementation only.
 * It establishes the correct contracts and attribute access patterns.
 * Tactical depth and match mechanics will be expanded in Phase 3.
 */
export class TypeScriptMatchEngine implements IMatchEngine {
  public readonly engineId = 'ts-statistical-v1';
  public readonly version = '1.0.0-foundation';

  public simulateMatch(input: MatchSimulationInput): MatchSimulationResult {
    const rng = new SeededRNG(input.seed);

    // Compute team powers from player attributes and condition
    const homePower = this.calculateTeamPower(input.homeTeam, true, rng);
    const awayPower = this.calculateTeamPower(input.awayTeam, false, rng);

    // Generate goals using Poisson-approximated seedable probabilities
    const homeScore = this.generateGoals(homePower, awayPower, rng);
    const awayScore = this.generateGoals(awayPower, homePower, rng);
    const homeScoreHT = Math.min(homeScore, this.generateGoals(homePower * 0.5, awayPower * 0.5, rng));
    const awayScoreHT = Math.min(awayScore, this.generateGoals(awayPower * 0.5, homePower * 0.5, rng));

    // Build persisted event timeline
    const events: DomainMatchEvent[] = [];

    events.push({
      minute: 0,
      kind: 'KICK_OFF',
      teamId: input.homeTeam.teamId,
      description: `Kick off: ${input.homeTeam.clubName} vs ${input.awayTeam.clubName}.`,
    });

    if (homeScore > 0) {
      const scorer = input.homeTeam.startingXI[rng.nextInt(0, input.homeTeam.startingXI.length - 1)];
      const minute = rng.nextInt(10, 85);
      const xgValue = Number((0.15 + rng.nextFloat() * 0.55).toFixed(2));
      events.push({
        minute,
        kind: 'GOAL',
        teamId: input.homeTeam.teamId,
        primaryPlayerId: scorer?.player.id,
        xgValue,
        description: `GOAL! ${scorer?.player.shortName ?? 'Home player'} scores for ${input.homeTeam.clubName}!`,
      });
    }

    if (awayScore > 0) {
      const scorer = input.awayTeam.startingXI[rng.nextInt(0, input.awayTeam.startingXI.length - 1)];
      const minute = rng.nextInt(10, 85);
      const xgValue = Number((0.15 + rng.nextFloat() * 0.55).toFixed(2));
      events.push({
        minute,
        kind: 'GOAL',
        teamId: input.awayTeam.teamId,
        primaryPlayerId: scorer?.player.id,
        xgValue,
        description: `GOAL! ${scorer?.player.shortName ?? 'Away player'} scores for ${input.awayTeam.clubName}!`,
      });
    }

    events.push({
      minute: 90,
      kind: 'FULL_TIME',
      teamId: input.homeTeam.teamId,
      description: `Full time: ${input.homeTeam.clubName} ${homeScore} – ${awayScore} ${input.awayTeam.clubName}.`,
    });

    // Generate player performances
    const playerPerformances: PlayerMatchPerformance[] = [
      ...input.homeTeam.startingXI.map((p) => this.generatePlayerPerformance(p, input.homeTeam.teamId, rng)),
      ...input.awayTeam.startingXI.map((p) => this.generatePlayerPerformance(p, input.awayTeam.teamId, rng)),
    ];

    // Generate match statistics
    const homeStats = this.generateTeamStats(homeScore, rng);
    const awayStats = this.generateTeamStats(awayScore, rng);
    homeStats.possession = rng.nextInt(44, 58);
    awayStats.possession = 100 - homeStats.possession;

    return {
      matchId: input.matchId,
      seed: input.seed,
      homeScore,
      awayScore,
      homeScoreHT,
      awayScoreHT,
      events,
      statistics: { homeStats, awayStats },
      playerPerformances,
      simulationEngineVersion: `${this.engineId}@${this.version}`,
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculates an aggregate team power rating from the starting XI's
   * attribute profiles, condition values, and home advantage.
   *
   * Uses the new nested attribute structure:
   *   - Technical: passing, finishing, dribbling
   *   - Physical: pace, stamina
   *   - Mental: positioning, vision, composure
   */
  private calculateTeamPower(
    team: MatchSimulationInput['homeTeam'],
    isHome: boolean,
    rng: SeededRNG
  ): number {
    if (team.startingXI.length === 0) return 50;

    const squadPower = team.startingXI.reduce((acc, p) => {
      const attrs = p.player.attributes;
      if (!attrs) return acc + 50;

      const { technical, physical, mental } = attrs;
      const technicalRating = (technical.passing + technical.finishing + technical.dribbling + technical.firstTouch) / 4;
      const physicalRating = (physical.pace + physical.stamina + physical.strength) / 3;
      const mentalRating = (mental.positioning + mental.vision + mental.composure + mental.decisions) / 4;

      const baseRating = (technicalRating * 0.4 + physicalRating * 0.3 + mentalRating * 0.3);
      const conditionMultiplier = (p.fitness / 100) * 0.6 + (p.morale / 100) * 0.2 + (p.sharpness / 100) * 0.2;

      return acc + baseRating * conditionMultiplier;
    }, 0) / team.startingXI.length;

    let power = squadPower;
    if (isHome) power *= 1.05; // Home advantage
    power += rng.nextInt(-3, 3); // Controlled randomness
    return Math.max(10, Math.min(99, power));
  }

  private generateGoals(attackPower: number, defensePower: number, rng: SeededRNG): number {
    const ratio = attackPower / Math.max(defensePower, 1);
    const expectedGoals = Math.max(0.15, Math.min(3.5, ratio * 1.2));
    let goals = 0;
    for (let i = 0; i < 5; i++) {
      if (rng.nextBoolean(expectedGoals / 5)) goals++;
    }
    return goals;
  }

  private generateTeamStats(goals: number, rng: SeededRNG): TeamMatchStats {
    return {
      goals,
      shots: goals + rng.nextInt(3, 9),
      shotsOnTarget: goals + rng.nextInt(1, 4),
      xg: Number((goals * 0.7 + rng.nextFloat() * 1.2).toFixed(2)),
      possession: 50, // overwritten by caller
      passes: rng.nextInt(300, 560),
      passAccuracy: Number((72 + rng.nextFloat() * 16).toFixed(1)),
      tackles: rng.nextInt(10, 22),
      fouls: rng.nextInt(6, 15),
      yellowCards: rng.nextInt(0, 3),
      redCards: 0,
      corners: rng.nextInt(2, 8),
      interceptions: rng.nextInt(5, 14),
    };
  }

  private generatePlayerPerformance(
    p: PlayerSimulationState,
    teamId: string,
    rng: SeededRNG
  ): PlayerMatchPerformance {
    return {
      matchId: '', // Filled in by the service layer after DB write
      playerId: p.player.id,
      teamId,
      isStarting: p.isStarting,
      minutesPlayed: 90,
      rating: Number((5.5 + rng.nextFloat() * 4.0).toFixed(1)),
      goals: 0,
      assists: 0,
      shots: rng.nextInt(0, 4),
      shotsOnTarget: rng.nextInt(0, 2),
      keyPasses: rng.nextInt(0, 4),
      passesCompleted: rng.nextInt(15, 65),
      passAccuracy: Number((68 + rng.nextFloat() * 22).toFixed(1)),
      tackles: rng.nextInt(0, 5),
      interceptions: rng.nextInt(0, 4),
      aerialDuelsWon: rng.nextInt(0, 4),
      yellowCards: 0,
      redCards: 0,
      xg: Number((rng.nextFloat() * 0.4).toFixed(2)),
      xgAssisted: Number((rng.nextFloat() * 0.3).toFixed(2)),
      wasSubstitutedOff: false,
    };
  }
}
