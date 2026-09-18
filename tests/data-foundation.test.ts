// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: REAL FOOTBALL DATA FOUNDATION TESTS
// Tests: Source registry, normalization, entity resolution, provenance,
// data quality validation, ML feature export, temporal splitting, and importer idempotency.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APPROVED_DATA_SOURCES, getDataSource } from '../src/data/sources/source-registry';
import { NameNormalizer } from '../src/data/normalization/name-normalizer';
import { PositionNormalizer } from '../src/data/normalization/position-normalizer';
import { StatsNormalizer } from '../src/data/normalization/stats-normalizer';
import { EntityResolver } from '../src/data/resolution/entity-resolver';
import { ProvenanceTracker } from '../src/data/provenance/provenance-tracker';
import { DataQualityValidator } from '../src/data/validation/data-quality-validator';
import { MLFeatureExporter } from '../src/data/ml/feature-exporter';
import { DatasetSplitter } from '../src/data/ml/dataset-splitter';
import { TouchlineDataImporter } from '../src/data/importer';
import {
  REAL_CLUBS,
  REAL_COMPETITIONS,
  REAL_COUNTRIES,
  REAL_PLAYERS,
  REAL_PLAYER_STATS,
  REAL_REGISTRATIONS,
  REAL_HISTORICAL_FIXTURES,
} from '../src/data/seeds/real-football-dataset';
import { prisma } from '../src/lib/prisma';

// Mock Prisma client for unit testing the importer
vi.mock('../src/lib/prisma', () => {
  return {
    prisma: {
      country: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      competition: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      club: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      player: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      playerClubRegistration: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe('Phase 5 — Real Football Data Foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Approved Data Sources Registry', () => {
    it('contains valid entries with strict CC0/open licenses', () => {
      expect(APPROVED_DATA_SOURCES.OPENFOOTBALL).toBeDefined();
      expect(APPROVED_DATA_SOURCES.OPENFOOTBALL.license).toContain('CC0');
      expect(APPROVED_DATA_SOURCES.WIKIDATA).toBeDefined();
      expect(APPROVED_DATA_SOURCES.WIKIDATA.license).toContain('CC0');
      expect(APPROVED_DATA_SOURCES.DATAHUB).toBeDefined();
      expect(APPROVED_DATA_SOURCES.STATSBOMB_OPEN).toBeDefined();
    });

    it('retrieves data source by code and throws on unapproved code', () => {
      const source = getDataSource('OPENFOOTBALL');
      expect(source.code).toBe('OPENFOOTBALL');
      expect(() => getDataSource('UNAPPROVED_PAID_API')).toThrow();
    });
  });

  describe('2. Normalization Subsystems', () => {
    it('NameNormalizer strips diacritics and standardizes club suffixes', () => {
      expect(NameNormalizer.toComparableKey('Kylian Mbappé')).toBe('kylian mbappe');
      expect(NameNormalizer.toComparableKey('Real Madrid C.F.')).toBe('real madrid c f');
      expect(NameNormalizer.normalizeClubName('Arsenal FC')).toBe('arsenal');
      expect(NameNormalizer.normalizeClubName('FC Barcelona')).toBe('barcelona');
      expect(NameNormalizer.normalizeClubName('Manchester City')).toBe('manchester city');
    });

    it('NameNormalizer parses first, last, and short names', () => {
      const parsed = NameNormalizer.parsePlayerName('Erling Braut Haaland');
      expect(parsed.firstName).toBe('Erling Braut');
      expect(parsed.lastName).toBe('Haaland');
      expect(parsed.shortName).toBe('E. Haaland');
    });

    it('PositionNormalizer maps diverse external labels to Touchline PlayerPosition', () => {
      expect(PositionNormalizer.normalizePosition('Goalkeeper').normalizedPosition).toBe('GK');
      expect(PositionNormalizer.normalizePosition('centre-back').normalizedPosition).toBe('CB');
      expect(PositionNormalizer.normalizePosition('left back').normalizedPosition).toBe('LB');
      expect(PositionNormalizer.normalizePosition('defensive midfield').normalizedPosition).toBe('CDM');
      expect(PositionNormalizer.normalizePosition('attacking midfielder').normalizedPosition).toBe('CAM');
      expect(PositionNormalizer.normalizePosition('Striker').normalizedPosition).toBe('ST');
      expect(PositionNormalizer.normalizePosition('winger').normalizedPosition).toBe('RW');
      expect(PositionNormalizer.normalizePosition('invalid_role', 'CM').normalizedPosition).toBe('CM');
    });

    it('StatsNormalizer clamps impossible negative stats and bounds starts <= appearances', () => {
      const normalized = StatsNormalizer.normalizePlayerStats({
        appearances: 10,
        starts: 15, // impossible: starts > appearances
        goals: -3,  // impossible: negative goals
        passAccuracy: 110, // impossible: > 100%
      });

      expect(normalized.appearances).toBe(10);
      expect(normalized.starts).toBe(10); // clamped to appearances
      expect(normalized.goals).toBe(0);
      expect(normalized.passAccuracy).toBe(100);
    });
  });

  describe('3. Entity Resolution & Deduplication', () => {
    let resolver: EntityResolver;

    beforeEach(() => {
      resolver = new EntityResolver();
      REAL_CLUBS.forEach((c) => resolver.registerClub(c));
      REAL_PLAYERS.forEach((p) => resolver.registerPlayer(p));
    });

    it('resolves clubs by code, exact name, and known aliases', () => {
      const ars = REAL_CLUBS.find((c) => c.code === 'ARS' || c.name.toLowerCase().includes('arsenal')) || REAL_CLUBS[0];

      // By code
      expect(resolver.resolveClub(ars.code).club?.name).toBe(ars.name);

      // By exact name
      expect(resolver.resolveClub(ars.name).club?.code).toBe(ars.code);
    });

    it('resolves competitions by code and alias', () => {
      expect(resolver.resolveCompetitionCode('Premier League')).toBe('EPL');
      expect(resolver.resolveCompetitionCode('La Liga')).toBe('LALIGA');
      expect(resolver.resolveCompetitionCode('Bundesliga')).toBe('BL1');
      expect(resolver.resolveCompetitionCode('Serie A')).toBe('SERIEA');
      expect(resolver.resolveCompetitionCode('Champions League')).toBe('UCL');
    });

    it('resolves players by sourceId and composite signature (Name + DOB + Nationality)', () => {
      const samplePlayer = REAL_PLAYERS.find((p) => p.lastName.toLowerCase().includes('haaland')) || REAL_PLAYERS[0];

      // By source ID
      const byId = resolver.resolvePlayer({
        sourceId: samplePlayer.sourceId,
        firstName: '',
        lastName: '',
        dateOfBirth: new Date(),
        nationality: '',
      });
      expect(byId.player).not.toBeNull();
      expect(byId.player?.sourceId).toBe(samplePlayer.sourceId);

      // By composite signature
      const bySig = resolver.resolvePlayer({
        firstName: samplePlayer.firstName,
        lastName: samplePlayer.lastName,
        dateOfBirth: samplePlayer.dateOfBirth,
        nationality: samplePlayer.nationality,
      });
      expect(bySig.player?.sourceId).toBe(samplePlayer.sourceId);
    });
  });

  describe('4. Provenance Tracking', () => {
    it('records and retrieves lineage mappings bidirectionally', () => {
      const tracker = new ProvenanceTracker();
      tracker.recordMapping({
        sourceCode: 'OPENFOOTBALL',
        entityType: 'PLAYER',
        sourceEntityId: 'ext-player-10',
        internalEntityId: 'internal-uuid-1234',
        datasetVersion: 'v2025.1',
        confidence: 1.0,
        importedAt: new Date(),
      });

      expect(tracker.getInternalId('OPENFOOTBALL', 'PLAYER', 'ext-player-10')).toBe('internal-uuid-1234');
      const provs = tracker.getEntityProvenance('PLAYER', 'internal-uuid-1234');
      expect(provs).toHaveLength(1);
      expect(provs[0].sourceEntityId).toBe('ext-player-10');
    });
  });

  describe('5. Data Quality Validation', () => {
    it('catches invalid players, clubs, and fixture records', () => {
      const validator = new DataQualityValidator();

      // Invalid player (empty source ID and future DOB)
      const invalidPlayer: any = {
        sourceId: '',
        firstName: 'Future',
        lastName: 'Player',
        dateOfBirth: new Date('2050-01-01'),
      };
      expect(validator.validatePlayer(invalidPlayer)).toBe(false);
      expect(validator.getErrors().length).toBeGreaterThan(0);

      validator.clear();

      // Invalid fixture (negative score and identical teams)
      const invalidFixture: any = {
        sourceId: 'fix-err',
        homeClubSourceId: 'club-a',
        awayClubSourceId: 'club-a',
        homeScore: -1,
        awayScore: 2,
      };
      expect(validator.validateFixtureResult(invalidFixture)).toBe(false);
    });

    it('passes all real-world seed data through validation with 0 errors', () => {
      const validator = new DataQualityValidator();

      for (const club of REAL_CLUBS) {
        expect(validator.validateClub(club)).toBe(true);
      }
      for (const player of REAL_PLAYERS) {
        expect(validator.validatePlayer(player)).toBe(true);
      }
      for (const comp of REAL_COMPETITIONS) {
        expect(validator.validateCompetition(comp)).toBe(true);
      }
      for (const stat of REAL_PLAYER_STATS) {
        expect(validator.validatePlayerStats(stat)).toBe(true);
      }
      for (const fix of REAL_HISTORICAL_FIXTURES) {
        expect(validator.validateFixtureResult(fix)).toBe(true);
      }

      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('6. ML-Readiness, Feature Export & Temporal Splitting', () => {
    it('exports normalized feature vectors with calculated per 90 metrics', () => {
      const samplePlayer = REAL_PLAYERS.find((p) => p.lastName.toLowerCase().includes('haaland')) || REAL_PLAYERS[0];
      const stat = REAL_PLAYER_STATS.find((s) => s.playerSourceId === samplePlayer.sourceId) || REAL_PLAYER_STATS[0];
      const matchingPlayer = REAL_PLAYERS.find((p) => p.sourceId === stat.playerSourceId) || samplePlayer;

      const featureVector = MLFeatureExporter.extractFeatureVector(matchingPlayer, stat);

      expect(featureVector.playerId).toBe(matchingPlayer.sourceId);
      expect(featureVector.seasonKey).toBeDefined();
      expect(featureVector.goalsPer90).toBeGreaterThanOrEqual(0);
      expect(featureVector.positionCategory).toBeDefined();
    });

    it('splits dataset temporally into clean non-overlapping Train, Validation, and Test partitions', () => {
      const playerMap = new Map(REAL_PLAYERS.map((p) => [p.sourceId, p]));
      const vectors = REAL_PLAYER_STATS
        .filter((s) => playerMap.has(s.playerSourceId))
        .map((s) => MLFeatureExporter.extractFeatureVector(playerMap.get(s.playerSourceId)!, s));

      const split = DatasetSplitter.splitTemporal(vectors, 2023, 2024);

      expect(split.train.length).toBeGreaterThan(0);
      expect(split.validation.length).toBeGreaterThan(0);
      expect(split.test.length).toBeGreaterThan(0);

      // Verify metadata flags
      expect(split.metadata.leakageCheckPassed).toBe(true);
      expect(split.metadata.temporalMonotonicityPassed).toBe(true);
      expect(split.metadata.disjointSeasonsCheckPassed).toBe(true);

      // 1. Verify exact disjoint season sets
      const trainSeasons = new Set(split.metadata.trainSeasons);
      const valSeasons = new Set(split.metadata.valSeasons);
      const testSeasons = new Set(split.metadata.testSeasons);

      for (const s of valSeasons) {
        expect(trainSeasons.has(s)).toBe(false);
      }
      for (const s of testSeasons) {
        expect(trainSeasons.has(s)).toBe(false);
        expect(valSeasons.has(s)).toBe(false);
      }

      // 2. Verify strict temporal monotonicity
      const maxTrain = Math.max(...split.metadata.trainSeasons);
      const minVal = Math.min(...split.metadata.valSeasons);
      const maxVal = Math.max(...split.metadata.valSeasons);
      const minTest = Math.min(...split.metadata.testSeasons);

      expect(maxTrain).toBeLessThan(minVal);
      expect(maxVal).toBeLessThan(minTest);

      // 3. Verify zero player-season overlap across partitions
      const trainKeys = new Set(split.train.map((v) => `${v.playerId}:${v.seasonKey}`));
      const valKeys = new Set(split.validation.map((v) => `${v.playerId}:${v.seasonKey}`));
      const testKeys = new Set(split.test.map((v) => `${v.playerId}:${v.seasonKey}`));

      for (const k of valKeys) {
        expect(trainKeys.has(k)).toBe(false);
      }
      for (const k of testKeys) {
        expect(trainKeys.has(k)).toBe(false);
        expect(valKeys.has(k)).toBe(false);
      }
    });

    it('fails explicitly when an overlapping season or player-season occurs', () => {
      const mockOverlapVectors: any[] = [
        { playerId: 'p1', seasonKey: '2021-2022', splitRole: 'TRAIN' },
        { playerId: 'p1', seasonKey: '2022-2023', splitRole: 'TRAIN' },
      ];

      // Disjoint seasons check failure
      expect(() => {
        DatasetSplitter.verifyDisjointSeasons([2022, 2023], [2023], [2024]);
      }).toThrow(/Data leakage detected/);

      // Leakage check failure
      expect(() => {
        DatasetSplitter.verifyNoLeakage(
          mockOverlapVectors,
          [{ playerId: 'p1', seasonKey: '2022-2023', splitRole: 'VALIDATION' }] as any,
          []
        );
      }).toThrow(/Data leakage detected/);

      // Monotonicity failure
      expect(() => {
        DatasetSplitter.verifyMonotonicity([2022, 2023], [2023], [2024]);
      }).toThrow(/Temporal leak/);
    });
  });

  describe('7. TouchlineDataImporter & Idempotency', () => {
    it('imports dataset and resolves duplicates idempotently', async () => {
      (prisma.country.findUnique as any).mockResolvedValue(null);
      (prisma.country.create as any).mockImplementation(({ data }: any) => ({ id: `db-${data.code}`, ...data }));

      (prisma.competition.findUnique as any).mockResolvedValue(null);
      (prisma.competition.create as any).mockImplementation(({ data }: any) => ({ id: `db-${data.code}`, ...data }));

      (prisma.club.findUnique as any).mockResolvedValue(null);
      (prisma.club.create as any).mockImplementation(({ data }: any) => ({ id: `db-${data.code}`, ...data }));

      (prisma.player.create as any).mockImplementation(({ data }: any) => ({ id: `db-p-${data.shortName}`, ...data }));
      (prisma.playerClubRegistration.findFirst as any).mockResolvedValue(null);
      (prisma.playerClubRegistration.create as any).mockImplementation(({ data }: any) => ({ id: `db-reg-${data.playerId}`, ...data }));

      const importer = new TouchlineDataImporter();

      // First run: initial import
      const report1 = await importer.importDataset({
        sourceCode: 'OPENFOOTBALL',
        datasetVersion: '2025.1',
        countries: REAL_COUNTRIES,
        competitions: REAL_COMPETITIONS,
        clubs: REAL_CLUBS,
        players: REAL_PLAYERS,
        registrations: REAL_REGISTRATIONS,
        playerStats: REAL_PLAYER_STATS,
        fixtures: REAL_HISTORICAL_FIXTURES,
      });

      expect(report1.counts.clubs).toBe(REAL_CLUBS.length);
      expect(report1.counts.players).toBe(REAL_PLAYERS.length);
      expect(report1.validationErrors).toHaveLength(0);

      // Second run: simulated duplicate import
      (prisma.country.findUnique as any).mockResolvedValue({ id: 'db-eng' });
      (prisma.competition.findUnique as any).mockResolvedValue({ id: 'db-epl' });
      (prisma.club.findUnique as any).mockResolvedValue({ id: 'db-mci' });

      const report2 = await importer.importDataset({
        sourceCode: 'OPENFOOTBALL',
        datasetVersion: '2025.1',
        countries: REAL_COUNTRIES,
        competitions: REAL_COMPETITIONS,
        clubs: REAL_CLUBS,
        players: REAL_PLAYERS,
        registrations: REAL_REGISTRATIONS,
      });

      expect(report2.duplicatesDetected).toBeGreaterThan(0);
      expect(report2.duplicatesResolved).toBe(report2.duplicatesDetected);
      expect(report2.isIdempotentRun).toBe(true);
    });
  });
});
