// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 9: TRAINING, PLAYER DEVELOPMENT & CLUB SYSTEMS TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerDevelopmentService } from '../src/services/development/development.service';
import { prisma } from '../src/lib/prisma';
import { AttributeChangeReason } from '@prisma/client';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
    },
    playerAttributes: {
      update: vi.fn(),
    },
    playerAttributeSnapshot: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    playerCondition: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    playerClubRegistration: {
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

describe('Phase 9: Training & Player Development Engine', () => {
  let devService: PlayerDevelopmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    devService = new PlayerDevelopmentService();
  });

  describe('Strict Bounds & Clamping Verification', () => {
    it('strictly clamps individual attributes between [1, 99]', () => {
      expect(PlayerDevelopmentService.clampAttribute(0)).toBe(1);
      expect(PlayerDevelopmentService.clampAttribute(-10)).toBe(1);
      expect(PlayerDevelopmentService.clampAttribute(100)).toBe(99);
      expect(PlayerDevelopmentService.clampAttribute(150)).toBe(99);
      expect(PlayerDevelopmentService.clampAttribute(85)).toBe(85);
    });

    it('strictly clamps Touchline OVR between [1, 91]', () => {
      expect(PlayerDevelopmentService.clampOVR(0)).toBe(1);
      expect(PlayerDevelopmentService.clampOVR(-5)).toBe(1);
      expect(PlayerDevelopmentService.clampOVR(92)).toBe(91);
      expect(PlayerDevelopmentService.clampOVR(99)).toBe(91);
      expect(PlayerDevelopmentService.clampOVR(88)).toBe(88);
    });
  });

  describe('Age Curve Logic', () => {
    it('gives young players high growth multipliers and declining growth to veterans', () => {
      const growth19 = PlayerDevelopmentService.calculateAgeFactor(19);
      const growth23 = PlayerDevelopmentService.calculateAgeFactor(23);
      const prime27 = PlayerDevelopmentService.calculateAgeFactor(27);
      const declining33 = PlayerDevelopmentService.calculateAgeFactor(33);
      const late37 = PlayerDevelopmentService.calculateAgeFactor(37);

      expect(growth19).toBeGreaterThan(growth23);
      expect(growth23).toBeGreaterThan(prime27);
      expect(declining33).toBeLessThan(0);
      expect(late37).toBeLessThan(declining33);
    });
  });

  describe('Deterministic Attribute Progression', () => {
    it('progresses a young talent based on age, performance, and potential head-room', async () => {
      const mockPlayer = {
        id: 'player-wonderkid',
        dateOfBirth: new Date('2006-03-15'), // Age ~20 in 2026
        primaryPosition: 'ST',
        potential: { potentialAbility: 180, peakAgeStart: 25, peakAgeEnd: 30 },
        attributes: {
          id: 'attr-1',
          overallRating: 75,
          finishing: 76,
          pace: 82,
          acceleration: 83,
          stamina: 74,
          dribbling: 78,
          composure: 72,
        },
      };

      vi.mocked(prisma.player.findUnique).mockResolvedValue(mockPlayer as any);
      vi.mocked(prisma.playerAttributes.update).mockResolvedValue({} as any);
      vi.mocked(prisma.playerAttributeSnapshot.create).mockResolvedValue({} as any);

      const result = await devService.processPlayerDevelopment({
        playerId: 'player-wonderkid',
        gameSeasonId: 'season-2025',
        minutesPlayed: 1800,
        matchRatingAvg: 7.8,
        trainingIntensity: 'HEAVY',
        reason: AttributeChangeReason.TRAINING,
        referenceDate: new Date('2026-06-01'),
      });

      expect(result.updatedCount).toBeGreaterThan(0);
      expect(result.snapshotsCreated).toBeGreaterThan(0);
      expect(prisma.playerAttributes.update).toHaveBeenCalled();
      expect(prisma.playerAttributeSnapshot.create).toHaveBeenCalled();
    });
  });

  describe('Club Training Sessions', () => {
    it('executes squad-wide training sessions updating condition and fatigue', async () => {
      vi.mocked(prisma.playerClubRegistration.findMany).mockResolvedValue([
        {
          id: 'reg-1',
          playerId: 'p-1',
          clubId: 'club-liverpool',
          gameSeasonId: 'season-2025',
          isActive: true,
        },
      ] as any);

      vi.mocked(prisma.playerCondition.findUnique).mockResolvedValue({
        id: 'cond-1',
        playerId: 'p-1',
        gameSeasonId: 'season-2025',
        fitness: 90,
        fatigue: 10,
        sharpness: 80,
      } as any);

      vi.mocked(prisma.playerCondition.update).mockResolvedValue({} as any);

      const res = await devService.runTeamTrainingSession({
        clubId: 'club-liverpool',
        gameSeasonId: 'season-2025',
        intensity: 'HEAVY',
        focus: 'BALANCED',
      });

      expect(res.playersTrained).toBe(1);
      expect(res.intensity).toBe('HEAVY');
      expect(prisma.playerCondition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cond-1' },
          data: expect.objectContaining({
            fatigue: 22,
            sharpness: 86,
            fitness: 86,
          }),
        })
      );
    });
  });
});
