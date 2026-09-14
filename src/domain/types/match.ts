// ─────────────────────────────────────────────────────────────────────────────
// MATCH DOMAIN TYPES
// Pure TypeScript. Zero framework or database dependencies.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Match Status ─────────────────────────────────────────────────────────────

export type MatchStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'POSTPONED'
  | 'ABANDONED';

// ─────────────────────────────────────────────────────────────────────────────
// MATCH EVENT BOUNDARY
//
// The simulation engine processes hundreds of micro-events internally.
// Only a meaningful subset is persisted to the database.
//
// INTERNAL (never persisted):
//   Passes, carries, dribbles, duels, presses, positional movements, etc.
//
// PERSISTED (stored in MatchEvent table):
//   Goals, cards, substitutions, injuries, VAR, key milestones.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Granular simulation-internal event types.
 * These are produced by the engine during a match tick and discarded
 * after the simulation completes. They are used to calculate statistics
 * and determine outcomes — they are NEVER persisted to the database.
 */
export type SimulationMicroEventType =
  | 'PASS_ATTEMPT'
  | 'PASS_COMPLETED'
  | 'PASS_INTERCEPTED'
  | 'DRIBBLE_ATTEMPT'
  | 'DRIBBLE_SUCCESS'
  | 'DRIBBLE_TACKLED'
  | 'PRESS_APPLIED'
  | 'PRESS_RESISTED'
  | 'DUEL_INITIATED'
  | 'DUEL_WON'
  | 'DUEL_LOST'
  | 'SHOT_ATTEMPT'
  | 'SAVE_MADE'
  | 'CHANCE_CREATED'
  | 'CHANCE_MISSED'
  | 'POSITIONAL_MOVE';

/** Internal simulation event — only exists in simulation engine memory */
export interface SimulationMicroEvent {
  tick: number;
  type: SimulationMicroEventType;
  initiatorId: string;
  targetId?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  xgContribution?: number;
}

/**
 * The subset of event types that are persisted to the MatchEvent table.
 * These are extracted from the micro-event stream after simulation completes.
 */
export type MatchEventKind =
  | 'KICK_OFF'
  | 'HALF_TIME'
  | 'FULL_TIME'
  | 'AET'               // After extra time
  | 'PENALTIES'         // Penalty shootout result
  | 'GOAL'
  | 'OWN_GOAL'
  | 'PENALTY_GOAL'
  | 'PENALTY_MISS'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SECOND_YELLOW'
  | 'SUBSTITUTION'
  | 'INJURY'
  | 'VAR_REVIEW';

/** A match event that is persisted to the database */
export interface DomainMatchEvent {
  minute: number;
  addedTime?: number;
  kind: MatchEventKind;
  teamId: string;
  primaryPlayerId?: string;    // Scorer, carded player, player subbed on, etc.
  secondaryPlayerId?: string;  // Assist provider, player subbed off, etc.
  /** Expected goal value for shot/goal events */
  xgValue?: number;
  /**
   * Structured event-specific extras, e.g.:
   * { penaltyTechnique: 'PLACED', substitutionReason: 'TACTICAL' }
   */
  metadata?: Record<string, unknown>;
  description: string;
}

/**
 * Extracts persistable match events from the internal simulation micro-event stream.
 * This is the formal boundary between simulation-internal and persisted events.
 * Implemented by the simulation engine adapter.
 */
export type ExtractPersistableEvents = (
  microEvents: SimulationMicroEvent[]
) => DomainMatchEvent[];

// ─────────────────────────────────────────────────────────────────────────────
// MATCH STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

/** Typed match statistics for one team. Replaces the previous raw statsJson. */
export interface TeamMatchStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  /** xG = expected goals. Summed from shot event xgValues. */
  xg: number;
  possession: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  interceptions: number;
}

export interface DomainMatchStatistics {
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER MATCH PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

/** Per-player performance data for a single match. Persisted to DB. */
export interface PlayerMatchPerformance {
  matchId: string;
  playerId: string;
  teamId: string;
  isStarting: boolean;
  minutesPlayed: number;
  /** Match rating 1.0–10.0 */
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  keyPasses: number;
  passesCompleted: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
  aerialDuelsWon: number;
  yellowCards: number;
  redCards: number;
  xg: number;
  xgAssisted: number;
  wasSubstitutedOff: boolean;
  substitutedOffMinute?: number;
}
