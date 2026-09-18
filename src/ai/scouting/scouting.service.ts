// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: SCOUTING SERVICE
// Player evaluation with explicit confidence levels (KNOWN, ESTIMATED, UNKNOWN)
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { ScoutingReportResult } from '../../domain/types/advanced-ai';
import { ConfidenceLevel } from '@prisma/client';

export class ScoutingService {
  /**
   * Generates a scouting report for a player.
   * Delineates KNOWN attributes (from club player/scouting depth) vs ESTIMATED vs UNKNOWN.
   * Persists report to ScoutingReport table.
   */
  public async generateReport(params: {
    careerId: string;
    playerId: string;
    targetClubId?: string;
  }): Promise<ScoutingReportResult> {
    const { careerId, playerId, targetClubId } = params;

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        attributes: true,
        potential: true,
        registrations: { where: { isActive: true }, include: { club: true } },
      },
    });

    if (!player) {
      throw new Error(`Player with ID '${playerId}' not found.`);
    }

    const currentClub = player.registrations[0]?.club;
    const isOwnPlayer = targetClubId && currentClub?.id === targetClubId;

    // Confidence tier
    const confidence: ConfidenceLevel = isOwnPlayer
      ? ConfidenceLevel.KNOWN
      : player.attributes
      ? ConfidenceLevel.ESTIMATED
      : ConfidenceLevel.UNKNOWN;

    const attrs = player.attributes;
    const actualOVR = attrs
      ? Math.round((attrs.passing + attrs.finishing + attrs.pace + attrs.stamina + attrs.composure) / 5.0)
      : 65;

    const estimatedOVR =
      confidence === ConfidenceLevel.KNOWN
        ? actualOVR
        : Math.round(actualOVR + (Math.random() > 0.5 ? 1 : -1) * 2);

    const estimatedPotential = player.potential
      ? Math.round(player.potential.potentialAbility / 2.0)
      : undefined;

    const knownAttributes: Record<string, number | 'ESTIMATED' | 'UNKNOWN'> = {};
    if (attrs) {
      knownAttributes.passing = confidence === ConfidenceLevel.KNOWN ? attrs.passing : 'ESTIMATED';
      knownAttributes.finishing = confidence === ConfidenceLevel.KNOWN ? attrs.finishing : 'ESTIMATED';
      knownAttributes.pace = confidence === ConfidenceLevel.KNOWN ? attrs.pace : 'ESTIMATED';
      knownAttributes.stamina = confidence === ConfidenceLevel.KNOWN ? attrs.stamina : 'ESTIMATED';
    }

    const summary = `${player.shortName} (${player.primaryPosition}, Age ${
      new Date().getFullYear() - player.dateOfBirth.getFullYear()
    }) - ${confidence} profile. Estimated OVR ${estimatedOVR}.`;

    const reportResult: ScoutingReportResult = {
      playerId: player.id,
      shortName: player.shortName,
      position: player.primaryPosition,
      age: new Date().getFullYear() - player.dateOfBirth.getFullYear(),
      currentClubName: currentClub?.name,
      confidence,
      estimatedOverall: estimatedOVR,
      estimatedPotential,
      tacticalFitScore: 82.5,
      summary,
      knownAttributes,
      dataFreshness: new Date(),
    };

    try {
      await prisma.scoutingReport.create({
        data: {
          careerId,
          playerId,
          confidence,
          overallEstimate: estimatedOVR,
          potentialEstimate: estimatedPotential,
          tacticalFitRating: 82.5,
          summary,
          knownAttributesJson: knownAttributes as any,
          dataFreshnessDate: new Date(),
        },
      });
    } catch (err) {
      console.warn('[ScoutingService] ScoutingReport save warning:', err);
    }

    return reportResult;
  }
}
