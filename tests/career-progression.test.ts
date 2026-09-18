// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 7: CAREER & SEASON PROGRESSION INTEGRATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CareerService, SeasonProgressionService } from '../src/services/career/career.service';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    career: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    gameSeason: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    manager: {
      create: vi.fn(),
    },
    competitionSeason: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    competitionPhase: {
      findMany: vi.fn(),
    },
    seasonClubParticipation: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    club: {
      findMany: vi.fn(),
    },
    clubSeasonState: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    fixture: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return cb;
    }),
  },
}));

describe('Phase 7: Career & Season Progression Service', () => {
  let careerService: CareerService;
  let seasonProgressionService: SeasonProgressionService;

  beforeEach(() => {
    vi.clearAllMocks();
    careerService = new CareerService();
    seasonProgressionService = new SeasonProgressionService();
  });

  describe('Career Creation & Isolation', () => {
    it('creates a new career and initializes the game season and manager', async () => {
      vi.mocked(prisma.career.create).mockResolvedValue({
        id: 'career-100',
        name: 'Manager Journey',
        userId: 'user-1',
      } as any);

      vi.mocked(prisma.gameSeason.create).mockResolvedValue({
        id: 'season-1',
        careerId: 'career-100',
        yearStart: 2025,
        yearEnd: 2026,
        isCurrent: true,
        isComplete: false,
      } as any);

      vi.mocked(prisma.career.update).mockResolvedValue({
        id: 'career-100',
        currentGameSeasonId: 'season-1',
      } as any);

      vi.mocked(prisma.manager.create).mockResolvedValue({
        id: 'mgr-1',
        userId: 'user-1',
        firstName: 'Pep',
        lastName: 'Guardiola',
      } as any);

      vi.mocked(prisma.club.findMany).mockResolvedValue([
        { id: 'club-mancity', name: 'Manchester City' },
      ] as any);

      vi.mocked(prisma.clubSeasonState.create).mockResolvedValue({} as any);

      const result = await careerService.createCareer({
        userId: 'user-1',
        name: 'Manager Journey',
        managerName: 'Pep Guardiola',
        selectedClubId: 'club-mancity',
        startYear: 2025,
      });

      expect(result.careerId).toBe('career-100');
      expect(result.gameSeasonId).toBe('season-1');
      expect(prisma.career.create).toHaveBeenCalled();
      expect(prisma.gameSeason.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            careerId: 'career-100',
            yearStart: 2025,
            isCurrent: true,
          }),
        })
      );
    });
  });

  describe('Standings and Tie-Breaking Logic', () => {
    it('correctly calculates points, goal difference, and sorts standings hierarchically', async () => {
      const mockParticipations = [
        {
          id: 'part-1',
          clubId: 'club-arsenal',
          club: { id: 'club-arsenal', name: 'Arsenal', code: 'ARS' },
          played: 10,
          won: 7,
          drawn: 2,
          lost: 1,
          goalsFor: 22,
          goalsAgainst: 8,
          points: 23,
          promotionStatus: null,
        },
        {
          id: 'part-2',
          clubId: 'club-chelsea',
          club: { id: 'club-chelsea', name: 'Chelsea', code: 'CHE' },
          played: 10,
          won: 7,
          drawn: 2,
          lost: 1,
          goalsFor: 20,
          goalsAgainst: 10,
          points: 23,
          promotionStatus: null,
        },
        {
          id: 'part-3',
          clubId: 'club-everton',
          club: { id: 'club-everton', name: 'Everton', code: 'EVE' },
          played: 10,
          won: 2,
          drawn: 3,
          lost: 5,
          goalsFor: 10,
          goalsAgainst: 18,
          points: 9,
          promotionStatus: null,
        },
      ];

      vi.mocked(prisma.seasonClubParticipation.findMany).mockResolvedValue(mockParticipations as any);

      const standings = await seasonProgressionService.getStandings('cs-pl-2025');

      expect(standings).toHaveLength(3);
      // Arsenal and Chelsea both have 23 points, but Arsenal has +14 GD vs +10 GD
      expect(standings[0].clubId).toBe('club-arsenal');
      expect(standings[0].goalDifference).toBe(14);
      expect(standings[1].clubId).toBe('club-chelsea');
      expect(standings[1].goalDifference).toBe(10);
      expect(standings[2].clubId).toBe('club-everton');
      expect(standings[2].goalDifference).toBe(-8);
    });
  });

  describe('Matchday Advancement Calendar', () => {
    it('advances matchday for all scheduled fixtures in the round', async () => {
      vi.mocked(prisma.competitionPhase.findMany).mockResolvedValue([
        {
          id: 'phase-1',
          order: 1,
          fixtures: [
            {
              id: 'fix-1',
              matchWeek: 1,
              status: 'SCHEDULED',
              matchDate: new Date('2025-08-15'),
            },
          ],
        },
      ] as any);

      vi.mocked(prisma.fixture.count).mockResolvedValue(0);

      const mockOrchestrator = {
        orchestrateMatchday: vi.fn().mockResolvedValue({
          fixtureId: 'fix-1',
          homeClubId: 'club-arsenal',
          awayClubId: 'club-chelsea',
          homeScore: 2,
          awayScore: 1,
        }),
      } as any;

      const progressionService = new SeasonProgressionService(mockOrchestrator);
      const res = await progressionService.advanceToNextMatchday({
        competitionSeasonId: 'cs-pl-2025',
        matchWeek: 1,
      });

      expect(res.simulatedFixturesCount).toBe(1);
      expect(res.completedFixtures).toHaveLength(1);
      expect(res.completedFixtures[0].homeScore).toBe(2);
      expect(res.isSeasonComplete).toBe(true);
    });
  });
});
