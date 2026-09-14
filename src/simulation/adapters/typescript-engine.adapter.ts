import { 
  IMatchEngine, 
  MatchSimulationInput, 
  MatchSimulationResult, 
  PlayerPerformanceRating 
} from '../models/simulation-contracts';
import { SeededRNG } from '../engine/rng';
import { DomainMatchEvent } from '../../domain/types/match';

/**
 * Pure TypeScript implementation of the IMatchEngine interface.
 * Uses SeededRNG for 100% deterministic, explainable, and reproducible simulation results.
 */
export class TypeScriptMatchEngine implements IMatchEngine {
  public readonly engineId = 'ts-statistical-v1';
  public readonly version = '1.0.0-foundation';

  public simulateMatch(input: MatchSimulationInput): MatchSimulationResult {
    const rng = new SeededRNG(input.seed);

    // Baseline squad strength evaluation
    const homePower = this.calculateTeamPower(input.homeTeam, true, rng);
    const awayPower = this.calculateTeamPower(input.awayTeam, false, rng);

    // Goal generation using Poisson-like seedable probabilities
    const homeScore = this.generateGoals(homePower, awayPower, rng);
    const awayScore = this.generateGoals(awayPower, homePower, rng);

    // Events timeline generation
    const events: DomainMatchEvent[] = [
      {
        minute: 0,
        kind: 'KICK_OFF',
        teamId: input.homeTeam.teamId,
        description: `Match started between ${input.homeTeam.clubName} and ${input.awayTeam.clubName}.`,
      },
    ];

    if (homeScore > 0) {
      const homeScorer = input.homeTeam.startingXI[rng.nextInt(0, input.homeTeam.startingXI.length - 1)];
      events.push({
        minute: rng.nextInt(10, 85),
        kind: 'GOAL',
        teamId: input.homeTeam.teamId,
        primaryPlayerId: homeScorer?.player.id,
        description: `GOAL! ${homeScorer?.player.lastName || 'Home player'} scores for ${input.homeTeam.clubName}!`,
      });
    }

    if (awayScore > 0) {
      const awayScorer = input.awayTeam.startingXI[rng.nextInt(0, input.awayTeam.startingXI.length - 1)];
      events.push({
        minute: rng.nextInt(10, 85),
        kind: 'GOAL',
        teamId: input.awayTeam.teamId,
        primaryPlayerId: awayScorer?.player.id,
        description: `GOAL! ${awayScorer?.player.lastName || 'Away player'} scores for ${input.awayTeam.clubName}!`,
      });
    }

    events.push({
      minute: 90,
      kind: 'FULL_TIME',
      teamId: input.homeTeam.teamId,
      description: `Full time: ${input.homeTeam.clubName} ${homeScore} - ${awayScore} ${input.awayTeam.clubName}.`,
    });

    // Generate player ratings
    const playerPerformanceRatings: PlayerPerformanceRating[] = [
      ...input.homeTeam.startingXI.map((p) => this.generatePlayerRating(p, input.homeTeam.teamId, rng)),
      ...input.awayTeam.startingXI.map((p) => this.generatePlayerRating(p, input.awayTeam.teamId, rng)),
    ];

    return {
      matchId: input.matchId,
      seed: input.seed,
      homeScore,
      awayScore,
      events,
      statistics: {
        homeStats: {
          goals: homeScore,
          shots: homeScore + rng.nextInt(3, 8),
          shotsOnTarget: homeScore + rng.nextInt(1, 4),
          possessionPercentage: rng.nextInt(45, 58),
          passesCompleted: rng.nextInt(320, 550),
          passAccuracyPercentage: rng.nextInt(78, 88),
          fouls: rng.nextInt(6, 14),
          yellowCards: rng.nextInt(0, 3),
          redCards: 0,
          corners: rng.nextInt(2, 7),
        },
        awayStats: {
          goals: awayScore,
          shots: awayScore + rng.nextInt(2, 7),
          shotsOnTarget: awayScore + rng.nextInt(1, 3),
          possessionPercentage: 100 - rng.nextInt(45, 58),
          passesCompleted: rng.nextInt(280, 490),
          passAccuracyPercentage: rng.nextInt(75, 86),
          fouls: rng.nextInt(7, 16),
          yellowCards: rng.nextInt(0, 3),
          redCards: 0,
          corners: rng.nextInt(1, 6),
        },
      },
      playerPerformanceRatings,
      simulationEngineVersion: `${this.engineId}@${this.version}`,
      executedAt: new Date().toISOString(),
    };
  }

  private calculateTeamPower(team: MatchSimulationInput['homeTeam'], isHome: boolean, rng: SeededRNG): number {
    let power = team.startingXI.reduce((acc, p) => {
      const attrs = p.player.attributes;
      const avgAttr = (attrs.pace + attrs.passing + attrs.shooting + attrs.tackling + attrs.positioning) / 5;
      return acc + avgAttr * (p.fitness / 100) * (p.morale / 100);
    }, 0) / (team.startingXI.length || 1);

    if (isHome) power *= 1.05; // Home advantage factor
    power += rng.nextInt(-3, 3); // Controlled randomness
    return Math.max(10, power);
  }

  private generateGoals(attackPower: number, defensePower: number, rng: SeededRNG): number {
    const ratio = attackPower / (defensePower || 1);
    const expectedGoals = Math.max(0.2, Math.min(3.5, ratio * 1.3));
    
    let goals = 0;
    for (let i = 0; i < 4; i++) {
      if (rng.nextBoolean(expectedGoals / 4)) {
        goals++;
      }
    }
    return goals;
  }

  private generatePlayerRating(p: MatchSimulationInput['homeTeam']['startingXI'][0], teamId: string, rng: SeededRNG): PlayerPerformanceRating {
    return {
      playerId: p.player.id,
      teamId,
      rating: Number((6.0 + rng.nextFloat() * 3.5).toFixed(1)),
      minutesPlayed: 90,
      goals: 0,
      assists: 0,
      shots: rng.nextInt(0, 4),
      tackles: rng.nextInt(0, 5),
      passesCompleted: rng.nextInt(15, 60),
      yellowCards: 0,
      redCards: 0,
    };
  }
}
