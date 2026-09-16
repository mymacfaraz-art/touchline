// ─────────────────────────────────────────────────────────────────────────────
// ROLE WEIGHT TABLE
//
// Defines how each PlayerRole weights the 36 player attributes when computing
// the role-specific attribute composites (technicalScore, physicalScore,
// mentalScore, gkScore).
//
// DESIGN RULES:
//   1. Each role has a weight vector across the 36 attributes.
//   2. Weights are non-negative. Zero means "not relevant for this role."
//   3. Weights do NOT need to sum to any specific total — they are normalised
//      at runtime by the PlayerProfileBuilder.
//   4. Adding a new role = adding one entry to ROLE_WEIGHT_TABLE.
//      No engine logic changes required.
//   5. Phase 3 implements 5 core roles. Others receive FALLBACK_WEIGHTS
//      until explicitly defined.
// ─────────────────────────────────────────────────────────────────────────────

import { PlayerRole } from '../../../domain/types/tactics';

/**
 * Attribute weight vector for a PlayerRole.
 * Fields mirror the 36 attributes in PlayerAttributes exactly.
 * Absent fields default to 0.
 */
export interface RoleWeightVector {
  // Technical
  passing?: number;
  longPassing?: number;
  crossing?: number;
  finishing?: number;
  firstTouch?: number;
  dribbling?: number;
  ballControl?: number;
  heading?: number;
  tackling?: number;
  marking?: number;
  freeKick?: number;
  penaltyTaking?: number;
  // Physical
  acceleration?: number;
  pace?: number;
  stamina?: number;
  strength?: number;
  agility?: number;
  balance?: number;
  jumping?: number;
  naturalFitness?: number;
  // Mental
  composure?: number;
  decisions?: number;
  vision?: number;
  anticipation?: number;
  positioning?: number;
  concentration?: number;
  workRate?: number;
  aggression?: number;
  leadership?: number;
  teamwork?: number;
  adaptability?: number;
  // Goalkeeping
  gkReflexes?: number;
  gkHandling?: number;
  gkPositioning?: number;
  gkKicking?: number;
  gkCommunication?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE WEIGHT TABLE — 5 Core Roles (Phase 3)
//
// Remaining roles receive FALLBACK_WEIGHTS until they are explicitly defined.
// This guarantees no runtime crash for any valid PlayerRole value.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fallback weights for roles not yet explicitly defined.
 * Balanced across all attribute groups with equal emphasis.
 * This produces a reasonable "generic player" score — not optimal
 * for any specific role but not broken either.
 */
export const FALLBACK_ROLE_WEIGHTS: RoleWeightVector = {
  passing: 1.0,
  firstTouch: 1.0,
  dribbling: 1.0,
  finishing: 1.0,
  heading: 1.0,
  tackling: 1.0,
  marking: 1.0,
  pace: 1.0,
  stamina: 1.0,
  strength: 1.0,
  composure: 1.0,
  decisions: 1.0,
  vision: 1.0,
  anticipation: 1.0,
  positioning: 1.0,
  concentration: 1.0,
  workRate: 1.0,
};

/**
 * Role weight vectors keyed by PlayerRole.
 * Source of truth for how each role values the 36 attributes.
 *
 * Interpretation:
 *   weight=3.0 → this attribute dominates the role score
 *   weight=2.0 → very important
 *   weight=1.0 → relevant but not defining
 *   weight=0.3 → minor relevance (player shouldn't be punished for low value)
 *   weight=0.1 → barely relevant
 *   absent/0   → not used in this role's score
 */
export const ROLE_WEIGHT_TABLE: Partial<Record<PlayerRole, RoleWeightVector>> = {

  // ── GOALKEEPER ────────────────────────────────────────────────────────────
  GOALKEEPER: {
    gkReflexes: 3.0,
    gkHandling: 3.0,
    gkPositioning: 2.5,
    gkKicking: 1.5,
    gkCommunication: 1.5,
    composure: 2.0,
    decisions: 1.5,
    concentration: 2.0,
    anticipation: 1.5,
    leadership: 1.0,
    agility: 1.5,
    strength: 0.5,
    // Outfield attributes largely irrelevant
    passing: 0.5,   // GK distribution
    longPassing: 0.5,
  },

  SWEEPER_KEEPER: {
    gkReflexes: 2.5,
    gkHandling: 2.5,
    gkPositioning: 2.0,
    gkKicking: 2.0,
    gkCommunication: 1.5,
    composure: 2.5,
    decisions: 2.0,
    concentration: 1.5,
    anticipation: 2.0,
    pace: 1.5,
    acceleration: 1.5,
    agility: 1.5,
    passing: 1.0,
    longPassing: 1.0,
    vision: 1.0,
    leadership: 1.0,
  },

  // ── CENTRAL DEFENDER ─────────────────────────────────────────────────────
  CENTRAL_DEFENDER: {
    tackling: 2.5,
    marking: 2.5,
    heading: 2.0,
    positioning: 2.0,
    concentration: 2.0,
    strength: 1.5,
    anticipation: 2.0,
    jumping: 1.5,
    pace: 1.0,
    acceleration: 0.8,
    composure: 1.0,
    decisions: 1.0,
    teamwork: 1.0,
    aggression: 1.0,
    leadership: 0.8,
    // Minimal relevance
    passing: 0.5,
    firstTouch: 0.5,
    finishing: 0.2,
    dribbling: 0.2,
    freeKick: 0.2,
  },

  BALL_PLAYING_DEFENDER: {
    passing: 2.5,
    longPassing: 2.0,
    vision: 2.0,
    composure: 2.5,
    decisions: 2.0,
    firstTouch: 1.5,
    tackling: 1.5,
    marking: 1.5,
    positioning: 1.5,
    anticipation: 1.5,
    concentration: 1.5,
    heading: 1.0,
    strength: 1.0,
    pace: 0.8,
    teamwork: 1.0,
    leadership: 0.8,
    ballControl: 1.0,
    // Forward attributes minimal
    finishing: 0.3,
    dribbling: 0.5,
  },

  // ── CENTRAL MIDFIELDER ────────────────────────────────────────────────────
  CENTRAL_MIDFIELDER: {
    passing: 2.5,
    firstTouch: 2.0,
    vision: 2.0,
    decisions: 2.0,
    composure: 1.5,
    ballControl: 2.0,
    stamina: 1.5,
    workRate: 1.5,
    teamwork: 1.5,
    anticipation: 1.5,
    positioning: 1.5,
    tackling: 1.0,
    longPassing: 1.5,
    dribbling: 1.0,
    concentration: 1.0,
    pace: 0.8,
    strength: 0.8,
    finishing: 0.8,
    // Minimal
    marking: 0.5,
    heading: 0.4,
    crossing: 0.4,
  },

  BOX_TO_BOX: {
    stamina: 2.5,
    workRate: 2.5,
    passing: 2.0,
    firstTouch: 1.5,
    decisions: 1.5,
    vision: 1.5,
    finishing: 1.5,
    tackling: 1.5,
    composure: 1.5,
    pace: 1.5,
    strength: 1.5,
    concentration: 1.0,
    teamwork: 1.5,
    positioning: 1.5,
    anticipation: 1.5,
    dribbling: 1.0,
    longPassing: 1.0,
    aggression: 1.0,
  },

  DEFENSIVE_MIDFIELDER: {
    tackling: 2.5,
    marking: 2.0,
    positioning: 2.5,
    concentration: 2.0,
    anticipation: 2.0,
    teamwork: 2.0,
    workRate: 2.0,
    stamina: 1.5,
    composure: 1.5,
    decisions: 1.5,
    passing: 1.5,
    strength: 1.5,
    vision: 1.0,
    firstTouch: 1.0,
    aggression: 1.0,
    // Minimal forward attributes
    finishing: 0.3,
    dribbling: 0.5,
    crossing: 0.3,
  },

  DEEP_LYING_PLAYMAKER: {
    passing: 3.0,
    longPassing: 2.5,
    vision: 2.5,
    decisions: 2.5,
    composure: 2.5,
    firstTouch: 2.0,
    ballControl: 2.0,
    concentration: 1.5,
    positioning: 2.0,
    anticipation: 1.5,
    teamwork: 1.5,
    // Less physical dependency
    stamina: 1.0,
    strength: 0.8,
    pace: 0.5,
    tackling: 0.8,
    marking: 0.5,
  },

  ADVANCED_PLAYMAKER: {
    vision: 3.0,
    passing: 2.5,
    firstTouch: 2.5,
    decisions: 2.5,
    composure: 2.0,
    ballControl: 2.0,
    dribbling: 1.5,
    finishing: 1.5,
    anticipation: 2.0,
    positioning: 2.0,
    freeKick: 1.0,
    agility: 1.5,
    pace: 1.0,
    teamwork: 1.0,
    // Less physical/defensive
    tackling: 0.3,
    marking: 0.3,
    strength: 0.5,
    stamina: 1.0,
  },

  ATTACKING_MIDFIELDER: {
    finishing: 2.0,
    vision: 2.5,
    passing: 2.0,
    firstTouch: 2.0,
    decisions: 2.0,
    composure: 2.0,
    dribbling: 1.5,
    ballControl: 2.0,
    anticipation: 2.0,
    positioning: 2.0,
    agility: 1.5,
    pace: 1.0,
    teamwork: 1.0,
    workRate: 1.0,
    freeKick: 1.0,
    penaltyTaking: 0.8,
    // Minimal defensive
    tackling: 0.3,
    marking: 0.2,
  },

  // ── WINGER ────────────────────────────────────────────────────────────────
  WINGER: {
    pace: 2.5,
    acceleration: 2.5,
    dribbling: 2.5,
    crossing: 2.0,
    firstTouch: 2.0,
    agility: 2.0,
    vision: 1.5,
    decisions: 1.5,
    composure: 1.5,
    stamina: 1.5,
    workRate: 1.5,
    ballControl: 2.0,
    finishing: 1.5,
    teamwork: 1.0,
    anticipation: 1.0,
    // Minimal defensive
    tackling: 0.3,
    marking: 0.2,
    heading: 0.3,
  },

  INVERTED_WINGER: {
    pace: 2.5,
    acceleration: 2.0,
    dribbling: 2.5,
    finishing: 2.0,
    firstTouch: 2.0,
    agility: 2.5,
    vision: 1.5,
    decisions: 1.5,
    composure: 2.0,
    ballControl: 2.0,
    freeKick: 1.0,
    stamina: 1.5,
    workRate: 1.5,
    // Less crossing — cuts inside to shoot
    crossing: 0.5,
    tackling: 0.3,
    marking: 0.2,
  },

  WIDE_MIDFIELDER: {
    stamina: 2.5,
    workRate: 2.5,
    crossing: 1.5,
    passing: 1.5,
    firstTouch: 1.5,
    pace: 1.5,
    acceleration: 1.5,
    vision: 1.5,
    decisions: 1.5,
    tackling: 1.0,
    teamwork: 1.5,
    concentration: 1.0,
    dribbling: 1.0,
    finishing: 0.8,
    composure: 1.0,
    positioning: 1.0,
    // Balanced — must defend and create
  },

  // ── FULLBACK ──────────────────────────────────────────────────────────────
  FULL_BACK: {
    pace: 2.0,
    acceleration: 1.5,
    tackling: 2.0,
    marking: 1.5,
    positioning: 2.0,
    concentration: 1.5,
    stamina: 2.0,
    workRate: 2.0,
    crossing: 1.5,
    firstTouch: 1.0,
    decisions: 1.5,
    anticipation: 1.5,
    teamwork: 1.5,
    composure: 1.0,
    strength: 1.0,
    // Minimal forward
    finishing: 0.3,
    dribbling: 0.5,
    vision: 0.8,
  },

  WING_BACK: {
    pace: 2.5,
    acceleration: 2.0,
    stamina: 2.5,
    workRate: 2.0,
    crossing: 2.0,
    tackling: 1.5,
    marking: 1.0,
    positioning: 1.5,
    firstTouch: 1.5,
    decisions: 1.5,
    teamwork: 1.5,
    composure: 1.0,
    dribbling: 1.5,
    vision: 1.0,
    concentration: 1.0,
    // Some offensive weight
    finishing: 0.5,
  },

  // ── FORWARDS ─────────────────────────────────────────────────────────────
  CENTRE_FORWARD: {
    finishing: 2.5,
    heading: 2.0,
    strength: 2.0,
    composure: 2.0,
    positioning: 2.5,
    anticipation: 2.0,
    decisions: 1.5,
    firstTouch: 1.5,
    pace: 1.5,
    acceleration: 1.5,
    dribbling: 1.0,
    ballControl: 1.5,
    teamwork: 1.0,
    workRate: 1.0,
    jumping: 1.5,
    penaltyTaking: 1.5,
    // Minimal defensive
    tackling: 0.2,
    marking: 0.2,
    vision: 1.0,
    passing: 0.8,
  },

  POACHER: {
    finishing: 3.0,
    positioning: 3.0,
    anticipation: 2.5,
    acceleration: 2.0,
    composure: 2.0,
    decisions: 1.5,
    pace: 1.5,
    firstTouch: 1.5,
    penaltyTaking: 2.0,
    // Very minimal — pure finisher
    passing: 0.3,
    marking: 0.1,
    tackling: 0.1,
    workRate: 0.5,
    heading: 0.8,
  },

  PRESSING_FORWARD: {
    workRate: 3.0,
    pace: 2.5,
    acceleration: 2.5,
    stamina: 2.5,
    aggression: 1.5,
    teamwork: 1.5,
    finishing: 1.5,
    decisions: 1.5,
    anticipation: 1.5,
    positioning: 1.5,
    composure: 1.5,
    naturalFitness: 1.5,
    // Minimal
    heading: 0.8,
    dribbling: 0.8,
    crossing: 0.3,
    tackling: 0.3,
  },

  FALSE_NINE: {
    vision: 2.5,
    passing: 2.5,
    firstTouch: 2.5,
    decisions: 2.5,
    composure: 2.5,
    dribbling: 2.0,
    ballControl: 2.0,
    finishing: 2.0,
    anticipation: 2.0,
    agility: 1.5,
    positioning: 1.5,
    pace: 1.0,
    teamwork: 1.5,
    // Not a traditional striker
    heading: 0.5,
    strength: 0.8,
    jumping: 0.5,
    tackling: 0.3,
  },

  // ── WIDE CENTRE BACK ──────────────────────────────────────────────────────
  WIDE_CENTRE_BACK: {
    tackling: 2.0,
    marking: 2.0,
    heading: 2.0,
    positioning: 2.0,
    concentration: 1.5,
    strength: 1.5,
    anticipation: 1.5,
    pace: 1.5,
    acceleration: 1.5,
    stamina: 1.5,
    workRate: 1.5,
    passing: 1.0,
    firstTouch: 0.8,
    crossing: 0.8,
    composure: 1.0,
    decisions: 1.0,
    teamwork: 1.0,
  },

  // ── INVERTED WING BACK ────────────────────────────────────────────────────
  INVERTED_WING_BACK: {
    pace: 2.5,
    acceleration: 2.0,
    stamina: 2.0,
    workRate: 2.0,
    dribbling: 2.0,
    passing: 2.0,
    vision: 1.5,
    firstTouch: 1.5,
    decisions: 1.5,
    tackling: 1.5,
    marking: 1.0,
    composure: 1.5,
    ballControl: 1.5,
    finishing: 1.0,
    teamwork: 1.0,
    positioning: 1.0,
    agility: 1.5,
  },
};

/**
 * Returns the weight vector for a given role.
 * Falls back to FALLBACK_ROLE_WEIGHTS for roles not yet defined.
 */
export function getRoleWeights(role: PlayerRole): RoleWeightVector {
  return ROLE_WEIGHT_TABLE[role] ?? FALLBACK_ROLE_WEIGHTS;
}
