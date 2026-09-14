// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT DOMAIN TYPES
// Pure TypeScript. Zero framework or database dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

/**
 * A legal agreement between a player and a club.
 *
 * IMPORTANT: Contracts are HISTORICAL RECORDS, not a single row per player.
 * A player's contract history looks like:
 *
 *   Arsenal contract:     2025-07-01 → 2028-06-30   (status: EXPIRED)
 *   Real Madrid contract: 2028-07-01 → 2032-06-30   (status: EXPIRED)
 *   Barcelona contract:   2032-07-01 → 2035-06-30   (status: ACTIVE)
 *
 * Therefore: NO @unique on playerId in the database.
 *
 * Current contract = WHERE playerId = X AND status = 'ACTIVE' LIMIT 1
 * Contract history = WHERE playerId = X ORDER BY startDate DESC
 */
export interface DomainContract {
  id: string;
  playerId: string;
  clubId: string;
  /** The date this contract became legally effective */
  startDate: Date;
  /** The date this contract expires */
  expiresAt: Date;
  weeklyWage: number;
  releaseClause?: number;
  signingBonus?: number;
  /**
   * Player's agreed squad role — affects morale and transfer requests.
   * e.g. "Key Player", "Important Player", "Rotation", "Squad Player"
   */
  squadRole?: string;
  status: ContractStatus;
}
