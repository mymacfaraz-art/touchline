// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: REAL FOOTBALL DATA FOUNDATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

import { PlayerPosition, PreferredFoot } from '../../domain/types/player';
import { CompetitionType, CompetitionFormat } from '../../domain/types/competition';

/**
 * Approved data source definitions with strict verification.
 */
export interface DataSourceDefinition {
  code: string;
  name: string;
  officialUrl: string;
  datasetUrl: string;
  license: string;
  licenseVersion: string;
  attributionRequired: boolean;
  attributionText?: string;
  commercialUse: boolean;
  redistribution: boolean;
  mlUse: string;
  supportedEntities: SourceEntityType[];
  coverage: string;
  limitations: string[];
  retrievalMethod: string;
  format: string;
  versionOrDate: string;
  description: string;
}

export type SourceEntityType =
  | 'COUNTRY'
  | 'COMPETITION'
  | 'CLUB'
  | 'PLAYER'
  | 'SEASON'
  | 'FIXTURE'
  | 'MATCH'
  | 'PLAYER_STATS';

/**
 * Canonical raw/source record representation before persistence.
 */
export interface RawSourceRecord<T = Record<string, unknown>> {
  sourceCode: string;
  datasetVersion: string;
  entityType: SourceEntityType;
  sourceEntityId: string;
  payload: T;
  ingestedAt: Date;
}

/**
 * Canonical Country representation.
 */
export interface CanonicalCountry {
  sourceId: string;
  name: string;
  code: string; // ISO 3166-1 alpha-3
  continent: string;
}

/**
 * Canonical Competition representation.
 */
export interface CanonicalCompetition {
  sourceId: string;
  name: string;
  code: string;
  type: CompetitionType;
  format: CompetitionFormat;
  countryCode?: string;
  continent?: string;
  tier: number;
  teamsCount: number;
  hasPromotion: boolean;
  hasRelegation: boolean;
  promotionSpots: number;
  relegationSpots: number;
}

/**
 * Canonical Club representation.
 */
export interface CanonicalClub {
  sourceId: string;
  name: string;
  shortName: string;
  code: string;
  countryCode: string;
  city: string;
  stadiumName: string;
  stadiumCapacity: number;
  reputation: number;
  domesticPrestige: number;
  primaryColor: string;
  secondaryColor: string;
  founded?: number;
  aliases?: string[];
}

/**
 * Canonical Player representation.
 */
export interface CanonicalPlayer {
  sourceId: string;
  firstName: string;
  lastName: string;
  shortName: string;
  dateOfBirth: Date;
  nationality: string;
  secondNationality?: string;
  sourcePosition: string;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  preferredFoot: PreferredFoot;
  height: number;
  weight?: number;
  currentClubSourceId?: string;
  aliases?: string[];
}

/**
 * Canonical Player-Club Registration representation.
 */
export interface CanonicalRegistration {
  sourceId: string;
  playerSourceId: string;
  clubSourceId: string;
  seasonYearStart: number;
  seasonYearEnd: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  registrationType: 'PERMANENT' | 'LOAN' | 'FREE_AGENT_SIGNING' | 'YOUTH_PROMOTION';
}

/**
 * Canonical Objective Player Statistics representation.
 */
export interface CanonicalPlayerStats {
  sourceId: string;
  playerSourceId: string;
  clubSourceId: string;
  competitionCode: string;
  seasonYearStart: number;
  seasonYearEnd: number;
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  keyPasses: number;
  passesCompleted: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  aerialDuelsWon: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  saves: number;
  goalsConceded: number;
  // Optional advanced metrics genuinely provided by open sources (FPL / La Liga)
  expectedGoals?: number;
  expectedAssists?: number;
  expectedGoalsConceded?: number;
  groundDuelsWon?: number;
  dribblesSuccess?: number;
  blocks?: number;
  recoveries?: number;
}

/**
 * Canonical Fixture & Match Result representation.
 */
export interface CanonicalFixtureResult {
  sourceId: string;
  competitionCode: string;
  seasonYearStart: number;
  seasonYearEnd: number;
  matchWeek: number;
  matchDate: Date;
  homeClubSourceId: string;
  awayClubSourceId: string;
  homeScore: number;
  awayScore: number;
  homeScoreHT?: number;
  awayScoreHT?: number;
  isNeutralVenue: boolean;
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeFouls?: number;
  awayFouls?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
}

/**
 * Lineage provenance record.
 */
export interface ProvenanceRecord {
  sourceCode: string;
  entityType: SourceEntityType;
  sourceEntityId: string;
  internalEntityId: string;
  datasetVersion: string;
  confidence: number;
  importedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Comprehensive report generated after an ingestion batch.
 */
export interface ImportReport {
  batchId: string;
  sourceCode: string;
  datasetVersion: string;
  startedAt: Date;
  completedAt: Date;
  counts: {
    countries: number;
    competitions: number;
    clubs: number;
    players: number;
    registrations: number;
    playerStats: number;
    fixtures: number;
  };
  duplicatesDetected: number;
  duplicatesResolved: number;
  unresolvedEntities: number;
  validationErrors: string[];
  warnings: string[];
  isIdempotentRun: boolean;
}
