// ─────────────────────────────────────────────────────────────────────────────
// MATCH STATE
//
// The complete in-memory state of a match simulation.
// NEVER persisted. Lives only in simulation engine memory during a single run.
//
// Mutability policy:
//   Mutable fields are updated by the engine during simulation.
//   Structural fields (profiles, config) are set once at context-build time.
// ─────────────────────────────────────────────────────────────────────────────

import { DomainMatchEvent, SimulationMicroEvent, SimulationMicroEventType } from '../../domain/types/match';
import { PlayerPosition } from '../../domain/types/player';
import { PlayerRole, PlayerInstruction, DomainTactics, TeamMentality, PressingIntensity } from '../../domain/types/tactics';
import { PlayerAttributes } from '../../domain/types/player';

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER SIMULATION PROFILE
//
// Built once per player at context-build time. Used throughout the simulation.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerSimulationProfile {
  // Identity
  playerId: string;
  teamId: string;
  assignedPosition: PlayerPosition;
  assignedRole: PlayerRole;
  instructions: PlayerInstruction[];
  isStarting: boolean;

  // Raw attributes (read-only during simulation)
  rawAttributes: PlayerAttributes;

  // Computed once at build time — never recalculated during simulation
  /** 1–200 scale: the player's intrinsic trained ability for this role */
  currentAbility: number;
  /** 0–1.0: how well this player fits the assigned position */
  positionSuitability: number;
  /** 0–1.0: how well this player fits the assigned role */
  roleSuitability: number;

  /** Role-weighted composite technical score (0–99) */
  technicalScore: number;
  /** Role-weighted composite physical score (0–99) */
  physicalScore: number;
  /** Role-weighted composite mental score (0–99) */
  mentalScore: number;
  /** GK-specific composite (0–99) — null for outfield players */
  gkScore: number | null;

  // Condition multipliers (all computed once; range ~0.55–1.20)
  fitnessModifier: number;
  moraleModifier: number;
  confidenceModifier: number;
  sharpnessModifier: number;
  tacticalFamiliarityModifier: number;

  /**
   * Combined effective match ability (0–200):
   * currentAbility × (condition modifiers product) × roleSuitability
   * Used by probability evaluators throughout the simulation.
   */
  effectiveMatchAbility: number;

  // ── Mutable during simulation ─────────────────────────────────────────────
  /** Accumulated fatigue (0–100). Increases each slot via FatigueUpdater. */
  currentFatigue: number;
  /** Minutes accumulated on pitch */
  minutesPlayed: number;
  isOnPitch: boolean;
  isInjured: boolean;
  isSuspended: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM SIMULATION PROFILE
//
// Aggregated team-level dimensions computed from all player profiles + tactics.
// Computed once at context-build time.
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamSimulationProfile {
  teamId: string;
  isHomeTeam: boolean;
  tactics: DomainTactics;

  // Attacking dimensions (0–100)
  attackingStrength: number;
  chanceCreationAbility: number;
  finishingQuality: number;
  crossingThreat: number;

  // Defensive dimensions (0–100)
  defensiveStrength: number;
  defensiveOrganisation: number;
  pressResistance: number;
  aerialStrength: number;

  // Transition dimensions (0–100)
  counterAttackThreat: number;
  counterAttackVulnerability: number;

  // Possession dimensions (0–100 / adjusted base)
  possessionBase: number;         // 50 ± adjustments
  buildUpQuality: number;
  progressionQuality: number;

  // Set piece (0–100)
  setPieceThreat: number;
  setPieceDefense: number;

  // Meta modifiers
  homeAdvantageModifier: number;  // 1.0 (away) to ~1.06 (home, configured)
  effectiveCohesion: number;      // teamCohesion × mean(tacticalFamiliarity)

  // Pressing
  pressureOutput: number;         // 0–100
  widthFactor: number;            // −1.0 (narrow) to +1.0 (wide)
}

// ─────────────────────────────────────────────────────────────────────────────
// TACTICAL MATCHUP PROFILE
//
// Computed interaction of both teams' tactical signatures.
// ─────────────────────────────────────────────────────────────────────────────

export interface TacticalMatchupProfile {
  /** Positive = home dominates, Negative = away dominates */
  pressureBalance: number;        // −1.0 to +1.0
  /** How much open space both defenses expose */
  spaceBalance: number;           // 0–1.0
  /** Combined intensity level (affects fatigue rate) */
  intensityLevel: number;         // 0–1.0
  homePressureOutput: number;     // 0–100
  awayPressureOutput: number;     // 0–100
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION CONTEXT
//
// All pre-computed inputs assembled before the phase loop begins.
// Passed as Readonly<> throughout the simulation.
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationContext {
  matchId: string;
  seed: number | string;
  neutralVenue: boolean;

  // Profiles (built once, read-only during simulation)
  homePlayers: PlayerSimulationProfile[];
  awayPlayers: PlayerSimulationProfile[];
  homeTeam: TeamSimulationProfile;
  awayTeam: TeamSimulationProfile;
  matchup: TacticalMatchupProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH PHASE
// ─────────────────────────────────────────────────────────────────────────────

export type MatchPhase =
  | 'PRE'
  | 'FIRST_HALF'
  | 'HALF_TIME'
  | 'SECOND_HALF'
  | 'STOPPAGE_FIRST'
  | 'STOPPAGE_SECOND'
  | 'FULL_TIME';

// ─────────────────────────────────────────────────────────────────────────────
// CHANCE TIER
// ─────────────────────────────────────────────────────────────────────────────

export type ChanceTier =
  | 'CLEAR_CUT'     // 1v1, tap-in, penalty         xG: 0.45–0.75
  | 'GOOD'          // Penalty area, clear sight      xG: 0.20–0.44
  | 'HALF_CHANCE'   // Under pressure, angle          xG: 0.08–0.19
  | 'LONG_RANGE'    // Outside box                    xG: 0.03–0.07
  | 'SPECULATIVE';  // Far/traffic                    xG: 0.01–0.02

// ─────────────────────────────────────────────────────────────────────────────
// SHOT ATTEMPT
// ─────────────────────────────────────────────────────────────────────────────

export interface ShotAttempt {
  tier: ChanceTier;
  xgValue: number;
  isHeader: boolean;
  isPenalty: boolean;
  isOneOnOne: boolean;
  /** 0–1.0: how much pressure the shooter was under */
  defensivePressure: number;
  /** Shooter's profile */
  shooterProfile: PlayerSimulationProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIST TYPE (extended micro-event context)
// ─────────────────────────────────────────────────────────────────────────────

export type MicroAssistType = 'throughBall' | 'cross' | 'dribble' | 'layOff' | 'setpiece';

// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED MICRO-EVENT TYPES
//
// Phase 3 extends the SimulationMicroEventType from match.ts.
// New types are defined here and re-exported as a union with the existing types.
// ─────────────────────────────────────────────────────────────────────────────

export type Phase3MicroEventType =
  | 'PRESS_SUCCEEDED'
  | 'SHOT_ON_TARGET'
  | 'SHOT_OFF_TARGET'
  | 'SHOT_BLOCKED'
  | 'GOAL_SCORED'
  | 'OWN_GOAL'
  | 'FOUL_COMMITTED'
  | 'CARD_ISSUED'
  | 'INJURY_OCCURRED'
  | 'SUBSTITUTION_MADE'
  | 'CORNER_WON'
  | 'POSSESSION_TRANSITION'
  | 'FATIGUE_SIGNIFICANT'
  | 'PHASE_START'
  | 'PHASE_END';

export type ExtendedMicroEventType = SimulationMicroEventType | Phase3MicroEventType;

/** Phase 3 extended micro-event with richer metadata */
export interface ExtendedMicroEvent {
  slot: number;
  minute: number;
  type: ExtendedMicroEventType;
  teamId: string;
  initiatorId?: string;
  targetId?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'NEUTRAL';
  xgContribution?: number;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM IN-MATCH STATE
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamInMatchState {
  teamId: string;
  /** playerIds of on-pitch players (11 or fewer if injury/red card) */
  playersOnPitch: string[];
  substitutionsUsed: number;   // 0–5

  // Disciplinary
  yellowCards: number;         // accumulator for deciding red cards
  redCards: number;

  // Condition aggregate
  currentFatigueMean: number;  // mean fatigue across on-pitch players

  // Effective tactical state (can differ from TacticDocument as match adapts)
  effectiveMentality: TeamMentality;
  effectivePressingIntensity: PressingIntensity;

  // Accumulated match statistics (updated from micro-events each slot)
  shots: number;
  shotsOnTarget: number;
  goals: number;
  corners: number;
  fouls: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  xg: number;
  possession: number;         // accumulated mean %
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH SIMULATION STATE
//
// Complete mutable in-memory state of the simulation.
// Passed by reference through the phase/slot loop.
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchSimulationState {
  // ── Time ──────────────────────────────────────────────────────────────────
  currentMinute: number;
  phase: MatchPhase;
  slotIndex: number;           // 0-based index within current phase

  // ── Score ─────────────────────────────────────────────────────────────────
  homeScore: number;
  awayScore: number;
  homeScoreHT: number;
  awayScoreHT: number;

  // ── Possession ────────────────────────────────────────────────────────────
  homePossessionAccumulated: number;    // sum of slot possession values
  homePossessionSlotCount: number;      // number of slots contributed

  // ── Momentum: −1.0 (away) to +1.0 (home) ─────────────────────────────────
  momentum: number;

  // ── Match meta ────────────────────────────────────────────────────────────
  matchIntensity: number;       // 0–1.0: affects fatigue rate

  // ── Teams ─────────────────────────────────────────────────────────────────
  home: TeamInMatchState;
  away: TeamInMatchState;

  // ── Event streams ─────────────────────────────────────────────────────────
  /** Internal events produced each slot — never persisted */
  microEvents: ExtendedMicroEvent[];
  /** Persisted subset — accumulated throughout the simulation */
  significantEvents: DomainMatchEvent[];

  // ── Player profiles (mutable: fatigue, minutesPlayed, isOnPitch) ──────────
  /** All home player profiles. Fatigue and minutes are mutated each slot. */
  homePlayers: PlayerSimulationProfile[];
  /** All away player profiles. Fatigue and minutes are mutated each slot. */
  awayPlayers: PlayerSimulationProfile[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the initial MatchSimulationState at kick-off.
 * All scores, stats, and event lists start at zero/empty.
 */
export function createInitialMatchState(
  context: SimulationContext
): MatchSimulationState {
  const home = context.homeTeam;
  const away = context.awayTeam;

  const createTeamState = (
    teamId: string,
    players: PlayerSimulationProfile[],
    tactics: DomainTactics
  ): TeamInMatchState => ({
    teamId,
    playersOnPitch: players
      .filter((p) => p.isStarting && !p.isInjured && !p.isSuspended)
      .map((p) => p.playerId),
    substitutionsUsed: 0,
    yellowCards: 0,
    redCards: 0,
    currentFatigueMean: 0,
    effectiveMentality: tactics.mentality,
    effectivePressingIntensity: tactics.pressingIntensity,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    corners: 0,
    fouls: 0,
    passes: 0,
    passesCompleted: 0,
    tackles: 0,
    interceptions: 0,
    xg: 0,
    possession: 50,
  });

  return {
    currentMinute: 0,
    phase: 'PRE',
    slotIndex: 0,
    homeScore: 0,
    awayScore: 0,
    homeScoreHT: 0,
    awayScoreHT: 0,
    homePossessionAccumulated: 0,
    homePossessionSlotCount: 0,
    momentum: 0,
    matchIntensity: context.matchup.intensityLevel,
    home: createTeamState(home.teamId, context.homePlayers, home.tactics),
    away: createTeamState(away.teamId, context.awayPlayers, away.tactics),
    microEvents: [],
    significantEvents: [],
    homePlayers: context.homePlayers,
    awayPlayers: context.awayPlayers,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the current goal difference from home perspective.
 * Positive = home winning, Negative = away winning, 0 = level.
 */
export function goalDifference(state: MatchSimulationState): number {
  return state.homeScore - state.awayScore;
}

/**
 * Returns the current mean possession for home team across all slots so far.
 */
export function homePossessionMean(state: MatchSimulationState): number {
  if (state.homePossessionSlotCount === 0) return 50;
  return state.homePossessionAccumulated / state.homePossessionSlotCount;
}

/**
 * Returns on-pitch player profiles for the given team.
 */
export function getOnPitchPlayers(
  state: MatchSimulationState,
  teamId: string
): PlayerSimulationProfile[] {
  const players =
    state.home.teamId === teamId ? state.homePlayers : state.awayPlayers;
  return players.filter((p) => p.isOnPitch);
}
