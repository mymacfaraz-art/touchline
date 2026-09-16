// ─────────────────────────────────────────────────────────────────────────────
// POSITION SUITABILITY
//
// Computes how suitable a player is for the position they have been assigned
// in the formation, and whether adjacent positions share relevant skills.
//
// SUITABILITY TIERS:
//   Primary   → 1.00  (player's natural position)
//   Secondary → 0.75  (listed secondary position — practiced but not natural)
//   Adjacent  → 0.55  (neighbouring position — shares key attributes)
//   Remote    → 0.40  (incompatible position — GK at ST, CB at ST, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { PlayerPosition } from '../../../domain/types/player';

// ─────────────────────────────────────────────────────────────────────────────
// ADJACENCY MAP
//
// Defines which positions are "adjacent" to each other.
// Adjacency is symmetric but defined one-directionally here for clarity.
// ─────────────────────────────────────────────────────────────────────────────

const ADJACENCY_MAP: Partial<Record<PlayerPosition, PlayerPosition[]>> = {
  // Goalkeeper
  GK: [],   // No adjacent outfield positions

  // Centre Backs
  CB: ['LB', 'RB', 'CDM'],

  // Fullbacks
  LB: ['CB', 'LWB', 'LM'],
  RB: ['CB', 'RWB', 'RM'],

  // Wing Backs
  LWB: ['LB', 'LM', 'LW'],
  RWB: ['RB', 'RM', 'RW'],

  // Defensive Midfielder
  CDM: ['CB', 'CM'],

  // Central Midfielders
  CM: ['CDM', 'CAM', 'LM', 'RM'],

  // Attacking Midfielder
  CAM: ['CM', 'CF'],

  // Wide Midfielders
  LM: ['LB', 'LWB', 'CM', 'LW'],
  RM: ['RB', 'RWB', 'CM', 'RW'],

  // Wingers
  LW: ['LM', 'LWB', 'CF'],
  RW: ['RM', 'RWB', 'CF'],

  // Centre Forward / Second Striker
  CF: ['CAM', 'ST', 'LW', 'RW'],

  // Striker
  ST: ['CF', 'LW', 'RW'],
};

// Build a symmetric adjacency set for efficient lookup
const ADJACENCY_SET = new Map<PlayerPosition, Set<PlayerPosition>>();

for (const [pos, neighbours] of Object.entries(ADJACENCY_MAP) as Array<
  [PlayerPosition, PlayerPosition[]]
>) {
  if (!ADJACENCY_SET.has(pos)) {
    ADJACENCY_SET.set(pos, new Set());
  }
  for (const neighbour of neighbours) {
    ADJACENCY_SET.get(pos)!.add(neighbour);
    if (!ADJACENCY_SET.has(neighbour)) {
      ADJACENCY_SET.set(neighbour, new Set());
    }
    ADJACENCY_SET.get(neighbour)!.add(pos);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITABILITY TIERS
// ─────────────────────────────────────────────────────────────────────────────

export const POSITION_SUITABILITY = {
  PRIMARY: 1.00,
  SECONDARY: 0.75,
  ADJACENT: 0.55,
  REMOTE: 0.40,
} as const;

export type PositionSuitabilityTier = keyof typeof POSITION_SUITABILITY;

// ─────────────────────────────────────────────────────────────────────────────
// SUITABILITY COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the position suitability score (0–1) for a player assigned to a
 * specific position, given their primary and secondary positions.
 *
 * @param assignedPosition  The position in the formation the player fills
 * @param primaryPosition   The player's natural position
 * @param secondaryPositions  Additional practiced positions (can be empty)
 */
export function computePositionSuitability(
  assignedPosition: PlayerPosition,
  primaryPosition: PlayerPosition,
  secondaryPositions: PlayerPosition[]
): number {
  // PRIMARY: the player's natural position
  if (assignedPosition === primaryPosition) {
    return POSITION_SUITABILITY.PRIMARY;
  }

  // SECONDARY: a listed alternative position
  if (secondaryPositions.includes(assignedPosition)) {
    return POSITION_SUITABILITY.SECONDARY;
  }

  // ADJACENT: neighbouring position in the tactical structure
  const adjacentToAssigned = ADJACENCY_SET.get(assignedPosition);
  if (adjacentToAssigned?.has(primaryPosition)) {
    return POSITION_SUITABILITY.ADJACENT;
  }

  // REMOTE: incompatible position
  return POSITION_SUITABILITY.REMOTE;
}

/**
 * Returns the named tier for the suitability score.
 * Useful for diagnostics and simulation logging.
 */
export function getPositionSuitabilityTier(
  score: number
): PositionSuitabilityTier {
  if (score >= POSITION_SUITABILITY.PRIMARY) return 'PRIMARY';
  if (score >= POSITION_SUITABILITY.SECONDARY) return 'SECONDARY';
  if (score >= POSITION_SUITABILITY.ADJACENT) return 'ADJACENT';
  return 'REMOTE';
}

/**
 * Returns true if the position is within the GK group.
 * Used to determine whether gkScore is relevant for a player.
 */
export function isGoalkeeperPosition(position: PlayerPosition): boolean {
  return position === 'GK';
}

/**
 * Returns true if an assigned position is broadly compatible with the role.
 * Used to flag severe position/role mismatches (e.g. GK assigned ST role).
 */
export function isRolePlausibleForPosition(
  assignedPosition: PlayerPosition,
  primaryPosition: PlayerPosition
): boolean {
  // GK-specific rule: a GK should never play outfield and vice versa
  if (
    (assignedPosition === 'GK') !== (primaryPosition === 'GK')
  ) {
    return false;
  }
  return true;
}
