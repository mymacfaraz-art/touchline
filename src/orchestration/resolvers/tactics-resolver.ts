// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: TACTICS RESOLVER
// Resolves persisted saved tactics for a club/manager or builds default tactics.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { DomainTactics, TacticDocument, fromTacticDocument, isTacticDocument } from '../../domain/types/tactics';

export class TacticsResolver {
  /**
   * Resolves default or active tactics for a club.
   * If a saved tactic exists in the DB, it is parsed and returned.
   * Otherwise, returns a standard balanced default tactic (4-3-3).
   */
  public async resolveClubTactics(clubId: string): Promise<DomainTactics> {
    const saved = await prisma.savedTactic.findFirst({
      where: {
        clubId,
        isDefault: true,
      },
    });

    if (saved && isTacticDocument(saved.tacticDocument)) {
      return fromTacticDocument(saved.tacticDocument as TacticDocument);
    }

    // Try finding any saved tactic for the club
    const anySaved = await prisma.savedTactic.findFirst({
      where: { clubId },
      orderBy: { updatedAt: 'desc' },
    });

    if (anySaved && isTacticDocument(anySaved.tacticDocument)) {
      return fromTacticDocument(anySaved.tacticDocument as TacticDocument);
    }

    return this.createDefaultTactics();
  }

  /**
   * Creates a default balanced 4-3-3 tactical setup.
   */
  public createDefaultTactics(): DomainTactics {
    return {
      formation: '4-3-3',
      mentality: 'BALANCED',
      pressingIntensity: 'MEDIUM',
      defensiveLine: 'STANDARD',
      passingStyle: 'BALANCED',
      tempo: 'NORMAL',
      width: 'NORMAL',
      buildUpStyle: 'SHORT_PASSING',
      transitionStyle: 'MIXED',
      outOfPossession: 'BLOCK',
      playerRoles: [
        { playerId: 'p-gk', position: 'GK', role: 'GOALKEEPER', instructions: [] },
        { playerId: 'p-lb', position: 'LB', role: 'FULL_BACK', instructions: [] },
        { playerId: 'p-cb1', position: 'CB', role: 'CENTRAL_DEFENDER', instructions: [] },
        { playerId: 'p-cb2', position: 'CB', role: 'CENTRAL_DEFENDER', instructions: [] },
        { playerId: 'p-rb', position: 'RB', role: 'FULL_BACK', instructions: [] },
        { playerId: 'p-cdm', position: 'CDM', role: 'DEFENSIVE_MIDFIELDER', instructions: [] },
        { playerId: 'p-cm1', position: 'CM', role: 'CENTRAL_MIDFIELDER', instructions: [] },
        { playerId: 'p-cm2', position: 'CM', role: 'BOX_TO_BOX', instructions: [] },
        { playerId: 'p-lw', position: 'LW', role: 'WINGER', instructions: [] },
        { playerId: 'p-st', position: 'ST', role: 'CENTRE_FORWARD', instructions: [] },
        { playerId: 'p-rw', position: 'RW', role: 'WINGER', instructions: [] },
      ],
    };
  }
}
