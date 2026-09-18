// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: BOARD OBJECTIVES & MORALE TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardObjectivesService } from '../src/services/board/board-objectives.service';
import { DressingRoomService } from '../src/services/morale/dressing-room.service';
import { prisma } from '../src/lib/prisma';
import { ObjectiveStatus } from '@prisma/client';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    boardObjective: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    clubSeasonState: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    playerClubRegistration: {
      findMany: vi.fn(),
    },
    playerCondition: {
      findMany: vi.fn(),
    },
    playerRelationship: {
      upsert: vi.fn(),
    },
    domainEventLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (arr) => arr),
  },
}));

describe('Phase 10: Board Objectives & Dressing Room Morale', () => {
  let boardService: BoardObjectivesService;
  let dressingRoomService: DressingRoomService;

  beforeEach(() => {
    vi.clearAllMocks();
    boardService = new BoardObjectivesService();
    dressingRoomService = new DressingRoomService();
  });

  describe('Board Objectives Evaluation', () => {
    it('marks league position objective as ACHIEVED when current position is within target', async () => {
      vi.mocked(prisma.boardObjective.findMany).mockResolvedValue([
        {
          id: 'obj-1',
          careerId: 'c1',
          gameSeasonId: 's1',
          clubId: 'club-1',
          title: 'Finish top 4',
          category: 'LEAGUE_POSITION',
          targetValue: 4,
          currentValue: 10,
          status: ObjectiveStatus.IN_PROGRESS,
          priority: 1,
        },
      ] as any);

      vi.mocked(prisma.boardObjective.update).mockResolvedValue({
        id: 'obj-1',
        title: 'Finish top 4',
        category: 'LEAGUE_POSITION',
        targetValue: 4,
        currentValue: 2,
        status: ObjectiveStatus.ACHIEVED,
        priority: 1,
      } as any);

      const res = await boardService.evaluateObjectives('c1', 's1', 'club-1', 2);

      expect(res[0].status).toBe(ObjectiveStatus.ACHIEVED);
      expect(prisma.boardObjective.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'obj-1' },
          data: expect.objectContaining({ status: ObjectiveStatus.ACHIEVED }),
        })
      );
    });
  });

  describe('Dressing Room Morale', () => {
    it('computes squad harmony level and updates club squadMorale', async () => {
      vi.mocked(prisma.playerClubRegistration.findMany).mockResolvedValue([
        { playerId: 'p1', player: { shortName: 'Player 1', personality: { professionalism: 18 } } },
        { playerId: 'p2', player: { shortName: 'Player 2', personality: { professionalism: 12 } } },
      ] as any);

      vi.mocked(prisma.playerCondition.findMany).mockResolvedValue([
        { playerId: 'p1', morale: 90 },
        { playerId: 'p2', morale: 86 },
      ] as any);

      vi.mocked(prisma.clubSeasonState.findUnique).mockResolvedValue({ id: 'css-1', squadMorale: 75 } as any);
      vi.mocked(prisma.clubSeasonState.update).mockResolvedValue({} as any);

      const harmony = await dressingRoomService.computeSquadHarmony('club-1', 's1');

      expect(harmony.squadMoraleAvg).toBe(88.0);
      expect(harmony.harmonyLevel).toBe('EXCELLENT');
      expect(harmony.keyLeadershipPlayers).toContain('Player 1');
      expect(prisma.clubSeasonState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { squadMorale: 88.0 },
        })
      );
    });
  });
});
