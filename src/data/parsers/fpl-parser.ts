// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: FPL OPEN DATA PARSER
// Parses vaastav/Fantasy-Premier-League open CSV archives into Canonical Entities.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CanonicalClub,
  CanonicalPlayer,
  CanonicalPlayerStats,
  CanonicalRegistration,
} from '../types/data-foundation.types';
import { CsvHelper } from './csv-helper';
import { PositionNormalizer } from '../normalization/position-normalizer';
import { NameNormalizer } from '../normalization/name-normalizer';

export class FplParser {
  /**
   * Parses teams.csv into CanonicalClubs.
   */
  public static parseTeams(
    teamsCsvText: string
  ): Map<string, CanonicalClub> {
    const rows = CsvHelper.parseCsv(teamsCsvText);
    const clubMap = new Map<string, CanonicalClub>(); // team id or code -> club

    for (const row of rows) {
      const teamId = CsvHelper.parseString(row.id);
      const teamCode = CsvHelper.parseString(row.code);
      const name = CsvHelper.parseString(row.name);
      const shortName = CsvHelper.parseString(row.short_name);

      if (!teamId || !name) continue;

      const canonicalCode = (shortName || name.slice(0, 3)).toUpperCase();
      const sourceId = `club-${canonicalCode.toLowerCase()}`;
      const club: CanonicalClub = {
        sourceId,
        name: NameNormalizer.toComparableKey(name) === 'man city' ? 'Manchester City' :
              NameNormalizer.toComparableKey(name) === 'man utd' ? 'Manchester United' :
              NameNormalizer.toComparableKey(name) === 'spurs' ? 'Tottenham Hotspur' :
              NameNormalizer.toComparableKey(name) === 'wolves' ? 'Wolverhampton Wanderers' :
              NameNormalizer.toComparableKey(name) === 'nott\'m forest' ? 'Nottingham Forest' :
              NameNormalizer.toComparableKey(name) === 'sheffield utd' ? 'Sheffield United' :
              name,
        shortName: shortName || name.slice(0, 3).toUpperCase(),
        code: canonicalCode,
        countryCode: 'ENG',
        city: 'England',
        stadiumName: `${name} Stadium`,
        stadiumCapacity: 45000,
        reputation: 80,
        domesticPrestige: 80,
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        aliases: [name, shortName],
      };

      clubMap.set(teamId, club);
      if (teamCode) {
        clubMap.set(teamCode, club);
      }
    }

    return clubMap;
  }

  /**
   * Parses players_raw.csv into CanonicalPlayers, Registrations, and PlayerStats.
   */
  public static parsePlayers(
    playersCsvText: string,
    teamsMap: Map<string, CanonicalClub>,
    seasonYearStart: number,
    seasonYearEnd: number
  ): {
    players: CanonicalPlayer[];
    registrations: CanonicalRegistration[];
    playerStats: CanonicalPlayerStats[];
  } {
    const rows = CsvHelper.parseCsv(playersCsvText);
    const players: CanonicalPlayer[] = [];
    const registrations: CanonicalRegistration[] = [];
    const playerStats: CanonicalPlayerStats[] = [];

    for (const row of rows) {
      const id = CsvHelper.parseString(row.id);
      const code = CsvHelper.parseString(row.code);
      const firstName = CsvHelper.parseString(row.first_name);
      const secondName = CsvHelper.parseString(row.second_name);
      const webName = CsvHelper.parseString(row.web_name);
      const teamId = CsvHelper.parseString(row.team);
      const elementType = CsvHelper.parseString(row.element_type);

      if (!id || !secondName) continue;

      const playerSourceId = `fpl-p-${code || id}`;

      // Map position
      let sourcePosLabel = 'MID';
      if (elementType === '1') sourcePosLabel = 'GK';
      else if (elementType === '2') sourcePosLabel = 'DEF';
      else if (elementType === '3') sourcePosLabel = 'MID';
      else if (elementType === '4') sourcePosLabel = 'FWD';

      const normPos = PositionNormalizer.normalizePosition(sourcePosLabel);

      // Associated Club
      const club = teamsMap.get(teamId);
      const clubSourceId = club ? club.sourceId : 'openfootball-club-epl-generic';

      const player: CanonicalPlayer = {
        sourceId: playerSourceId,
        firstName: firstName || '',
        lastName: secondName,
        shortName: webName || `${firstName ? firstName[0] + '. ' : ''}${secondName}`,
        dateOfBirth: new Date('1998-01-01T00:00:00.000Z'), // FPL lacks DOB; enriched later by knowledge graph
        nationality: 'ENG',
        sourcePosition: `FPL_TYPE_${elementType}_${sourcePosLabel}`,
        primaryPosition: normPos.normalizedPosition,
        secondaryPositions: normPos.secondaryPositions,
        preferredFoot: 'RIGHT',
        height: 182,
        currentClubSourceId: clubSourceId,
        aliases: [webName, `${firstName} ${secondName}`.trim()],
      };

      players.push(player);

      // Registration
      registrations.push({
        sourceId: `fpl-reg-${playerSourceId}-${clubSourceId}-${seasonYearStart}`,
        playerSourceId,
        clubSourceId,
        seasonYearStart,
        seasonYearEnd,
        startDate: new Date(`${seasonYearStart}-07-01`),
        endDate: new Date(`${seasonYearEnd}-06-30`),
        isActive: true,
        registrationType: 'PERMANENT',
      });

      // Player season statistics
      const starts = CsvHelper.parseNumber(row.starts, 0);
      const minutes = CsvHelper.parseNumber(row.minutes, 0);
      const appearances = Math.max(starts, minutes > 0 ? starts + (minutes > starts * 70 ? 1 : 0) : 0);
      const goals = CsvHelper.parseNumber(row.goals_scored, 0);
      const assists = CsvHelper.parseNumber(row.assists, 0);
      const cleanSheets = CsvHelper.parseNumber(row.clean_sheets, 0);
      const goalsConceded = CsvHelper.parseNumber(row.goals_conceded, 0);
      const saves = CsvHelper.parseNumber(row.saves, 0);
      const yellowCards = CsvHelper.parseNumber(row.yellow_cards, 0);
      const redCards = CsvHelper.parseNumber(row.red_cards, 0);

      // Advanced metrics provided by FPL
      const expectedGoals = CsvHelper.parseNumber(row.expected_goals, 0);
      const expectedAssists = CsvHelper.parseNumber(row.expected_assists, 0);
      const expectedGoalsConceded = CsvHelper.parseNumber(row.expected_goals_conceded, 0);

      const stat: CanonicalPlayerStats = {
        sourceId: `fpl-stat-${playerSourceId}-${seasonYearStart}-${seasonYearEnd}`,
        playerSourceId,
        clubSourceId,
        competitionCode: 'EPL',
        seasonYearStart,
        seasonYearEnd,
        appearances,
        starts,
        minutesPlayed: minutes,
        goals,
        assists,
        shots: Math.max(goals, Math.round(expectedGoals * 7)), // approximate shots if unrecorded
        shotsOnTarget: Math.max(goals, Math.round(expectedGoals * 3)),
        keyPasses: Math.max(assists, Math.round(expectedAssists * 4)),
        passesCompleted: Math.round(minutes * 0.4),
        passAccuracy: 80,
        tackles: Math.round(minutes * 0.02),
        interceptions: Math.round(minutes * 0.015),
        clearances: Math.round(minutes * 0.025),
        aerialDuelsWon: Math.round(minutes * 0.01),
        yellowCards,
        redCards,
        cleanSheets,
        saves,
        goalsConceded,
        expectedGoals,
        expectedAssists,
        expectedGoalsConceded,
      };

      playerStats.push(stat);
    }

    return {
      players,
      registrations,
      playerStats,
    };
  }
}
