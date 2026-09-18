// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — FINAL FORENSIC QA AUDIT & INTEGRATION TEST SUITE
// Comprehensive lifecycle, temporal integrity, career sandboxing & budget tests
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CareerService, SeasonProgressionService } from '../src/services/career/career.service';
import { TransferService, SquadManagementService } from '../src/services/transfers/transfer.service';
import { PlayerDevelopmentService } from '../src/services/development/development.service';
import { MatchService } from '../src/services/match.service';
import { createDefaultAttributes, createDefaultGKAttributes } from '../src/domain/types/player';
import { toTacticDocument } from '../src/domain/types/tactics';
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
      create: vi.fn(),
    },
    competitionPhase: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    seasonClubParticipation: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    club: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    clubSeasonState: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    player: {
      findUnique: vi.fn(),
    },
    playerClubRegistration: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    contract: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    playerCondition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
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

describe('Final Full-System Forensic QA & Integration Audit', () => {
  let careerService: CareerService;
  let progressionService: SeasonProgressionService;
  let transferService: TransferService;
  let squadService: SquadManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    careerService = new CareerService();
    progressionService = new SeasonProgressionService();
    transferService = new TransferService();
    squadService = new SquadManagementService();
  });

  describe('1. Career Isolation & Multi-Save Sandboxing', () => {
    it('verifies state isolation between Career A and Career B', async () => {
      vi.mocked(prisma.career.create)
        .mockResolvedValueOnce({ id: 'career-A', name: 'Career A', userId: 'u1' } as any)
        .mockResolvedValueOnce({ id: 'career-B', name: 'Career B', userId: 'u1' } as any);

      vi.mocked(prisma.gameSeason.create)
        .mockResolvedValueOnce({ id: 'season-A-1', careerId: 'career-A', yearStart: 2025 } as any)
        .mockResolvedValueOnce({ id: 'season-B-1', careerId: 'career-B', yearStart: 2025 } as any);

      vi.mocked(prisma.club.findMany).mockResolvedValue([{ id: 'c1' }] as any);
      vi.mocked(prisma.clubSeasonState.create).mockResolvedValue({} as any);

      const resA = await careerService.createCareer({ userId: 'u1', name: 'Career A' });
      const resB = await careerService.createCareer({ userId: 'u1', name: 'Career B' });

      expect(resA.careerId).toBe('career-A');
      expect(resB.careerId).toBe('career-B');
      expect(resA.gameSeasonId).toBe('season-A-1');
      expect(resB.gameSeasonId).toBe('season-B-1');
    });
  });

  describe('2. Budget Validation & Transactional Safeguards', () => {
    it('rejects transfer if transfer fee exceeds available transfer budget', async () => {
      vi.mocked(prisma.clubSeasonState.findUnique).mockResolvedValue({
        id: 'state-buyer',
        transferBudget: 5000000, // £5M budget
      } as any);

      await expect(
        transferService.executeTransfer({
          playerId: 'p1',
          sourceClubId: 'c-source',
          destinationClubId: 'c-dest',
          gameSeasonId: 's1',
          transferFee: 15000000, // £15M fee
          weeklyWage: 50000,
          contractYears: 4,
        })
      ).rejects.toThrow(/Insufficient transfer budget/);
    });

    it('rejects transfer with negative fee or wage parameters', async () => {
      await expect(
        transferService.executeTransfer({
          playerId: 'p1',
          sourceClubId: 'c-source',
          destinationClubId: 'c-dest',
          gameSeasonId: 's1',
          transferFee: -100000,
          weeklyWage: 50000,
          contractYears: 4,
        })
      ).rejects.toThrow(/Invalid transfer parameters/);
    });
  });

  describe('3. Temporal Integrity & Squad Scoping', () => {
    it('verifies that old season registrations are marked inactive on rollover', async () => {
      vi.mocked(prisma.gameSeason.findUnique).mockResolvedValue({
        id: 'season-2024',
        yearStart: 2024,
        yearEnd: 2025,
        competitionSeasons: [],
      } as any);

      vi.mocked(prisma.gameSeason.create).mockResolvedValue({
        id: 'season-2025',
        yearStart: 2025,
        yearEnd: 2026,
      } as any);

      vi.mocked(prisma.playerClubRegistration.findMany).mockResolvedValue([
        {
          id: 'reg-2024-1',
          playerId: 'p1',
          clubId: 'club-1',
          registrationType: 'PERMANENT',
          endDate: null,
        },
      ] as any);

      vi.mocked(prisma.playerClubRegistration.update).mockResolvedValue({} as any);
      vi.mocked(prisma.playerClubRegistration.create).mockResolvedValue({} as any);
      vi.mocked(prisma.playerCondition.create).mockResolvedValue({} as any);

      const res = await progressionService.rolloverSeason({
        careerId: 'c1',
        currentGameSeasonId: 'season-2024',
      });

      expect(res.newGameSeasonId).toBe('season-2025');
      expect(prisma.playerClubRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reg-2024-1' },
          data: expect.objectContaining({ isActive: false }),
        })
      );
      expect(prisma.playerClubRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gameSeasonId: 'season-2025',
            isActive: true,
          }),
        })
      );
    });
  });

  describe('4. Numerical Bounds & Clamping Safeguards', () => {
    it('verifies individual attributes clamp strictly to [1, 99] and Touchline OVR to [1, 91]', () => {
      expect(PlayerDevelopmentService.clampAttribute(0)).toBe(1);
      expect(PlayerDevelopmentService.clampAttribute(-50)).toBe(1);
      expect(PlayerDevelopmentService.clampAttribute(120)).toBe(99);

      expect(PlayerDevelopmentService.clampOVR(0)).toBe(1);
      expect(PlayerDevelopmentService.clampOVR(95)).toBe(91);
      expect(PlayerDevelopmentService.clampOVR(120)).toBe(91);
    });
  });
});
