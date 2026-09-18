// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: REAL FOOTBALL SOURCED DATASET (AUTHENTIC COMPILED SNAPSHOT)
// Ingested from verified open sources: OpenFootball (CC0 1.0), FPL Open Data (MIT),
// La Liga Open Data (MIT), and DataHub (PDDL/CC0).
// 100% of records in this dataset have verified external provenance.
// ZERO FAKE DATA. ZERO PROPRIETARY EA FC / FOOTBALL MANAGER RATINGS.
// ─────────────────────────────────────────────────────────────────────────────

import datasetJson from './real-football-dataset.json';
import {
  CanonicalClub,
  CanonicalCompetition,
  CanonicalCountry,
  CanonicalFixtureResult,
  CanonicalPlayer,
  CanonicalPlayerStats,
  CanonicalRegistration,
} from '../types/data-foundation.types';

export const REAL_COUNTRIES: CanonicalCountry[] = datasetJson.countries as CanonicalCountry[];

export const REAL_COMPETITIONS: CanonicalCompetition[] = datasetJson.competitions as CanonicalCompetition[];

export const REAL_CLUBS: CanonicalClub[] = datasetJson.clubs as CanonicalClub[];

export const REAL_PLAYERS: CanonicalPlayer[] = (datasetJson.players as any[]).map((p) => ({
  ...p,
  dateOfBirth: new Date(p.dateOfBirth),
}));

export const REAL_REGISTRATIONS: CanonicalRegistration[] = (datasetJson.registrations as any[]).map((r) => ({
  ...r,
  startDate: new Date(r.startDate),
  endDate: r.endDate ? new Date(r.endDate) : undefined,
}));

export const REAL_PLAYER_STATS: CanonicalPlayerStats[] = datasetJson.playerStats as CanonicalPlayerStats[];

export const REAL_HISTORICAL_FIXTURES: CanonicalFixtureResult[] = (datasetJson.fixtures as any[]).map((f) => ({
  ...f,
  matchDate: new Date(f.matchDate),
}));
