// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: OPENFOOTBALL DATA PARSER
// Parses football.json fixture archives into Canonical Competitions, Clubs, and FixtureResults.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CanonicalClub,
  CanonicalCompetition,
  CanonicalCountry,
  CanonicalFixtureResult,
} from '../types/data-foundation.types';
import { NameNormalizer } from '../normalization/name-normalizer';

export interface OpenFootballMatchJson {
  round?: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  score?: {
    ht?: [number, number];
    ft?: [number, number];
  };
}

export interface OpenFootballCompetitionJson {
  name: string;
  matches: OpenFootballMatchJson[];
}

export class OpenFootballParser {
  /**
   * Maps league filename or name to competition metadata and country.
   */
  public static getCompetitionMeta(compNameOrFile: string): {
    competitionCode: string;
    competitionName: string;
    countryCode: string;
    countryName: string;
    continent: string;
  } {
    const lower = compNameOrFile.toLowerCase();
    if (lower.includes('premier league') || lower.includes('en.1')) {
      return {
        competitionCode: 'EPL',
        competitionName: 'Premier League',
        countryCode: 'ENG',
        countryName: 'England',
        continent: 'Europe',
      };
    }
    if (lower.includes('la liga') || lower.includes('primera') || lower.includes('es.1')) {
      return {
        competitionCode: 'LALIGA',
        competitionName: 'La Liga',
        countryCode: 'ESP',
        countryName: 'Spain',
        continent: 'Europe',
      };
    }
    if (lower.includes('bundesliga') || lower.includes('de.1')) {
      return {
        competitionCode: 'BL1',
        competitionName: 'Bundesliga',
        countryCode: 'DEU',
        countryName: 'Germany',
        continent: 'Europe',
      };
    }
    if (lower.includes('serie a') || lower.includes('it.1')) {
      return {
        competitionCode: 'SERIEA',
        competitionName: 'Serie A',
        countryCode: 'ITA',
        countryName: 'Italy',
        continent: 'Europe',
      };
    }
    if (lower.includes('ligue 1') || lower.includes('fr.1')) {
      return {
        competitionCode: 'FL1',
        competitionName: 'Ligue 1',
        countryCode: 'FRA',
        countryName: 'France',
        continent: 'Europe',
      };
    }
    return {
      competitionCode: 'UNKNOWN_COMP',
      competitionName: compNameOrFile,
      countryCode: 'ENG',
      countryName: 'England',
      continent: 'Europe',
    };
  }

  /**
   * Generates a 3-character club code from a team name.
   */
  public static generateClubCode(teamName: string): string {
    const cleaned = NameNormalizer.normalizeClubName(teamName);
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
    }
    if (words.length === 2) {
      return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 3).toUpperCase();
  }

  /**
   * Parses a football.json payload string.
   */
  public static parseCompetitionData(
    jsonText: string,
    seasonYearStart: number,
    seasonYearEnd: number,
    sourceFileName: string
  ): {
    country: CanonicalCountry;
    competition: CanonicalCompetition;
    clubs: CanonicalClub[];
    fixtures: CanonicalFixtureResult[];
  } {
    const data: OpenFootballCompetitionJson = JSON.parse(jsonText);
    const meta = this.getCompetitionMeta(data.name || sourceFileName);

    const country: CanonicalCountry = {
      sourceId: `openfootball-country-${meta.countryCode.toLowerCase()}`,
      name: meta.countryName,
      code: meta.countryCode,
      continent: meta.continent,
    };

    const clubsMap = new Map<string, CanonicalClub>();
    const fixtures: CanonicalFixtureResult[] = [];

    const competition: CanonicalCompetition = {
      sourceId: `openfootball-comp-${meta.competitionCode.toLowerCase()}`,
      name: meta.competitionName,
      code: meta.competitionCode,
      type: 'LEAGUE',
      format: 'ROUND_ROBIN',
      countryCode: meta.countryCode,
      continent: meta.continent,
      tier: 1,
      teamsCount: 20,
      hasPromotion: false,
      hasRelegation: true,
      promotionSpots: 0,
      relegationSpots: 3,
    };

    for (const match of data.matches || []) {
      const team1Norm = NameNormalizer.normalizeClubName(match.team1);
      const team2Norm = NameNormalizer.normalizeClubName(match.team2);

      const team1Code = this.generateClubCode(match.team1);
      const team2Code = this.generateClubCode(match.team2);

      const club1SourceId = `openfootball-club-${team1Norm.replace(/\s+/g, '-')}`;
      const club2SourceId = `openfootball-club-${team2Norm.replace(/\s+/g, '-')}`;

      if (!clubsMap.has(club1SourceId)) {
        clubsMap.set(club1SourceId, {
          sourceId: club1SourceId,
          name: match.team1,
          shortName: match.team1.replace(/\s+(FC|CF|AFC|SC)$/i, ''),
          code: team1Code,
          countryCode: meta.countryCode,
          city: meta.countryName,
          stadiumName: `${match.team1} Stadium`,
          stadiumCapacity: 40000,
          reputation: 75,
          domesticPrestige: 75,
          primaryColor: '#1A1A1A',
          secondaryColor: '#FFFFFF',
          aliases: [match.team1, team1Norm],
        });
      }

      if (!clubsMap.has(club2SourceId)) {
        clubsMap.set(club2SourceId, {
          sourceId: club2SourceId,
          name: match.team2,
          shortName: match.team2.replace(/\s+(FC|CF|AFC|SC)$/i, ''),
          code: team2Code,
          countryCode: meta.countryCode,
          city: meta.countryName,
          stadiumName: `${match.team2} Stadium`,
          stadiumCapacity: 40000,
          reputation: 75,
          domesticPrestige: 75,
          primaryColor: '#1A1A1A',
          secondaryColor: '#FFFFFF',
          aliases: [match.team2, team2Norm],
        });
      }

      // Parse matchweek/round
      let matchWeek = 1;
      if (match.round) {
        const matchDigits = match.round.match(/\d+/);
        if (matchDigits) {
          matchWeek = parseInt(matchDigits[0], 10);
        }
      }

      const matchDate = new Date(match.date);
      const homeScore = match.score?.ft?.[0] ?? 0;
      const awayScore = match.score?.ft?.[1] ?? 0;
      const homeScoreHT = match.score?.ht?.[0];
      const awayScoreHT = match.score?.ht?.[1];

      const fixtureSourceId = `openfootball-fix-${meta.competitionCode.toLowerCase()}-${seasonYearStart}-${seasonYearEnd}-md${matchWeek}-${team1Code}-${team2Code}-${match.date}`;

      fixtures.push({
        sourceId: fixtureSourceId,
        competitionCode: meta.competitionCode,
        seasonYearStart,
        seasonYearEnd,
        matchWeek,
        matchDate,
        homeClubSourceId: club1SourceId,
        awayClubSourceId: club2SourceId,
        homeScore,
        awayScore,
        homeScoreHT,
        awayScoreHT,
        isNeutralVenue: false,
      });
    }

    const clubs = Array.from(clubsMap.values());
    competition.teamsCount = clubs.length || 20;

    return {
      country,
      competition,
      clubs,
      fixtures,
    };
  }
}
