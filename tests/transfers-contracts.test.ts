// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 8: TRANSFERS, CONTRACTS & SQUAD MANAGEMENT TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferService, SquadManagementService } from '../src/services/transfers/transfer.service';
import { prisma } from '../src/lib/prisma';
import { RegistrationType } from '@prisma/client';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
    },
    playerClubRegistration: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    contract: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    clubSeasonState: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    playerCondition: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return cb;
    }),
  },
}));

describe('Phase 8: Transfers, Contracts & Squad Management', () => {
  let transferService: TransferService;
  let squadService: SquadManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    transferService = new TransferService();
    squadService = new SquadManagementService();
  });

  describe('Transfer Execution & Registration Updates', () => {
    it('executes a valid permanent transfer updating registration and contract', async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: 'player-mbappe',
        registrations: [
          {
            id: 'reg-psg',
            clubId: 'club-psg',
            isActive: true,
          },
        ],
        contracts: [
          {
            id: 'contract-psg',
            clubId: 'club-psg',
            status: 'ACTIVE',
          },
        ],
      } as any);

      vi.mocked(prisma.playerClubRegistration.update).mockResolvedValue({} as any);
      vi.mocked(prisma.contract.update).mockResolvedValue({} as any);

      vi.mocked(prisma.playerClubRegistration.create).mockResolvedValue({
        id: 'reg-rm-1',
        playerId: 'player-mbappe',
        clubId: 'club-rm',
      } as any);

      vi.mocked(prisma.contract.create).mockResolvedValue({
        id: 'contract-rm-1',
        playerId: 'player-mbappe',
        clubId: 'club-rm',
      } as any);

      vi.mocked(prisma.clubSeasonState.findUnique).mockImplementation((async (args: any) => {
        if (args.where.clubId_gameSeasonId.clubId === 'club-rm') {
          return { id: 'state-rm', transferBudget: 150000000 } as any;
        }
        if (args.where.clubId_gameSeasonId.clubId === 'club-psg') {
          return { id: 'state-psg', transferBudget: 20000000 } as any;
        }
        return null;
      }) as any);

      const result = await transferService.executeTransfer({
        playerId: 'player-mbappe',
        sourceClubId: 'club-psg',
        destinationClubId: 'club-rm',
        gameSeasonId: 'season-2025',
        transferFee: 80000000,
        weeklyWage: 500000,
        contractYears: 5,
      });

      expect(result.newRegistrationId).toBe('reg-rm-1');
      expect(result.newContractId).toBe('contract-rm-1');
      expect(prisma.playerClubRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reg-psg' },
          data: expect.objectContaining({ isActive: false }),
        })
      );
      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-psg' },
          data: expect.objectContaining({ status: 'TERMINATED' }),
        })
      );
      expect(prisma.clubSeasonState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'state-rm' },
          data: { transferBudget: 70000000 },
        })
      );
    });

    it('throws an error if player is not actively registered with source club', async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: 'player-mbappe',
        registrations: [],
        contracts: [],
      } as any);

      await expect(
        transferService.executeTransfer({
          playerId: 'player-mbappe',
          sourceClubId: 'club-psg',
          destinationClubId: 'club-rm',
          gameSeasonId: 'season-2025',
          transferFee: 5000000,
          weeklyWage: 10000,
          contractYears: 3,
        })
      ).rejects.toThrow(/not actively registered/);
    });
  });

  describe('Free Agent Signings', () => {
    it('successfully signs a player without active registration', async () => {
      vi.mocked(prisma.playerClubRegistration.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.playerClubRegistration.create).mockResolvedValue({
        id: 'reg-free-1',
      } as any);

      vi.mocked(prisma.contract.create).mockResolvedValue({
        id: 'contract-free-1',
      } as any);

      const res = await transferService.signFreeAgent({
        playerId: 'player-free',
        destinationClubId: 'club-milan',
        gameSeasonId: 'season-2025',
        weeklyWage: 20000,
        contractYears: 2,
      });

      expect(res.registrationId).toBe('reg-free-1');
      expect(res.contractId).toBe('contract-free-1');
      expect(prisma.playerClubRegistration.create).toHaveBeenCalled();
    });

    it('rejects signing free agent if already actively registered elsewhere', async () => {
      vi.mocked(prisma.playerClubRegistration.findFirst).mockResolvedValue({
        id: 'reg-active',
        clubId: 'club-other',
      } as any);

      await expect(
        transferService.signFreeAgent({
          playerId: 'player-taken',
          destinationClubId: 'club-milan',
          gameSeasonId: 'season-2025',
          weeklyWage: 20000,
          contractYears: 2,
        })
      ).rejects.toThrow(/already has an active registration/);
    });
  });

  describe('Squad Management Resolution', () => {
    it('retrieves squad list with condition and availability calculation', async () => {
      vi.mocked(prisma.playerClubRegistration.findMany).mockResolvedValue([
        {
          id: 'reg-1',
          clubId: 'club-arsenal',
          registrationType: RegistrationType.PERMANENT,
          player: {
            id: 'player-saka',
            firstName: 'Bukayo',
            lastName: 'Saka',
            shortName: 'B. Saka',
            primaryPosition: 'RW',
            nationality: 'ENG',
            injuries: [],
            suspensions: [],
            contracts: [{ weeklyWage: 195000, expiresAt: new Date('2028-06-30') }],
          },
        },
      ] as any);

      vi.mocked(prisma.playerCondition.findMany).mockResolvedValue([
        {
          playerId: 'player-saka',
          fitness: 96,
          fatigue: 4,
          form: 88,
          morale: 90,
        } as any,
      ]);

      const squad = await squadService.getSquad('club-arsenal', 'season-2025');

      expect(squad).toHaveLength(1);
      expect(squad[0].shortName).toBe('B. Saka');
      expect(squad[0].wage).toBe(195000);
      expect(squad[0].fitness).toBe(96);
      expect(squad[0].isAvailable).toBe(true);
    });
  });
});
