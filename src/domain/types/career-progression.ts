// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 7-9: CAREER DOMAIN TYPES & CONSTANTS
// Pure TypeScript domain types and interfaces.
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonStage =
  | 'PRE_SEASON'
  | 'ACTIVE'
  | 'MID_SEASON_WINDOW'
  | 'SEASON_FINISHED'
  | 'OFF_SEASON'
  | 'NEXT_SEASON_SETUP';

export interface StandingsRow {
  clubId: string;
  clubName: string;
  clubCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  promotionStatus?: string | null;
}

export interface KnockoutMatchSummary {
  fixtureId: string;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  matchWeek: number;
  winnerClubId?: string | null;
}

export interface KnockoutRound {
  phaseId: string;
  name: string;
  order: number;
  isComplete: boolean;
  matches: KnockoutMatchSummary[];
}

export interface MatchdayAdvancementResult {
  simulatedFixturesCount: number;
  completedFixtures: Array<{
    fixtureId: string;
    homeClubId: string;
    awayClubId: string;
    homeScore: number;
    awayScore: number;
  }>;
  standingsUpdated: boolean;
  nextMatchDate: Date;
  isSeasonComplete: boolean;
}

export interface SeasonSummary {
  gameSeasonId: string;
  yearStart: number;
  yearEnd: number;
  champions: Array<{ competitionCode: string; clubName: string; clubId: string }>;
  promotedClubs: string[];
  relegatedClubs: string[];
  topScorers: Array<{ playerId: string; playerName: string; clubName: string; goals: number }>;
}
