export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED';

export type MatchEventKind = 
  | 'KICK_OFF'
  | 'GOAL'
  | 'OWN_GOAL'
  | 'PENALTY_GOAL'
  | 'PENALTY_MISS'
  | 'SHOT_ON_TARGET'
  | 'SHOT_OFF_TARGET'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'INJURY'
  | 'HALF_TIME'
  | 'FULL_TIME';

export interface DomainMatchEvent {
  minute: number;
  addedTime?: number;
  kind: MatchEventKind;
  teamId: string;
  primaryPlayerId?: string;
  secondaryPlayerId?: string; // assist or substituted out player
  description: string;
}

export interface TeamMatchStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  possessionPercentage: number;
  passesCompleted: number;
  passAccuracyPercentage: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  corners: number;
}

export interface DomainMatchStatistics {
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
}
