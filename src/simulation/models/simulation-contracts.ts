// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION ENGINE CONTRACTS
//
// These interfaces form the authoritative boundary between the simulation
// engine and the rest of the application.
//
// DEPENDENCY DIRECTION:
//   UI Layer → Application Service → IMatchEngine → Engine Adapter
//
// The simulation engine has ZERO dependencies on:
//   - React / Next.js / any UI framework
//   - Prisma / any database client
//   - Application services
// ─────────────────────────────────────────────────────────────────────────────

import { DomainPlayer, PlayerAttributes, PlayerCondition } from '../../domain/types/player';
import { DomainTactics } from '../../domain/types/tactics';
import { DomainMatchEvent, DomainMatchStatistics, PlayerMatchPerformance } from '../../domain/types/match';

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION INPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A player's complete state as presented to the simulation engine.
 * Combines identity, attributes, and current condition — all the information
 * the engine needs to evaluate a player's contribution to a match.
 */
export interface PlayerSimulationState {
  player: DomainPlayer;
  /** The position this player has been assigned in the formation */
  assignedPosition: string;
  isStarting: boolean;

  // Live condition values at kick-off (sourced from PlayerCondition)
  fitness: number;      // 0–100
  morale: number;       // 0–100
  form: number;         // 0–100
  sharpness: number;    // 0–100
  fatigue: number;      // 0–100
  isInjured: boolean;
  isSuspended: boolean;
}

/**
 * A team's full simulation state at kick-off.
 */
export interface TeamSimulationState {
  teamId: string;
  clubName: string;
  isHomeTeam: boolean;
  tactics: DomainTactics;
  startingXI: PlayerSimulationState[];
  bench: PlayerSimulationState[];
  /** 0–100 aggregate form of the team over recent matches */
  recentFormRating: number;
  managerTacticalDecisions?: {
    substitutionCount: number;
    mentalityAdjustments: string[];
  };
}

/**
 * Complete input to the match simulation engine.
 *
 * Key guarantee: given identical MatchSimulationInput AND identical seed,
 * the engine MUST produce an identical MatchSimulationResult every time.
 */
export interface MatchSimulationInput {
  matchId: string;
  seed: number | string;
  competitionSeasonId: string;
  competitionPhaseId: string;
  homeTeam: TeamSimulationState;
  awayTeam: TeamSimulationState;
  neutralVenue?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The authoritative, immutable result of a completed match simulation.
 *
 * This is the ONLY permitted source of truth for:
 *   - Final score
 *   - Match events (persisted subset)
 *   - Match statistics
 *   - Player performance ratings
 *
 * LLMs and AI narrative systems receive this struct as READ-ONLY input.
 * They may generate text from it — they may NEVER modify it.
 */
export interface MatchSimulationResult {
  matchId: string;
  seed: number | string;
  homeScore: number;
  awayScore: number;
  homeScoreHT: number;
  awayScoreHT: number;
  /** Persisted match events (extracted from simulation micro-event stream) */
  events: DomainMatchEvent[];
  statistics: DomainMatchStatistics;
  playerPerformances: PlayerMatchPerformance[];
  /** e.g. "ts-statistical-v1@1.0.0" */
  simulationEngineVersion: string;
  executedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMATCH ENGINE — The Core Simulation Boundary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authoritative interface for all football match simulation engines.
 *
 * Implementations:
 *   - TypeScriptMatchEngine  (default, pure TS statistical engine)
 *   - PythonMLMatchEngine    (future extension point for ML service)
 *
 * The application never knows which implementation is active.
 */
export interface IMatchEngine {
  readonly engineId: string;
  readonly version: string;

  simulateMatch(
    input: MatchSimulationInput
  ): Promise<MatchSimulationResult> | MatchSimulationResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENT ABILITY CALCULATION CONTRACT
//
// currentAbility is NEVER stored in the database.
// It is computed on demand from attributes + position weighting.
// ─────────────────────────────────────────────────────────────────────────────

export interface EffectiveAbilityProfile {
  /** Internal 1–200 scale current ability for this position */
  currentAbility: number;
  /** Contribution breakdown by category (useful for debugging) */
  breakdown: {
    technical: number;
    physical: number;
    mental: number;
    goalkeeping: number;
  };
}

/**
 * Contract for computing a player's current ability from their attributes.
 * Implemented by the simulation engine — not persisted anywhere.
 */
export type ComputeCurrentAbility = (
  attributes: PlayerAttributes,
  position: DomainPlayer['primaryPosition'],
  condition: Pick<PlayerCondition, 'fitness' | 'morale' | 'sharpness'>
) => EffectiveAbilityProfile;
