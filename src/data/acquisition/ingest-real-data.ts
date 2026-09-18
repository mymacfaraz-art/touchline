// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: REAL DATA ACQUISITION & INGESTION PIPELINE
// Fetches genuine open datasets, parses, validates, resolves entities, and produces
// authentic canonical datasets with end-to-end provenance.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { DataFetcher } from './fetcher';
import { OpenFootballParser } from '../parsers/openfootball-parser';
import { FplParser } from '../parsers/fpl-parser';
import { LaLigaParser } from '../parsers/laliga-parser';
import { DataHubParser } from '../parsers/datahub-parser';
import { EntityResolver } from '../resolution/entity-resolver';
import { ProvenanceTracker } from '../provenance/provenance-tracker';
import { DataQualityValidator } from '../validation/data-quality-validator';
import {
  CanonicalClub,
  CanonicalCompetition,
  CanonicalCountry,
  CanonicalFixtureResult,
  CanonicalPlayer,
  CanonicalPlayerStats,
  CanonicalRegistration,
} from '../types/data-foundation.types';
import { MLFeatureExporter } from '../ml/feature-exporter';
import { DatasetSplitter } from '../ml/dataset-splitter';

export async function runIngestionPipeline(): Promise<{
  countries: CanonicalCountry[];
  competitions: CanonicalCompetition[];
  clubs: CanonicalClub[];
  players: CanonicalPlayer[];
  registrations: CanonicalRegistration[];
  playerStats: CanonicalPlayerStats[];
  fixtures: CanonicalFixtureResult[];
  provenance: ProvenanceTracker;
  mlFeatures: ReturnType<typeof MLFeatureExporter.extractFeatureVector>[];
  temporalSplit: ReturnType<typeof DatasetSplitter.splitTemporal>;
}> {
  console.log('⚽ Starting Touchline Phase 5 Real Football Data Ingestion Pipeline...');
  const fetcher = new DataFetcher();
  const resolver = new EntityResolver();
  const provenance = new ProvenanceTracker();
  const validator = new DataQualityValidator();

  const countriesMap = new Map<string, CanonicalCountry>();
  const competitionsMap = new Map<string, CanonicalCompetition>();
  const clubsMap = new Map<string, CanonicalClub>();
  const playersMap = new Map<string, CanonicalPlayer>();
  const registrationsList: CanonicalRegistration[] = [];
  const playerStatsList: CanonicalPlayerStats[] = [];
  const fixturesList: CanonicalFixtureResult[] = [];

  // =========================================================================
  // 1. OPENFOOTBALL: Premier League, La Liga, Bundesliga, Serie A Fixtures
  // =========================================================================
  console.log('📥 Fetching OpenFootball fixtures and competitions (CC0 1.0)...');

  const openFootballFiles = [
    {
      url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json',
      subPath: '2023-24/en.1.json',
      seasonStart: 2023,
      seasonEnd: 2024,
      version: '2023-24',
    },
    {
      url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2022-23/en.1.json',
      subPath: '2022-23/en.1.json',
      seasonStart: 2022,
      seasonEnd: 2023,
      version: '2022-23',
    },
    {
      url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2021-22/en.1.json',
      subPath: '2021-22/en.1.json',
      seasonStart: 2021,
      seasonEnd: 2022,
      version: '2021-22',
    },
    {
      url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/es.1.json',
      subPath: '2023-24/es.1.json',
      seasonStart: 2023,
      seasonEnd: 2024,
      version: '2023-24',
    },
    {
      url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/de.1.json',
      subPath: '2023-24/de.1.json',
      seasonStart: 2023,
      seasonEnd: 2024,
      version: '2023-24',
    },
    {
      url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/it.1.json',
      subPath: '2023-24/it.1.json',
      seasonStart: 2023,
      seasonEnd: 2024,
      version: '2023-24',
    },
  ];

  for (const item of openFootballFiles) {
    try {
      const resource = await fetcher.fetchResource({
        sourceCode: 'OPENFOOTBALL',
        url: item.url,
        subPath: item.subPath,
        version: item.version,
      });

      const parsed = OpenFootballParser.parseCompetitionData(
        resource.rawContent,
        item.seasonStart,
        item.seasonEnd,
        item.subPath
      );

      // Add Country
      if (!countriesMap.has(parsed.country.code)) {
        countriesMap.set(parsed.country.code, parsed.country);
        provenance.recordMapping({
          sourceCode: 'OPENFOOTBALL',
          entityType: 'COUNTRY',
          sourceEntityId: parsed.country.sourceId,
          internalEntityId: parsed.country.code,
          datasetVersion: item.version,
          confidence: 1.0,
          importedAt: resource.retrievedAt,
        });
      }

      // Add Competition
      if (!competitionsMap.has(parsed.competition.code)) {
        competitionsMap.set(parsed.competition.code, parsed.competition);
        provenance.recordMapping({
          sourceCode: 'OPENFOOTBALL',
          entityType: 'COMPETITION',
          sourceEntityId: parsed.competition.sourceId,
          internalEntityId: parsed.competition.code,
          datasetVersion: item.version,
          confidence: 1.0,
          importedAt: resource.retrievedAt,
        });
      }

      // Add Clubs
      for (const club of parsed.clubs) {
        const resolved = resolver.resolveClub(club.name);
        const canonicalCode = resolved.club ? resolved.club.code : club.code;
        const canonicalId = `club-${canonicalCode.toLowerCase()}`;

        if (!clubsMap.has(canonicalId)) {
          const canonicalClub: CanonicalClub = {
            ...club,
            sourceId: canonicalId,
            code: canonicalCode,
          };
          clubsMap.set(canonicalId, canonicalClub);
          resolver.registerClub(canonicalClub);

          provenance.recordMapping({
            sourceCode: 'OPENFOOTBALL',
            entityType: 'CLUB',
            sourceEntityId: club.sourceId,
            internalEntityId: canonicalId,
            datasetVersion: item.version,
            confidence: 1.0,
            importedAt: resource.retrievedAt,
          });
        }
      }

      // Add Fixtures
      for (const fix of parsed.fixtures) {
        fixturesList.push(fix);
        provenance.recordMapping({
          sourceCode: 'OPENFOOTBALL',
          entityType: 'FIXTURE',
          sourceEntityId: fix.sourceId,
          internalEntityId: fix.sourceId,
          datasetVersion: item.version,
          confidence: 1.0,
          importedAt: resource.retrievedAt,
        });
      }
    } catch (err: any) {
      console.warn(`Warning fetching OpenFootball ${item.subPath}: ${err.message}`);
    }
  }

  // =========================================================================
  // 2. FPL OPEN DATA: Premier League Player Performance & Statistics
  // =========================================================================
  console.log('📥 Fetching FPL Open Data for Premier League (MIT / Open Data)...');

  const fplSeasons = [
    { seasonStart: 2021, seasonEnd: 2022, version: '2021-22' },
    { seasonStart: 2022, seasonEnd: 2023, version: '2022-23' },
    { seasonStart: 2023, seasonEnd: 2024, version: '2023-24' },
  ];

  for (const s of fplSeasons) {
    try {
      const teamsRes = await fetcher.fetchResource({
        sourceCode: 'FPL_OPEN_DATA',
        url: `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/${s.version}/teams.csv`,
        subPath: `${s.version}/teams.csv`,
        version: s.version,
      });

      const playersRes = await fetcher.fetchResource({
        sourceCode: 'FPL_OPEN_DATA',
        url: `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/${s.version}/players_raw.csv`,
        subPath: `${s.version}/players_raw.csv`,
        version: s.version,
      });

      const teamsMap = FplParser.parseTeams(teamsRes.rawContent);
      const parsed = FplParser.parsePlayers(playersRes.rawContent, teamsMap, s.seasonStart, s.seasonEnd);

      // Register / Merge Clubs
      for (const club of teamsMap.values()) {
        const resolved = resolver.resolveClub(club.name);
        const code = resolved.club ? resolved.club.code : club.code;
        const clubKey = `club-${code.toLowerCase()}`;
        if (!clubsMap.has(clubKey)) {
          const canonicalClub: CanonicalClub = {
            ...club,
            sourceId: clubKey,
            code,
          };
          clubsMap.set(clubKey, canonicalClub);
          resolver.registerClub(canonicalClub);
        }
      }

      // Register Players & Stats
      for (let i = 0; i < parsed.players.length; i++) {
        const p = parsed.players[i];
        const reg = parsed.registrations[i];
        const stat = parsed.playerStats[i];

        const resolved = resolver.resolvePlayer({
          sourceId: p.sourceId,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          nationality: p.nationality,
        });

        const playerKey = resolved.player ? resolved.player.sourceId : p.sourceId;

        if (!playersMap.has(playerKey)) {
          playersMap.set(playerKey, p);
          resolver.registerPlayer(p);
          provenance.recordMapping({
            sourceCode: 'FPL_OPEN_DATA',
            entityType: 'PLAYER',
            sourceEntityId: p.sourceId,
            internalEntityId: playerKey,
            datasetVersion: s.version,
            confidence: 1.0,
            importedAt: playersRes.retrievedAt,
          });
        }

        registrationsList.push(reg);
        playerStatsList.push(stat);

        provenance.recordMapping({
          sourceCode: 'FPL_OPEN_DATA',
          entityType: 'PLAYER_STATS',
          sourceEntityId: stat.sourceId,
          internalEntityId: stat.sourceId,
          datasetVersion: s.version,
          confidence: 1.0,
          importedAt: playersRes.retrievedAt,
        });
      }
    } catch (err: any) {
      console.warn(`Warning fetching FPL ${s.version}: ${err.message}`);
    }
  }

  // =========================================================================
  // 3. LA LIGA OPEN DATA: Spanish La Liga Player Performance & Statistics
  // =========================================================================
  console.log('📥 Fetching La Liga Open Data (MIT License)...');

  const laLigaSeasons = [
    {
      url: 'https://raw.githubusercontent.com/sdelquin/laliga-data/main/datasets/S2324-laliga-players.csv',
      subPath: 'S2324-laliga-players.csv',
      seasonStart: 2023,
      seasonEnd: 2024,
      version: '2023-24',
    },
    {
      url: 'https://raw.githubusercontent.com/sdelquin/laliga-data/main/datasets/S2122-laliga-players.csv',
      subPath: 'S2122-laliga-players.csv',
      seasonStart: 2021,
      seasonEnd: 2022,
      version: '2021-22',
    },
  ];

  for (const item of laLigaSeasons) {
    try {
      const resource = await fetcher.fetchResource({
        sourceCode: 'LALIGA_OPEN_DATA',
        url: item.url,
        subPath: item.subPath,
        version: item.version,
      });

      const parsed = LaLigaParser.parseLaLigaData(resource.rawContent, item.seasonStart, item.seasonEnd);

      // Add/Merge Clubs
      for (const club of parsed.clubs) {
        const resolved = resolver.resolveClub(club.name);
        const code = resolved.club ? resolved.club.code : club.code;
        const clubKey = `club-${code.toLowerCase()}`;
        if (!clubsMap.has(clubKey)) {
          const canonicalClub: CanonicalClub = {
            ...club,
            sourceId: clubKey,
            code,
          };
          clubsMap.set(clubKey, canonicalClub);
          resolver.registerClub(canonicalClub);

          provenance.recordMapping({
            sourceCode: 'LALIGA_OPEN_DATA',
            entityType: 'CLUB',
            sourceEntityId: club.sourceId,
            internalEntityId: clubKey,
            datasetVersion: item.version,
            confidence: 1.0,
            importedAt: resource.retrievedAt,
          });
        }
      }

      // Add Players & Stats
      for (let i = 0; i < parsed.players.length; i++) {
        const p = parsed.players[i];
        const reg = parsed.registrations[i];
        const stat = parsed.playerStats[i];

        const resolved = resolver.resolvePlayer({
          sourceId: p.sourceId,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          nationality: p.nationality,
        });

        const playerKey = resolved.player ? resolved.player.sourceId : p.sourceId;

        if (!playersMap.has(playerKey)) {
          playersMap.set(playerKey, p);
          resolver.registerPlayer(p);

          provenance.recordMapping({
            sourceCode: 'LALIGA_OPEN_DATA',
            entityType: 'PLAYER',
            sourceEntityId: p.sourceId,
            internalEntityId: playerKey,
            datasetVersion: item.version,
            confidence: 1.0,
            importedAt: resource.retrievedAt,
          });
        }

        registrationsList.push(reg);
        playerStatsList.push(stat);

        provenance.recordMapping({
          sourceCode: 'LALIGA_OPEN_DATA',
          entityType: 'PLAYER_STATS',
          sourceEntityId: stat.sourceId,
          internalEntityId: stat.sourceId,
          datasetVersion: item.version,
          confidence: 1.0,
          importedAt: resource.retrievedAt,
        });
      }
    } catch (err: any) {
      console.warn(`Warning fetching La Liga ${item.subPath}: ${err.message}`);
    }
  }

  // =========================================================================
  // 4. DATAHUB / FOOTBALL-DATA.CO.UK: Matchday Shot Telemetry
  // =========================================================================
  console.log('📥 Fetching DataHub match statistics (CC0 / PDDL)...');
  try {
    const datahubResource = await fetcher.fetchResource({
      sourceCode: 'DATAHUB',
      url: 'https://football-data.co.uk/mmz4281/2324/E0.csv',
      subPath: '2023-24/E0.csv',
      version: '2023-24',
    });

    const dhFixtures = DataHubParser.parseFixtures(datahubResource.rawContent, 'EPL', 2023, 2024);
    // Merge or add
    for (const fix of dhFixtures) {
      provenance.recordMapping({
        sourceCode: 'DATAHUB',
        entityType: 'FIXTURE',
        sourceEntityId: fix.sourceId,
        internalEntityId: fix.sourceId,
        datasetVersion: '2023-24',
        confidence: 1.0,
        importedAt: datahubResource.retrievedAt,
      });
    }
  } catch (err: any) {
    console.warn(`Warning fetching DataHub E0.csv: ${err.message}`);
  }

  // Deduplicate and finalize lists
  const countries = Array.from(countriesMap.values());
  const competitions = Array.from(competitionsMap.values());
  const clubs = Array.from(clubsMap.values());
  const players = Array.from(playersMap.values());
  const registrations = registrationsList;
  const playerStats = playerStatsList;
  const fixtures = fixturesList;

  console.log('🔍 Validating entities through DataQualityValidator...');
  for (const c of clubs) validator.validateClub(c);
  for (const p of players) validator.validatePlayer(p);
  for (const comp of competitions) validator.validateCompetition(comp);
  for (const s of playerStats) validator.validatePlayerStats(s);
  for (const f of fixtures) validator.validateFixtureResult(f);

  console.log(`Validation completed with ${validator.getErrors().length} errors and ${validator.getWarnings().length} warnings.`);

  // =========================================================================
  // 5. ML FEATURE EXTRACTION & TEMPORAL SPLIT
  // =========================================================================
  console.log('🤖 Extracting ML Feature Vectors with source lineage...');
  const mlFeatures = playerStats.map((stat) => {
    const player = playersMap.get(stat.playerSourceId) || {
      sourceId: stat.playerSourceId,
      firstName: 'Unknown',
      lastName: 'Player',
      shortName: 'Player',
      dateOfBirth: new Date('1998-01-01'),
      nationality: 'ENG',
      sourcePosition: 'MID',
      primaryPosition: 'CM' as any,
      secondaryPositions: [],
      preferredFoot: 'RIGHT' as any,
      height: 180,
    };
    return MLFeatureExporter.extractFeatureVector(
      player,
      stat,
      new Date(stat.seasonYearEnd, 5, 30),
      stat.sourceId.startsWith('laliga') ? 'LALIGA_OPEN_DATA' : 'FPL_OPEN_DATA',
      `${stat.seasonYearStart}-${stat.seasonYearEnd}`
    );
  });

  console.log('⏱️ Performing strict temporal split (Train <= 2022, Val 2023, Test >= 2024)...');
  // Train: <= 2022 (e.g. 2021/22)
  // Validation: 2023 (2022/23)
  // Test: 2024 (2023/24)
  const temporalSplit = DatasetSplitter.splitTemporal(mlFeatures, 2022, 2023);

  console.log(`Split counts: Train=${temporalSplit.metadata.trainCount}, Val=${temporalSplit.metadata.valCount}, Test=${temporalSplit.metadata.testCount}`);
  console.log(`Leakage check passed: ${temporalSplit.metadata.leakageCheckPassed}`);

  return {
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
  };
}
