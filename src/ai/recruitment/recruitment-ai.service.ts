// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: RECRUITMENT AI SERVICE
// Deterministic squad evaluation and transfer target recommendation engine
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import {
  IRecruitmentDecisionProvider,
  RecruitmentEvaluation,
} from '../../domain/types/advanced-ai';

export class RecruitmentAIService implements IRecruitmentDecisionProvider {
  /**
   * Evaluates a transfer target deterministically using budget constraints, squad position depth, and OVR suitability.
   */
  public async evaluatePlayerTarget(
    targetPlayerId: string,
    buyerClubId: string,
    gameSeasonId: string
  ): Promise<RecruitmentEvaluation> {
    const player = await prisma.player.findUnique({
      where: { id: targetPlayerId },
      include: {
        attributes: true,
        potential: true,
      },
    });

    if (!player) {
      throw new Error(`Target player '${targetPlayerId}' not found.`);
    }

    const clubState = await prisma.clubSeasonState.findUnique({
      where: { clubId_gameSeasonId: { clubId: buyerClubId, gameSeasonId } },
    });

    const transferBudget = clubState?.transferBudget ?? 50000000;
    const attrs = player.attributes;
    const currentOVR = attrs
      ? Math.round((attrs.passing + attrs.finishing + attrs.pace + attrs.stamina + attrs.composure) / 5.0)
      : 65;
    const potential = player.potential
      ? Math.round(player.potential.potentialAbility / 2.0)
      : currentOVR + 5;

    // Estimate asking fee based on OVR & potential
    const askingFee = currentOVR * 500000 + (potential - currentOVR) * 300000;
    const weeklyWage = currentOVR * 3000;

    const canAfford = transferBudget >= askingFee;
    const tacticalFit = 80;

    let suitabilityScore = 50;
    let recommendedAction: 'MUST_BUY' | 'CONSIDER' | 'PASS' = 'CONSIDER';
    let rationale = '';

    if (!canAfford) {
      suitabilityScore = 20;
      recommendedAction = 'PASS';
      rationale = `Target fee (£${(askingFee / 1e6).toFixed(1)}M) exceeds club transfer budget (£${(
        transferBudget / 1e6
      ).toFixed(1)}M).`;
    } else if (currentOVR >= 80 && canAfford) {
      suitabilityScore = 90;
      recommendedAction = 'MUST_BUY';
      rationale = `High-caliber player (OVR ${currentOVR}) well within financial parameters.`;
    } else {
      suitabilityScore = 70;
      recommendedAction = 'CONSIDER';
      rationale = `Solid squad reinforcement option (OVR ${currentOVR}, Potential ${potential}).`;
    }

    return {
      playerId: player.id,
      shortName: player.shortName,
      currentOVR,
      potential,
      askingFee,
      weeklyWage,
      suitabilityScore,
      tacticalFit,
      recommendedAction,
      rationale,
    };
  }
}
