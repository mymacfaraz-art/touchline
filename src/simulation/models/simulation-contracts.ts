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
import { DomainTactics, PlayerRole } from '../../domain/types/tactics';
import {
  DomainMatchEvent,
  DomainMatchStatistics,
  PlayerMatchPerformance,
} from '../../domain/types/match';

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
  /** The tactical role assigned in this position */
  assignedRole: PlayerRole;
  isStarting: boolean;

  // Live condition values at kick-off (sourced from PlayerCondition)
  fitness: number;      // 0–100
  morale: number;       // 0–100
  form: number;         // 0–100
  sharpness: number;    // 0–100
  fatigue: number;      // 0–100
  confidence: number;   // 0–100
  tacticalFamiliarity: number; // 0–100
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
// ABILITY CALCULATION CONTRACTS
//
// TWO DISTINCT CONCEPTS:
//
// 1. Current Ability  — what the player CAN do based on their trained attributes
//                       and position weighting. Independent of today's condition.
//                       Use this for: development tracking, scouting, transfer
//                       valuations, career summaries.
//
// 2. Effective Match Ability — what the player WILL contribute in THIS match,
//                              accounting for the full match context: condition,
//                              fatigue, morale, sharpness, role suitability,
//                              tactical familiarity, opponent context, etc.
//                              Use this for: in-match power calculation,
//                              match ratings, event probability weighting.
//
// Neither is persisted in the database.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A player's underlying football ability derived purely from trained attributes
 * and how those attributes map to their primary position.
 *
 * Does NOT change because the player is tired, unhappy, or lacking sharpness.
 * Those factors affect EffectiveMatchAbilityProfile instead.
 *
 * Internal scale: 1–200. Useful for comparison and development tracking.
 */
export interface CurrentAbilityProfile {
  /** Aggregate current ability on a 1–200 internal scale */
  currentAbility: number;
  /** Attribute contribution breakdown by group (for development diagnostics) */
  breakdown: {
    technical: number;
    physical: number;
    mental: number;
    goalkeeping: number;
  };
}

/**
 * Computes a player's current ability from their trained attributes and
 * primary position.
 *
 * INPUTS:  attributes (trained) + position (for weighting)
 * OUTPUT:  aggregate ability + breakdown
 * CONTEXT: position-specific attribute weighting (e.g. GK weights gkReflexes;
 *          ST weights finishing/pace; CB weights marking/heading/tackling)
 *
 * NOT affected by: fitness, fatigue, morale, confidence, or match context.
 * NOT persisted anywhere.
 */
export type ComputeCurrentAbility = (
  attributes: PlayerAttributes,
  position: DomainPlayer['primaryPosition']
) => CurrentAbilityProfile;

/**
 * The effective ability a player brings to THIS specific match, accounting for
 * the full match context on top of their current ability.
 *
 * Factors that can reduce effective ability below current ability:
 *   - Low fitness / high fatigue (physical performance drops)
 *   - Low morale / confidence (decision quality and composure drop)
 *   - Low sharpness (timing and match-reading deteriorate)
 *   - Low tacticalFamiliarity (off-ball positioning, pressing shape suffer)
 *   - Role mismatch (player assigned an unsuitable role for their position)
 *
 * Factors that can raise effective ability above baseline:
 *   - High morale / peak confidence
 *   - Strong home advantage modifier
 *   - Excellent tactical familiarity with the system
 */
export interface EffectiveMatchAbilityProfile {
  /** Effective match contribution on a 0–200 scale */
  effectiveAbility: number;
  /** Condition modifier applied on top of current ability (0.0–1.2 range) */
  conditionMultiplier: number;
  /** Breakdown of condition contributions for debugging */
  conditionBreakdown: {
    fitnessContribution: number;
    moraleContribution: number;
    sharpnessContribution: number;
    confidenceContribution: number;
    tacticalFamiliarityContribution: number;
    roleSuitabilityContribution: number;
  };
}

/**
 * Context inputs that modify a player's effective match ability.
 */
export interface MatchAbilityContext {
  /** The current condition values for this match */
  condition: Pick<
    PlayerCondition,
    'fitness' | 'fatigue' | 'morale' | 'confidence' | 'sharpness' | 'tacticalFamiliarity'
  >;
  /** The role the player has been assigned in this match */
  assignedRole: PlayerRole;
  /** The player's primary position (used for role suitability check) */
  position: DomainPlayer['primaryPosition'];
  /** Home advantage applies to all players on the home side */
  homeAdvantageBonus?: number;
}

/**
 * Computes a player's effective match ability from their current ability
 * profile plus the full match context.
 *
 * INPUTS:  currentAbility + condition + role + match context modifiers
 * OUTPUT:  effective ability (0–200) + full condition breakdown
 *
 * This is the value used directly by the simulation engine when computing
 * team power, match event probabilities, and player ratings.
 *
 * NOT persisted anywhere.
 */
export type ComputeEffectiveMatchAbility = (
  currentAbility: CurrentAbilityProfile,
  context: MatchAbilityContext
) => EffectiveMatchAbilityProfile;
