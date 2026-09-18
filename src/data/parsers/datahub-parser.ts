// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: DATAHUB / FOOTBALL-DATA.CO.UK PARSER
// Parses historical match CSV archives containing matchday results, team shots, corners, fouls.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CanonicalFixtureResult,
} from '../types/data-foundation.types';
import { CsvHelper } from './csv-helper';
import { NameNormalizer } from '../normalization/name-normalizer';

export class DataHubParser {
  /**
   * Parses football-data.co.uk divisional CSV files.
   */
  public static parseFixtures(
    csvText: string,
    competitionCode: string,
    seasonYearStart: number,
    seasonYearEnd: number
  ): CanonicalFixtureResult[] {
    const rows = CsvHelper.parseCsv(csvText);
    const fixtures: CanonicalFixtureResult[] = [];

    let matchIndex = 1;
    for (const row of rows) {
      const dateStr = CsvHelper.parseString(row.Date);
      const homeTeam = CsvHelper.parseString(row.HomeTeam);
      const awayTeam = CsvHelper.parseString(row.AwayTeam);
      const fthg = CsvHelper.parseNumber(row.FTHG, 0);
      const ftag = CsvHelper.parseNumber(row.FTAG, 0);
      const hthg = CsvHelper.parseNumber(row.HTHG, 0);
      const htag = CsvHelper.parseNumber(row.HTAG, 0);

      if (!homeTeam || !awayTeam || !dateStr) continue;

      // Parse date DD/MM/YYYY or YYYY-MM-DD
      let matchDate: Date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
        matchDate = new Date(Date.UTC(year, month, day));
      } else {
        matchDate = new Date(dateStr);
      }

      const homeNorm = NameNormalizer.normalizeClubName(homeTeam).replace(/\s+/g, '-');
      const awayNorm = NameNormalizer.normalizeClubName(awayTeam).replace(/\s+/g, '-');

      const homeClubSourceId = `datahub-club-${homeNorm}`;
      const awayClubSourceId = `datahub-club-${awayNorm}`;

      const hs = CsvHelper.parseNumber(row.HS, 0);
      const as = CsvHelper.parseNumber(row.AS, 0);
      const hst = CsvHelper.parseNumber(row.HST, 0);
      const ast = CsvHelper.parseNumber(row.AST, 0);
      const hc = CsvHelper.parseNumber(row.HC, 0);
      const ac = CsvHelper.parseNumber(row.AC, 0);
      const hf = CsvHelper.parseNumber(row.HF, 0);
      const af = CsvHelper.parseNumber(row.AF, 0);
      const hy = CsvHelper.parseNumber(row.HY, 0);
      const ay = CsvHelper.parseNumber(row.AY, 0);
      const hr = CsvHelper.parseNumber(row.HR, 0);
      const ar = CsvHelper.parseNumber(row.AR, 0);

      fixtures.push({
        sourceId: `datahub-fix-${competitionCode.toLowerCase()}-${seasonYearStart}-${seasonYearEnd}-${matchIndex++}-${homeNorm}-${awayNorm}`,
        competitionCode,
        seasonYearStart,
        seasonYearEnd,
        matchWeek: Math.ceil(matchIndex / 10),
        matchDate,
        homeClubSourceId,
        awayClubSourceId,
        homeScore: fthg,
        awayScore: ftag,
        homeScoreHT: hthg,
        awayScoreHT: htag,
        isNeutralVenue: false,
        homeShots: hs,
        awayShots: as,
        homeShotsOnTarget: hst,
        awayShotsOnTarget: ast,
        homeCorners: hc,
        awayCorners: ac,
        homeFouls: hf,
        awayFouls: af,
        homeYellowCards: hy,
        awayYellowCards: ay,
        homeRedCards: hr,
        awayRedCards: ar,
      });
    }

    return fixtures;
  }
}
