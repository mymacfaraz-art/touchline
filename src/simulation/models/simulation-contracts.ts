import { DomainPlayer } from '../../domain/types/player';
import { DomainTactics } from '../../domain/types/tactics';
import { DomainMatchEvent, DomainMatchStatistics } from '../../domain/types/match';

export interface PlayerSimulationState {
  player: DomainPlayer;
  assignedPositionRole: string;
  isStarting: boolean;
  fitness: number;      // 0-100
  morale: number;       // 0-100
  form: number;         // 0-100
  sharpness: number;    // 0-100
  fatigue: number;      // 0-100
  isInjured: boolean;
  isSuspended: boolean;
}

export interface TeamSimulationState {
  teamId: string;
  clubName: string;
  isHomeTeam: boolean;
  tactics: DomainTactics;
  startingXI: PlayerSimulationState[];
  bench: PlayerSimulationState[];
  managerTacticalDecisions?: {
    substitutionCount: number;
    mentalityAdjustments: string[];
  };
  recentFormRating: number; // 0-100
}

export interface MatchSimulationInput {
  matchId: string;
  seed: number | string;
  competitionId: string;
  seasonId: string;
  homeTeam: TeamSimulationState;
  awayTeam: TeamSimulationState;
  neutralVenue?: boolean;
}

export interface PlayerPerformanceRating {
  playerId: string;
  teamId: string;
  rating: number; // 1.0 to 10.0
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  tackles: number;
  passesCompleted: number;
  yellowCards: number;
  redCards: number;
}

export interface MatchSimulationResult {
  matchId: string;
  seed: number | string;
  homeScore: number;
  awayScore: number;
  events: DomainMatchEvent[];
  statistics: DomainMatchStatistics;
  playerPerformanceRatings: PlayerPerformanceRating[];
  simulationEngineVersion: string;
  executedAt: string;
}

/**
 * Authoritative interface for all football match simulation engines.
 * Pure dependency boundary: zero React / Next.js / DB dependencies.
 */
export interface IMatchEngine {
  readonly engineId: string;
  readonly version: string;

  /**
   * Simulates a football match deterministically based on input parameters and random seed.
   */
  simulateMatch(input: MatchSimulationInput): Promise<MatchSimulationResult> | MatchSimulationResult;
}
