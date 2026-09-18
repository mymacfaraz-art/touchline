// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: ML FEATURE EXPORTER
// Extracts and standardizes multi-dimensional feature matrices for Phase 6.
// Preserves source lineage and marks unrecorded metrics truthfully.
// ─────────────────────────────────────────────────────────────────────────────

import { CanonicalPlayer, CanonicalPlayerStats } from '../types/data-foundation.types';
import { MLFeatureVector, UNAVAILABLE_FROM_CURRENT_SOURCES } from './feature-definitions';
import { computeAge } from '../../domain/types/player';

export class MLFeatureExporter {
  /**
   * Transforms a player and seasonal statistical record into a normalized MLFeatureVector.
   */
  public static extractFeatureVector(
    player: CanonicalPlayer,
    stats: CanonicalPlayerStats,
    referenceDate = new Date(stats.seasonYearEnd, 5, 30),
    sourceCode = 'OPEN_DATA_SOURCE',
    datasetVersion = 'v1.0'
  ): MLFeatureVector {
    const age = computeAge(player.dateOfBirth, referenceDate);
    const p90Factor = stats.minutesPlayed > 0 ? 90 / stats.minutesPlayed : 0;

    const positionCategory = this.classifyPositionCategory(player.primaryPosition);

    const goalsPer90 = Number((stats.goals * p90Factor).toFixed(3));
    const shotsPer90 = Number((stats.shots * p90Factor).toFixed(3));
    const shotAccuracy = stats.shots > 0 ? Number((stats.shotsOnTarget / stats.shots).toFixed(3)) : 0;
    const conversionRate = stats.shots > 0 ? Number((stats.goals / stats.shots).toFixed(3)) : 0;

    const assistsPer90 = Number((stats.assists * p90Factor).toFixed(3));
    const keyPassesPer90 = Number((stats.keyPasses * p90Factor).toFixed(3));

    const tacklesPer90 = Number((stats.tackles * p90Factor).toFixed(3));
    const interceptionsPer90 = Number((stats.interceptions * p90Factor).toFixed(3));
    const aerialDuelsPer90 = Number((stats.aerialDuelsWon * p90Factor).toFixed(3));

    const totalShotsFaced = stats.saves + stats.goalsConceded;
    const savePercentage = totalShotsFaced > 0 ? Number((stats.saves / totalShotsFaced).toFixed(3)) : 0;
    const cleanSheetRate = stats.appearances > 0 ? Number((stats.cleanSheets / stats.appearances).toFixed(3)) : 0;

    const rawMetricsPresent = [
      'appearances', 'starts', 'minutesPlayed', 'goals', 'assists',
      'shots', 'shotsOnTarget', 'tackles', 'interceptions', 'clearances',
      'aerialDuelsWon', 'saves', 'goalsConceded', 'cleanSheets', 'yellowCards', 'redCards'
    ];
    if (stats.expectedGoals !== undefined) rawMetricsPresent.push('expectedGoals');
    if (stats.expectedAssists !== undefined) rawMetricsPresent.push('expectedAssists');
    if (stats.groundDuelsWon !== undefined) rawMetricsPresent.push('groundDuelsWon');
    if (stats.dribblesSuccess !== undefined) rawMetricsPresent.push('dribblesSuccess');

    return {
      playerId: player.sourceId,
      seasonKey: `${stats.seasonYearStart}-${stats.seasonYearEnd}`,
      competitionCode: stats.competitionCode,
      splitRole: 'TRAIN', // configured by DatasetSplitter
      sourceLineage: {
        sourceCode,
        sourceEntityId: stats.sourceId,
        datasetVersion,
        importedAt: new Date().toISOString(),
        rawMetricsPresent,
      },
      age,
      height: player.height,
      weight: player.weight,
      positionCategory,
      primaryPosition: player.primaryPosition,
      preferredFoot: player.preferredFoot,
      appearances: stats.appearances,
      starts: stats.starts,
      minutesPlayed: stats.minutesPlayed,
      startsRatio: stats.appearances > 0 ? Number((stats.starts / stats.appearances).toFixed(2)) : 0,
      goals: stats.goals,
      shots: stats.shots,
      shotsOnTarget: stats.shotsOnTarget,
      goalsPer90,
      shotsPer90,
      shotAccuracy,
      conversionRate,
      expectedGoals: stats.expectedGoals,
      assists: stats.assists,
      keyPasses: stats.keyPasses,
      passesCompleted: stats.passesCompleted,
      passAccuracy: stats.passAccuracy,
      assistsPer90,
      keyPassesPer90,
      expectedAssists: stats.expectedAssists,
      tackles: stats.tackles,
      interceptions: stats.interceptions,
      clearances: stats.clearances,
      aerialDuelsWon: stats.aerialDuelsWon,
      tacklesPer90,
      interceptionsPer90,
      aerialDuelsPer90,
      groundDuelsWon: stats.groundDuelsWon,
      dribblesSuccess: stats.dribblesSuccess,
      saves: stats.saves,
      goalsConceded: stats.goalsConceded,
      cleanSheets: stats.cleanSheets,
      savePercentage,
      cleanSheetRate,
      expectedGoalsConceded: stats.expectedGoalsConceded,
      yellowCards: stats.yellowCards,
      redCards: stats.redCards,
      foulsPer90: 0,
      progressiveCarries: UNAVAILABLE_FROM_CURRENT_SOURCES,
      sprintCount: UNAVAILABLE_FROM_CURRENT_SOURCES,
      distanceCoveredKm: UNAVAILABLE_FROM_CURRENT_SOURCES,
      highClaimPercentage: UNAVAILABLE_FROM_CURRENT_SOURCES,
    };
  }

  private static classifyPositionCategory(
    pos: string
  ): 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'ATTACKER' {
    switch (pos) {
      case 'GK':
        return 'GOALKEEPER';
      case 'CB':
      case 'LB':
      case 'RB':
      case 'LWB':
      case 'RWB':
        return 'DEFENDER';
      case 'CDM':
      case 'CM':
      case 'CAM':
      case 'LM':
      case 'RM':
        return 'MIDFIELDER';
      default:
        return 'ATTACKER';
    }
  }
}
