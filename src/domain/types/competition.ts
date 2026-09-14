export type CompetitionType = 'LEAGUE' | 'CUP' | 'SUPER_CUP';

export interface DomainCompetition {
  id: string;
  name: string;
  code: string;
  type: CompetitionType;
  country: string;
}

export interface DomainSeason {
  id: string;
  competitionId: string;
  yearStart: number;
  yearEnd: number;
  isCurrent: boolean;
}

export interface StandingEntry {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
