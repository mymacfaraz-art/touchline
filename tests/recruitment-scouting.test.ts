// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: RECRUITMENT & SCOUTING TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoutingService } from '../src/ai/scouting/scouting.service';
import { RecruitmentAIService } from '../src/ai/recruitment/recruitment-ai.service';
import { prisma } from '../src/lib/prisma';
import { ConfidenceLevel } from '@prisma/client';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
    },
    scoutingReport: {
      create: vi.fn(),
    },
    clubSeasonState: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Phase 10: Recruitment & Scouting Engine', () => {
  let scoutingService: ScoutingService;
  let recruitmentService: RecruitmentAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    scoutingService = new ScoutingService();
    recruitmentService = new RecruitmentAIService();
  });

  describe('Scouting Confidence & Delineation', () => {
    it('assigns KNOWN confidence to a player belonging to the scouting club', async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: 'player-1',
        shortName: 'B. Saka',
        primaryPosition: 'RW',
        dateOfBirth: new Date('2001-09-05'),
        registrations: [{ club: { id: 'club-arsenal', name: 'Arsenal' } }],
        attributes: { passing: 85, finishing: 84, pace: 88, stamina: 86, composure: 85 },
        potential: { potentialAbility: 180 },
      } as any);

      vi.mocked(prisma.scoutingReport.create).mockResolvedValue({} as any);

      const report = await scoutingService.generateReport({
        careerId: 'career-1',
        playerId: 'player-1',
        targetClubId: 'club-arsenal',
      });

      expect(report.confidence).toBe(ConfidenceLevel.KNOWN);
      expect(report.knownAttributes.passing).toBe(85);
      expect(prisma.scoutingReport.create).toHaveBeenCalled();
    });
  });

  describe('Deterministic Recruitment Evaluation', () => {
    it('recommends MUST_BUY for high OVR player within budget', async () => {
      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: 'player-star',
        shortName: 'K. Mbappe',
        attributes: { passing: 88, finishing: 92, pace: 97, stamina: 88, composure: 89 },
        potential: { potentialAbility: 190 },
      } as any);

      vi.mocked(prisma.clubSeasonState.findUnique).mockResolvedValue({
        transferBudget: 200000000,
      } as any);

      const evalResult = await recruitmentService.evaluatePlayerTarget(
        'player-star',
        'club-realmadrid',
        'season-1'
      );

      expect(evalResult.recommendedAction).toBe('MUST_BUY');
      expect(evalResult.suitabilityScore).toBe(90);
    });
  });
});
