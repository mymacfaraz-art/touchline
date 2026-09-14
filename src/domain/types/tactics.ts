// ─────────────────────────────────────────────────────────────────────────────
// TACTICS DOMAIN TYPES
// Pure TypeScript. Zero framework or database dependencies.
// All tactical concepts use strict union types — no raw strings in the domain.
// ─────────────────────────────────────────────────────────────────────────────

import { PlayerPosition } from './player';

// ─── Tactical Shape & Style Enums ────────────────────────────────────────────

export type FormationShape =
  | '4-3-3'
  | '4-2-3-1'
  | '4-4-2'
  | '4-4-1-1'
  | '4-1-4-1'
  | '3-5-2'
  | '3-4-3'
  | '5-3-2'
  | '5-4-1';

export type TeamMentality =
  | 'VERY_DEFENSIVE'
  | 'DEFENSIVE'
  | 'BALANCED'
  | 'ATTACKING'
  | 'VERY_ATTACKING';

export type PressingIntensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type DefensiveLineHeight = 'DEEP' | 'STANDARD' | 'HIGH' | 'VERY_HIGH';
export type PassingStyle = 'DIRECT' | 'BALANCED' | 'SHORT_POSSESSION';
export type Tempo = 'SLOW' | 'NORMAL' | 'HIGH';
export type Width = 'NARROW' | 'NORMAL' | 'WIDE';
export type BuildUpStyle = 'GOALKEEPER' | 'SHORT_PASSING' | 'LONG_BALL';
export type TransitionStyle = 'COUNTER' | 'CONTROL' | 'MIXED';
export type OutOfPossessionStyle = 'PRESS' | 'BLOCK' | 'CONTAIN';

// ─── Player Roles ─────────────────────────────────────────────────────────────

export type PlayerRole =
  // Goalkeeper
  | 'GOALKEEPER'
  | 'SWEEPER_KEEPER'
  // Defenders
  | 'CENTRAL_DEFENDER'
  | 'BALL_PLAYING_DEFENDER'
  | 'WIDE_CENTRE_BACK'
  | 'FULL_BACK'
  | 'WING_BACK'
  | 'INVERTED_WING_BACK'
  // Midfielders
  | 'DEFENSIVE_MIDFIELDER'
  | 'CENTRAL_MIDFIELDER'
  | 'BOX_TO_BOX'
  | 'DEEP_LYING_PLAYMAKER'
  | 'ADVANCED_PLAYMAKER'
  | 'ATTACKING_MIDFIELDER'
  | 'WIDE_MIDFIELDER'
  | 'WINGER'
  | 'INVERTED_WINGER'
  // Forwards
  | 'PRESSING_FORWARD'
  | 'CENTRE_FORWARD'
  | 'FALSE_NINE'
  | 'POACHER';

// ─── Player Instructions ──────────────────────────────────────────────────────

export type PlayerInstruction =
  | 'STAY_WIDE'
  | 'CUT_INSIDE'
  | 'OVERLAP'
  | 'UNDERLAP'
  | 'HOLD_POSITION'
  | 'ROAM_FROM_POSITION'
  | 'PRESS_MORE'
  | 'PRESS_LESS'
  | 'TAKE_MORE_RISKS'
  | 'PLAY_SAFE'
  | 'SHOOT_MORE'
  | 'SHOOT_LESS'
  | 'CROSS_MORE'
  | 'DRIBBLE_MORE'
  | 'MARK_TIGHTER';

// ─── Player Role Assignment ───────────────────────────────────────────────────

export interface PlayerRoleAssignment {
  playerId: string;
  /** Position on the pitch for this tactic */
  position: PlayerPosition;
  /** The role the player is asked to fulfil in this position */
  role: PlayerRole;
  /** Individual player instructions layered on top of the role */
  instructions: PlayerInstruction[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TACTIC DOCUMENT — The Versioned Contract
//
// All tactic JSON blobs (saved tactics & match snapshots) MUST conform to
// this interface. The _schemaVersion field allows future format migrations
// to identify and convert historical records without breaking them.
// ─────────────────────────────────────────────────────────────────────────────

export interface TacticDocument {
  /** Increment when the TacticDocument format changes */
  _schemaVersion: '1';
  formation: FormationShape;
  mentality: TeamMentality;
  pressingIntensity: PressingIntensity;
  defensiveLine: DefensiveLineHeight;
  passingStyle: PassingStyle;
  tempo: Tempo;
  width: Width;
  buildUpStyle: BuildUpStyle;
  transitionStyle: TransitionStyle;
  outOfPossession: OutOfPossessionStyle;
  playerRoles: PlayerRoleAssignment[];
}

/** Type guard — verifies a JSON value is a valid TacticDocument */
export function isTacticDocument(value: unknown): value is TacticDocument {
  if (typeof value !== 'object' || value === null) return false;
  const doc = value as Record<string, unknown>;
  return (
    typeof doc['_schemaVersion'] === 'string' &&
    typeof doc['formation'] === 'string' &&
    typeof doc['mentality'] === 'string' &&
    Array.isArray(doc['playerRoles'])
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN TACTICS (in-memory / simulation input)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tactical setup as used by the simulation engine and application services.
 * Equivalent to TacticDocument minus the _schemaVersion housekeeping field.
 */
export interface DomainTactics {
  formation: FormationShape;
  mentality: TeamMentality;
  pressingIntensity: PressingIntensity;
  defensiveLine: DefensiveLineHeight;
  passingStyle: PassingStyle;
  tempo: Tempo;
  width: Width;
  buildUpStyle: BuildUpStyle;
  transitionStyle: TransitionStyle;
  outOfPossession: OutOfPossessionStyle;
  playerRoles: PlayerRoleAssignment[];
}

/** Converts a DomainTactics to a versioned TacticDocument for persistence */
export function toTacticDocument(tactics: DomainTactics): TacticDocument {
  return { _schemaVersion: '1', ...tactics };
}

/** Converts a stored TacticDocument back to a DomainTactics */
export function fromTacticDocument(doc: TacticDocument): DomainTactics {
  const { _schemaVersion: _, ...tactics } = doc;
  return tactics;
}
