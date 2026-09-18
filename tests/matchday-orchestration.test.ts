// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: MATCHDAY & SIMULATION ORCHESTRATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMatchSeed } from '../src/orchestration/seed/seed-generator';
import { SquadValidator } from '../src/orchestration/validation/squad-validator';
import { TacticsResolver } from '../src/orchestration/resolvers/tactics-resolver';
import { SimulationInputBuilder } from '../src/orchestration/input-builder/simulation-input-builder';
import { MatchService } from '../src/services/match.service';
import {
  FixtureAlreadyCompletedError,
  FixtureNotFoundError,
  InvalidSquadError,
  PlayerIneligibleError,
} from '../src/orchestration/errors/orchestration.errors';
import { DomainPlayer, createDefaultAttributes } from '../src/domain/types/player';
import { SquadSelection } from '../src/orchestration/types/orchestration.types';
import { prisma } from '../src/lib/prisma';

// Mock Prisma module for deterministic unit testing
vi.mock('../src/lib/prisma', () => {
  return {
    prisma: {
      fixture: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      playerClubRegistration: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      playerCondition: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      savedTactic: {
        findFirst: vi.fn(),
      },
      match: {
        create: vi.fn(),
      },
      matchStatistics: {
        create: vi.fn(),
      },
      matchEvent: {
        createMany: vi.fn(),
      },
      playerMatchPerformance: {
        create: vi.fn(),
      },
      playerCompetitionStats: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      seasonClubParticipation: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)),
    },
  };
});

describe('Phase 4 — Matchday & Simulation Orchestration', () => {
  let squadValidator: SquadValidator;
  let tacticsResolver: TacticsResolver;
  let inputBuilder: SimulationInputBuilder;

  beforeEach(() => {
    vi.clearAllMocks();
    squadValidator = new SquadValidator();
    tacticsResolver = new TacticsResolver();
    inputBuilder = new SimulationInputBuilder();
  });

  describe('1. Seed Generation Policy', () => {
    it('generates identical seed strings for identical fixture and season IDs', () => {
      const seed1 = generateMatchSeed('fix-100', 'season-2026');
      const seed2 = generateMatchSeed('fix-100', 'season-2026');

      expect(seed1).toEqual(seed2);
      expect(seed1).toContain('seed-v1-');
    });

    it('generates different seeds for different fixtures or seasons', () => {
      const seed1 = generateMatchSeed('fix-100', 'season-2026');
      const seed2 = generateMatchSeed('fix-101', 'season-2026');
      const seed3 = generateMatchSeed('fix-100', 'season-2027');

      expect(seed1).not.toEqual(seed2);
      expect(seed1).not.toEqual(seed3);
    });

    it('respects explicit seed overrides', () => {
      const seed = generateMatchSeed('fix-100', 'season-2026', 'custom-seed-999');
      expect(seed).toBe('custom-seed-999');
    });
  });

  describe('2. Squad Validation Invariants', () => {
    const createMockPlayer = (id: string, pos: any): DomainPlayer => ({
      id,
      firstName: `Player`,
      lastName: id,
      shortName: id,
      dateOfBirth: new Date('2000-01-01'),
      nationality: 'ENG',
      primaryPosition: pos,
      secondaryPositions: [],
      preferredFoot: 'RIGHT',
      height: 180,
      isActive: true,
      attributes: createDefaultAttributes(60),
    });

    it('validates a valid starting XI with exactly 1 GK', () => {
      const eligibilityMap = new Map();
      const startingXI: any[] = [
        { playerId: 'p-gk', position: 'GK', role: 'GOALKEEPER', isStarting: true },
        { playerId: 'p-lb', position: 'LB', role: 'FULL_BACK', isStarting: true },
        { playerId: 'p-cb1', position: 'CB', role: 'CENTRAL_DEFENDER', isStarting: true },
        { playerId: 'p-cb2', position: 'CB', role: 'CENTRAL_DEFENDER', isStarting: true },
        { playerId: 'p-rb', position: 'RB', role: 'FULL_BACK', isStarting: true },
        { playerId: 'p-cdm', position: 'CDM', role: 'DEFENSIVE_MIDFIELDER', isStarting: true },
        { playerId: 'p-cm1', position: 'CM', role: 'CENTRAL_MIDFIELDER', isStarting: true },
        { playerId: 'p-cm2', position: 'CM', role: 'BOX_TO_BOX', isStarting: true },
        { playerId: 'p-lw', position: 'LW', role: 'WINGER', isStarting: true },
        { playerId: 'p-st', position: 'ST', role: 'CENTRE_FORWARD', isStarting: true },
        { playerId: 'p-rw', position: 'RW', role: 'WINGER', isStarting: true },
      ];

      startingXI.forEach((p) => {
        eligibilityMap.set(p.playerId, {
          playerId: p.playerId,
          isEligible: true,
          isRegistered: true,
          isInjured: false,
          isSuspended: false,
          reasons: [],
        });
      });

      const squad: SquadSelection = { clubId: 'club-1', startingXI, bench: [] };

      expect(() =>
        squadValidator.validateSquadSelection('club-1', squad, eligibilityMap)
      ).not.toThrow();
    });

    it('rejects squad selections with fewer than 11 starters', () => {
      const squad: SquadSelection = {
        clubId: 'club-1',
        startingXI: [
          { playerId: 'p-gk', position: 'GK', role: 'GOALKEEPER', isStarting: true },
        ],
        bench: [],
      };

      expect(() =>
        squadValidator.validateSquadSelection('club-1', squad, new Map())
      ).toThrow(InvalidSquadError);
    });

    it('rejects squad selections without a goalkeeper', () => {
      const eligibilityMap = new Map();
      const startingXI: any[] = Array.from({ length: 11 }, (_, i) => ({
        playerId: `p-${i}`,
        position: 'CB',
        role: 'CENTRAL_DEFENDER',
        isStarting: true,
      }));

      startingXI.forEach((p) => {
        eligibilityMap.set(p.playerId, {
          playerId: p.playerId,
          isEligible: true,
          isRegistered: true,
          isInjured: false,
          isSuspended: false,
          reasons: [],
        });
      });

      const squad: SquadSelection = { clubId: 'club-1', startingXI, bench: [] };

      expect(() =>
        squadValidator.validateSquadSelection('club-1', squad, eligibilityMap)
      ).toThrow(InvalidSquadError);
    });

    it('rejects squad selections containing ineligible (injured/suspended) players', () => {
      const eligibilityMap = new Map();
      const startingXI: any[] = [
        { playerId: 'p-gk', position: 'GK', role: 'GOALKEEPER', isStarting: true },
      ];
      for (let i = 1; i < 11; i++) {
        startingXI.push({
          playerId: `p-${i}`,
          position: i === 1 ? 'LB' : 'CB',
          role: 'CENTRAL_DEFENDER',
          isStarting: true,
        });
      }

      startingXI.forEach((p) => {
        eligibilityMap.set(p.playerId, {
          playerId: p.playerId,
          isEligible: p.playerId !== 'p-gk', // GK is ineligible!
          isRegistered: true,
          isInjured: p.playerId === 'p-gk',
          isSuspended: false,
          reasons: ['Injured: Muscle strain'],
        });
      });

      const squad: SquadSelection = { clubId: 'club-1', startingXI, bench: [] };

      expect(() =>
        squadValidator.validateSquadSelection('club-1', squad, eligibilityMap)
      ).toThrow(PlayerIneligibleError);
    });
  });

  describe('3. Auto Squad Selection', () => {
    it('automatically builds a valid 11-player starting XI + bench from eligible pool', () => {
      const positions: any[] = ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW', 'ST', 'CM', 'CB'];
      const eligiblePlayers: DomainPlayer[] = positions.map((pos, idx) => ({
        id: `p-${idx}`,
        firstName: `Player`,
        lastName: `${idx}`,
        shortName: `P${idx}`,
        dateOfBirth: new Date('2000-01-01'),
        nationality: 'ENG',
        primaryPosition: pos,
        secondaryPositions: [],
        preferredFoot: 'RIGHT',
        height: 180,
        isActive: true,
        attributes: createDefaultAttributes(60 + idx),
      }));

      const defaultTactics = tacticsResolver.createDefaultTactics();
      const selectedSquad = squadValidator.autoSelectSquad('club-1', eligiblePlayers, defaultTactics);

      expect(selectedSquad.startingXI).toHaveLength(11);
      expect(selectedSquad.bench.length).toBeGreaterThan(0);
      
      const gks = selectedSquad.startingXI.filter((p) => p.position === 'GK');
      expect(gks).toHaveLength(11 === 11 ? 1 : 0);
    });
  });

  describe('4. End-to-End Matchday Orchestrator', () => {
    it('throws FixtureNotFoundError when given an invalid fixtureId', async () => {
      (prisma.fixture.findUnique as any).mockResolvedValue(null);

      const service = new MatchService();
      await expect(
        service.orchestrateMatchday({ fixtureId: 'non-existent-fix' })
      ).rejects.toThrow(FixtureNotFoundError);
    });

    it('throws FixtureAlreadyCompletedError when fixture is already completed', async () => {
      (prisma.fixture.findUnique as any).mockResolvedValue({
        id: 'fix-1',
        status: 'COMPLETED',
        match: { id: 'match-1' },
      });

      const service = new MatchService();
      await expect(
        service.orchestrateMatchday({ fixtureId: 'fix-1' })
      ).rejects.toThrow(FixtureAlreadyCompletedError);
    });

    it('successfully orchestrates a valid scheduled fixture', async () => {
      const mockFixture = {
        id: 'fix-200',
        homeClubId: 'home-club',
        awayClubId: 'away-club',
        matchDate: new Date('2026-10-15'),
        status: 'SCHEDULED',
        isNeutralVenue: false,
        competitionPhaseId: 'phase-1',
        competitionPhase: {
          phaseType: 'LEAGUE_ROUNDS',
          competitionSeasonId: 'comp-season-1',
          competitionSeason: {
            gameSeasonId: 'game-season-2026',
          },
        },
        homeClub: { name: 'Home FC' },
        awayClub: { name: 'Away FC' },
        match: null,
      };

      (prisma.fixture.findUnique as any).mockResolvedValue(mockFixture);

      // Mock Squad Resolver data (12 registered players per team)
      const mockRegs = (clubId: string) =>
        ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW', 'CM'].map(
          (pos, i) => ({
            playerId: `${clubId}-p${i}`,
            player: {
              id: `${clubId}-p${i}`,
              firstName: 'Test',
              lastName: `Player ${i}`,
              shortName: `P${i}`,
              dateOfBirth: new Date('1998-05-10'),
              nationality: 'ENG',
              primaryPosition: pos,
              secondaryPositions: [],
              preferredFoot: 'RIGHT',
              height: 182,
              isActive: true,
              attributes: {
                passing: 65, longPassing: 60, crossing: 55, finishing: 60,
                firstTouch: 65, dribbling: 60, ballControl: 65, heading: 60,
                tackling: 60, marking: 60, freeKick: 50, penaltyTaking: 50,
                acceleration: 70, pace: 70, stamina: 75, strength: 70,
                agility: 70, balance: 70, jumping: 70, naturalFitness: 70,
                composure: 65, decisions: 65, vision: 65, anticipation: 65,
                positioning: 65, concentration: 65, workRate: 70, aggression: 60,
                leadership: 60, teamwork: 70, adaptability: 65,
                gkReflexes: pos === 'GK' ? 75 : null,
                gkHandling: pos === 'GK' ? 70 : null,
                gkPositioning: pos === 'GK' ? 70 : null,
                gkKicking: pos === 'GK' ? 65 : null,
                gkCommunication: pos === 'GK' ? 65 : null,
              },
              injuries: [],
              suspensions: [],
            },
          })
        );

      (prisma.playerClubRegistration.findMany as any).mockImplementation(({ where }: any) => {
        return Promise.resolve(mockRegs(where.clubId));
      });

      (prisma.playerCondition.findMany as any).mockResolvedValue([]);
      (prisma.savedTactic.findFirst as any).mockResolvedValue(null);

      // Mock DB Transaction writes
      (prisma.match.create as any).mockResolvedValue({ id: 'created-match-id' });
      (prisma.fixture.update as any).mockResolvedValue({});
      (prisma.matchStatistics.create as any).mockResolvedValue({});
      (prisma.matchEvent.createMany as any).mockResolvedValue({});
      (prisma.playerMatchPerformance.create as any).mockResolvedValue({});
      (prisma.seasonClubParticipation.findUnique as any).mockResolvedValue({
        id: 'part-id',
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
      });
      (prisma.seasonClubParticipation.update as any).mockResolvedValue({});

      const service = new MatchService();
      const result = await service.orchestrateMatchday({
        fixtureId: 'fix-200',
        seedOverride: 'test-seed-123',
      });

      expect(result.fixtureId).toBe('fix-200');
      expect(result.matchId).toBe('created-match-id');
      expect(result.homeClubId).toBe('home-club');
      expect(result.awayClubId).toBe('away-club');
      expect(result.seed).toBe('test-seed-123');
      expect(result.persistenceSuccess).toBe(true);
      expect(result.simulationResult).toBeDefined();
      expect(result.simulationResult.homeScore).toBeGreaterThanOrEqual(0);
      expect(result.simulationResult.awayScore).toBeGreaterThanOrEqual(0);

      expect(prisma.match.create).toHaveBeenCalled();
      expect(prisma.fixture.update).toHaveBeenCalledWith({
        where: { id: 'fix-200' },
        data: { status: 'COMPLETED' },
      });
    });
  });
});
