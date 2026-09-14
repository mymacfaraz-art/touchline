// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT DOMAIN TYPES
// Pure TypeScript. Zero framework or database dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface DomainContract {
  id: string;
  playerId: string;
  clubId: string;
  weeklyWage: number;
  expiresAt: Date;
  releaseClause?: number;
  signingBonus?: number;
  /**
   * Player's agreed squad role — affects morale and transfer requests.
   * e.g. "Key Player", "Important Player", "Rotation", "Squad Player"
   */
  squadRole?: string;
  status: ContractStatus;
}
