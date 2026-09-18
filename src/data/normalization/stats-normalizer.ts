// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: STATISTICS NORMALIZER
// Validates, sanitizes, and normalizes raw statistical metrics.
// ─────────────────────────────────────────────────────────────────────────────

import { CanonicalPlayerStats } from '../types/data-foundation.types';

export class StatsNormalizer {
  /**
   * Sanitizes and normalizes player seasonal statistics.
   * Ensures non-negative numbers and logical integrity.
   */
  public static normalizePlayerStats(raw: Partial<CanonicalPlayerStats>): CanonicalPlayerStats {
    const appearances = Math.max(0, Math.floor(raw.appearances ?? 0));
    const starts = Math.min(appearances, Math.max(0, Math.floor(raw.starts ?? 0)));
    const minutesPlayed = Math.max(0, Math.floor(raw.minutesPlayed ?? appearances * 70));

    return {
      sourceId: raw.sourceId || 'STAT_UNKNOWN',
      playerSourceId: raw.playerSourceId || '',
      clubSourceId: raw.clubSourceId || '',
      competitionCode: raw.competitionCode || 'UNKNOWN',
      seasonYearStart: raw.seasonYearStart ?? 2024,
      seasonYearEnd: raw.seasonYearEnd ?? 2025,
      appearances,
      starts,
      minutesPlayed,
      goals: Math.max(0, Math.floor(raw.goals ?? 0)),
      assists: Math.max(0, Math.floor(raw.assists ?? 0)),
      shots: Math.max(0, Math.floor(raw.shots ?? 0)),
      shotsOnTarget: Math.max(0, Math.floor(raw.shotsOnTarget ?? 0)),
      keyPasses: Math.max(0, Math.floor(raw.keyPasses ?? 0)),
      passesCompleted: Math.max(0, Math.floor(raw.passesCompleted ?? 0)),
      passAccuracy: Math.min(100, Math.max(0, raw.passAccuracy ?? 75.0)),
      tackles: Math.max(0, Math.floor(raw.tackles ?? 0)),
      interceptions: Math.max(0, Math.floor(raw.interceptions ?? 0)),
      clearances: Math.max(0, Math.floor(raw.clearances ?? 0)),
      aerialDuelsWon: Math.max(0, Math.floor(raw.aerialDuelsWon ?? 0)),
      yellowCards: Math.max(0, Math.floor(raw.yellowCards ?? 0)),
      redCards: Math.max(0, Math.floor(raw.redCards ?? 0)),
      cleanSheets: Math.max(0, Math.floor(raw.cleanSheets ?? 0)),
      saves: Math.max(0, Math.floor(raw.saves ?? 0)),
      goalsConceded: Math.max(0, Math.floor(raw.goalsConceded ?? 0)),
    };
  }
}
