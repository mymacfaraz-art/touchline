// ─────────────────────────────────────────────────────────────────────────────
// CLUB & MANAGER DOMAIN TYPES
// Pure TypeScript. Zero framework or database dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export type ClubFacilityLevel =
  | 'POOR'
  | 'BELOW_AVERAGE'
  | 'AVERAGE'
  | 'GOOD'
  | 'EXCELLENT'
  | 'WORLD_CLASS';

export type BoardAmbition =
  | 'RELEGATION_BATTLE'
  | 'SURVIVAL'
  | 'MID_TABLE'
  | 'PLAYOFF'
  | 'PROMOTION'
  | 'TITLE'
  | 'EUROPEAN'
  | 'CHAMPIONS_LEAGUE';

// ─────────────────────────────────────────────────────────────────────────────
// GEOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

/** Geographic anchor for clubs and domestic competitions. */
export interface DomainCountry {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-3 code e.g. "ENG", "ESP", "DEU" */
  code: string;
  continent: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUB IDENTITY (STATIC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persistent club identity. This record does not change between seasons.
 * Season-specific state (budget, morale, board confidence) lives in
 * ClubSeasonState.
 */
export interface DomainClub {
  id: string;
  name: string;
  shortName: string;
  /** 3-letter code e.g. "ARS", "RMA", "FCB" */
  code: string;
  countryId: string;
  city: string;
  stadiumName: string;
  /** Stadium seating capacity */
  stadiumCapacity: number;
  /** Global reputation 1–100 */
  reputation: number;
  /** Domestic prestige within the club's own country 1–100 */
  domesticPrestige: number;
  primaryColor: string;
  secondaryColor: string;
  /** Year the club was founded */
  founded?: number;
  /** true = this is the club currently managed by the user */
  isPlayerClub: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUB SEASON STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Club's mutable state for a specific GameSeason (career year).
 * One record per club per year. Scoped to GameSeason, NOT CompetitionSeason,
 * because budget, morale, and board confidence are holistic club states that
 * span all competitions the club participates in simultaneously.
 */
export interface ClubSeasonState {
  id: string;
  clubId: string;
  gameSeasonId: string;
  /** Available transfer budget in the current window */
  transferBudget: number;
  /** Maximum weekly wage budget across all contracts */
  wageBudget: number;
  /** Board satisfaction with manager's performance (0–100) */
  boardConfidence: number;
  /** Fan happiness index (0–100) */
  fanHappiness: number;
  /** Squad-wide morale aggregate (0–100) */
  squadMorale: number;
  facilityLevel: ClubFacilityLevel;
  boardAmbition: BoardAmbition;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER
// ─────────────────────────────────────────────────────────────────────────────

export interface DomainManager {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  /** Global reputation 1–100 */
  reputation: number;
  /** true = AI-controlled manager */
  isAI: boolean;
  userId?: string;
  clubId?: string;
}
