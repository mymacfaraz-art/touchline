// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: LA LIGA OPEN DATA PARSER
// Parses sdelquin/laliga-data CSV releases into Canonical Players, Clubs, and PlayerStats.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CanonicalClub,
  CanonicalPlayer,
  CanonicalPlayerStats,
  CanonicalRegistration,
} from '../types/data-foundation.types';
import { CsvHelper } from './csv-helper';
import { PositionNormalizer } from '../normalization/position-normalizer';
import { StatsNormalizer } from '../normalization/stats-normalizer';

const ISO2_TO_ISO3: Record<string, string> = {
  ES: 'ESP',
  FR: 'FRA',
  BR: 'BRA',
  AR: 'ARG',
  DE: 'DEU',
  IT: 'ITA',
  PT: 'PRT',
  NL: 'NLD',
  BE: 'BEL',
  HR: 'CRO',
  UY: 'URY',
  CO: 'COL',
  SN: 'SEN',
  NG: 'NGA',
  MA: 'MAR',
  GB: 'ENG',
  ENG: 'ENG',
  NOR: 'NOR',
  DK: 'DNK',
  SE: 'SWE',
  PL: 'POL',
  AT: 'AUT',
  CH: 'CHE',
  JP: 'JPN',
  KR: 'KOR',
  US: 'USA',
};

export class LaLigaParser {
  /**
   * Parses S2324 or S2122 La Liga players CSV.
   */
  public static parseLaLigaData(
    csvText: string,
    seasonYearStart: number,
    seasonYearEnd: number
  ): {
    clubs: CanonicalClub[];
    players: CanonicalPlayer[];
    registrations: CanonicalRegistration[];
    playerStats: CanonicalPlayerStats[];
  } {
    const rows = CsvHelper.parseCsv(csvText);
    const clubsMap = new Map<string, CanonicalClub>();
    const players: CanonicalPlayer[] = [];
    const registrations: CanonicalRegistration[] = [];
    const playerStats: CanonicalPlayerStats[] = [];

    // Deduplicate players within the same season CSV
    const seenPlayerIds = new Set<string>();

    for (const row of rows) {
      const id = CsvHelper.parseString(row.id);
      const name = CsvHelper.parseString(row.name);
      const firstname = CsvHelper.parseString(row.firstname);
      const lastname = CsvHelper.parseString(row.lastname);
      const teamName = CsvHelper.parseString(row.team);
      const teamShort = CsvHelper.parseString(row['team.shortname']) || 'LAL';
      const rawPos = CsvHelper.parseString(row.position) || 'Midfielder';
      const rawDob = CsvHelper.parseString(row.date_of_birth);
      const country2 = CsvHelper.parseString(row.country).toUpperCase();
      const height = CsvHelper.parseNumber(row.height, 180);
      const weight = CsvHelper.parseNumber(row.weight, 75);
      const stadium = CsvHelper.parseString(row.stadium) || `${teamName} Stadium`;

      if (!id || !name || !teamName) continue;
      if (seenPlayerIds.has(id)) continue;
      seenPlayerIds.add(id);

      // Club Registration
      const clubCode = teamShort.toUpperCase();
      const clubSourceId = `club-${clubCode.toLowerCase()}`;

      if (!clubsMap.has(clubSourceId)) {
        clubsMap.set(clubSourceId, {
          sourceId: clubSourceId,
          name: teamName,
          shortName: teamShort,
          code: clubCode,
          countryCode: 'ESP',
          city: 'Spain',
          stadiumName: stadium,
          stadiumCapacity: 50000,
          reputation: 80,
          domesticPrestige: 80,
          primaryColor: '#002B49',
          secondaryColor: '#FFFFFF',
          aliases: [teamName, teamShort],
        });
      }

      // Player identity
      const playerSourceId = `laliga-p-${id}`;
      const nationality = ISO2_TO_ISO3[country2] || (country2.length === 3 ? country2 : 'ESP');
      const dateOfBirth = rawDob ? new Date(rawDob) : new Date('1998-01-01');

      const normPos = PositionNormalizer.normalizePosition(rawPos);

      const player: CanonicalPlayer = {
        sourceId: playerSourceId,
        firstName: firstname || name.split(' ')[0] || '',
        lastName: lastname || name.split(' ').slice(1).join(' ') || name,
        shortName: name,
        dateOfBirth: isNaN(dateOfBirth.getTime()) ? new Date('1998-01-01') : dateOfBirth,
        nationality,
        sourcePosition: rawPos,
        primaryPosition: normPos.normalizedPosition,
        secondaryPositions: normPos.secondaryPositions,
        preferredFoot: 'RIGHT',
        height,
        weight,
        currentClubSourceId: clubSourceId,
        aliases: [name, `${firstname} ${lastname}`.trim()],
      };

      players.push(player);

      // Registration
      registrations.push({
        sourceId: `laliga-reg-${id}-${clubCode}-${seasonYearStart}`,
        playerSourceId,
        clubSourceId,
        seasonYearStart,
        seasonYearEnd,
        startDate: new Date(`${seasonYearStart}-07-01`),
        endDate: new Date(`${seasonYearEnd}-06-30`),
        isActive: true,
        registrationType: 'PERMANENT',
      });

      // Player Statistics
      const appearances = CsvHelper.parseNumber(row.appearances, 0);
      const starts = CsvHelper.parseNumber(row.starts, 0);
      const minutes = CsvHelper.parseNumber(row.time_played, 0);
      const goals = CsvHelper.parseNumber(row.goals, 0);
      const assists = CsvHelper.parseNumber(row.goal_assists, 0);
      const shots = CsvHelper.parseNumber(row.total_shots, 0);
      const shotsOnTarget = CsvHelper.parseNumber(row.shots_on_target_inc_goals, 0);
      const passesTotal = CsvHelper.parseNumber(row.total_passes, 0);
      const passesSuccess = CsvHelper.parseNumber(row.total_successful_passes_excl_crosses_corners, 0);
      const tackles = CsvHelper.parseNumber(row.total_tackles, 0);
      const interceptions = CsvHelper.parseNumber(row.interceptions, 0);
      const clearances = CsvHelper.parseNumber(row.total_clearances, 0);
      const aerialDuelsWon = CsvHelper.parseNumber(row.aerial_duels_won, 0);
      const groundDuelsWon = CsvHelper.parseNumber(row.ground_duels_won, 0);
      const dribbles = CsvHelper.parseNumber(row.successful_dribbles, 0);
      const saves = CsvHelper.parseNumber(row.saves_made, 0);
      const cleanSheets = CsvHelper.parseNumber(row.clean_sheets, 0);
      const goalsConceded = CsvHelper.parseNumber(row.goals_conceded, 0);
      const yellowCards = CsvHelper.parseNumber(row.yellow_cards, 0);
      const redCards = CsvHelper.parseNumber(row.total_red_cards, 0);
      const blocks = CsvHelper.parseNumber(row.blocks, 0);
      const recoveries = CsvHelper.parseNumber(row.recoveries, 0);

      const passAccuracy = passesTotal > 0 ? Math.round((passesSuccess / passesTotal) * 100) : 0;

      const rawStats = {
        appearances,
        starts,
        minutesPlayed: minutes,
        goals,
        assists,
        shots,
        shotsOnTarget,
        keyPasses: assists, // proxy or direct
        passesCompleted: passesSuccess,
        passAccuracy,
        tackles,
        interceptions,
        clearances,
        aerialDuelsWon,
        yellowCards,
        redCards,
        cleanSheets,
        saves,
        goalsConceded,
      };

      const normalizedStats = StatsNormalizer.normalizePlayerStats(rawStats);

      playerStats.push({
        ...normalizedStats,
        sourceId: `laliga-stat-${id}-${seasonYearStart}-${seasonYearEnd}`,
        playerSourceId,
        clubSourceId,
        competitionCode: 'LALIGA',
        seasonYearStart,
        seasonYearEnd,
        groundDuelsWon,
        dribblesSuccess: dribbles,
        blocks,
        recoveries,
      });
    }

    return {
      clubs: Array.from(clubsMap.values()),
      players,
      registrations,
      playerStats,
    };
  }
}
