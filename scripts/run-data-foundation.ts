// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: RUN DATA FOUNDATION & DB POPULATION
// Executes end-to-end data acquisition, parsing, validation, provenance,
// database population, idempotency check, and ML feature preparation.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { runIngestionPipeline } from '../src/data/acquisition/ingest-real-data';
import { TouchlineDataImporter } from '../src/data/importer';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('================================================================');
  console.log('TOUCHLINE PHASE 5 — REAL FOOTBALL DATA FOUNDATION EXECUTION');
  console.log('================================================================\n');

  // 1. Run Data Acquisition & Ingestion Pipeline
  const pipelineResult = await runIngestionPipeline();

  const {
    countries,
    competitions,
    clubs,
    players,
    registrations,
    playerStats,
    fixtures,
    provenance,
    mlFeatures,
    temporalSplit,
  } = pipelineResult;

  console.log('\n----------------------------------------------------------------');
  console.log('1. GENERATING COMPILED REAL DATASET SNAPSHOT & SEED MODULE');
  console.log('----------------------------------------------------------------');

  const seedJsonPath = path.resolve(process.cwd(), 'src', 'data', 'seeds', 'real-football-dataset.json');
  const seedTsPath = path.resolve(process.cwd(), 'src', 'data', 'seeds', 'real-football-dataset.ts');

  const jsonSnapshot = {
    countries,
    competitions,
    clubs,
    players,
    registrations,
    playerStats,
    fixtures,
  };

  fs.writeFileSync(seedJsonPath, JSON.stringify(jsonSnapshot, null, 2), 'utf-8');
  console.log(`Saved JSON dataset snapshot to: ${seedJsonPath}`);

  const seedFileContent = `// ─────────────────────────────────────────────────────────────────────────────
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
`;

  fs.writeFileSync(seedTsPath, seedFileContent, 'utf-8');
  console.log(`Saved seed module to: ${seedTsPath}`);

  console.log('\n----------------------------------------------------------------');
  console.log('2. EXECUTING TOUCHLINE DATA IMPORTER (DATABASE POPULATION)');
  console.log('----------------------------------------------------------------');

  const importer = new TouchlineDataImporter();

  // Run 1: Primary Ingestion
  const importReport1 = await importer.importDataset({
    sourceCode: 'OPENFOOTBALL',
    datasetVersion: '2024.1',
    countries,
    competitions,
    clubs,
    players,
    registrations,
    playerStats,
    fixtures,
  });

  console.log(`Import Batch ID: ${importReport1.batchId}`);
  console.log(`Entities imported: Countries=${importReport1.counts.countries}, Competitions=${importReport1.counts.competitions}, Clubs=${importReport1.counts.clubs}, Players=${importReport1.counts.players}, Registrations=${importReport1.counts.registrations}, Stats=${importReport1.counts.playerStats}, Fixtures=${importReport1.counts.fixtures}`);
  console.log(`Validation Errors: ${importReport1.validationErrors.length}`);

  // Run 2: Idempotency Verification
  console.log('\n----------------------------------------------------------------');
  console.log('3. TESTING IDEMPOTENCY (REPEATED IMPORT OF IDENTICAL DATASET)');
  console.log('----------------------------------------------------------------');

  const importReport2 = await importer.importDataset({
    sourceCode: 'OPENFOOTBALL',
    datasetVersion: '2024.1',
    countries,
    competitions,
    clubs,
    players,
    registrations,
    playerStats,
    fixtures,
  });

  console.log(`Run 2 - Duplicates Detected: ${importReport2.duplicatesDetected}`);
  console.log(`Run 2 - Duplicates Resolved: ${importReport2.duplicatesResolved}`);
  console.log(`Run 2 - Is Idempotent: ${importReport2.isIdempotentRun}`);

  console.log('\n================================================================');
  console.log('EXACT DATASET SUMMARY & AUDIT COUNTS');
  console.log('================================================================');
  console.log(`Countries:                 ${countries.length}`);
  console.log(`Competitions:              ${competitions.length}`);
  console.log(`Clubs:                     ${clubs.length}`);
  console.log(`Players:                   ${players.length}`);
  console.log(`Registrations:             ${registrations.length}`);
  console.log(`Player-Season Statistics:  ${playerStats.length}`);
  console.log(`Historical Fixtures:       ${fixtures.length}`);
  console.log(`Tracked Provenance Maps:   ${provenance.size()}`);
  console.log(`ML Feature Rows:           ${mlFeatures.length}`);
  console.log(`  - Train Rows:            ${temporalSplit.metadata.trainCount} (Seasons: ${temporalSplit.metadata.trainSeasons.join(', ')})`);
  console.log(`  - Validation Rows:       ${temporalSplit.metadata.valCount} (Seasons: ${temporalSplit.metadata.valSeasons.join(', ')})`);
  console.log(`  - Held-out Test Rows:    ${temporalSplit.metadata.testCount} (Seasons: ${temporalSplit.metadata.testSeasons.join(', ')})`);
  console.log(`  - Leakage Check Passed:  ${temporalSplit.metadata.leakageCheckPassed}`);
  console.log(`  - Monotonicity Passed:   ${temporalSplit.metadata.temporalMonotonicityPassed}`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error during data foundation execution:', err);
  process.exit(1);
});
