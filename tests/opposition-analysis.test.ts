// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: OPPOSITION ANALYSIS TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OppositionAnalysisService } from '../src/ai/scouting/opposition-analysis.service';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    club: {
      findUnique: vi.fn(),
    },
    fixture: {
      findMany: vi.fn(),
    },
  },
}));

describe('Phase 10: Opposition Analysis Service', () => {
  let oppositionService: OppositionAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    oppositionService = new OppositionAnalysisService();
  });

  it('returns INSUFFICIENT_DATA if fewer than 3 completed matches exist', async () => {
    vi.mocked(prisma.club.findUnique).mockResolvedValue({ id: 'club-1', name: 'Arsenal' } as any);
    vi.mocked(prisma.fixture.findMany).mockResolvedValue([
      {
        id: 'fix-1',
        homeClubId: 'club-1',
        awayClubId: 'club-2',
        match: { homeScore: 2, awayScore: 1 },
      },
    ] as any);

    const report = await oppositionService.analyzeOpponent('club-1', 'season-1');

    expect(report.dataQuality).toBe('INSUFFICIENT_DATA');
    expect(report.sampleMatchesCount).toBe(1);
  });

  it('computes win rate and scoring statistics when sufficient match data exists', async () => {
    vi.mocked(prisma.club.findUnique).mockResolvedValue({ id: 'club-1', name: 'Arsenal' } as any);
    vi.mocked(prisma.fixture.findMany).mockResolvedValue([
      { id: 'f1', homeClubId: 'club-1', awayClubId: 'c2', match: { homeScore: 3, awayScore: 1 } },
      { id: 'f2', homeClubId: 'club-1', awayClubId: 'c3', match: { homeScore: 2, awayScore: 0 } },
      { id: 'f3', homeClubId: 'c4', awayClubId: 'club-1', match: { homeScore: 1, awayScore: 2 } },
    ] as any);

    const report = await oppositionService.analyzeOpponent('club-1', 'season-1');

    expect(report.dataQuality).toBe('SUFFICIENT_DATA');
    expect(report.sampleMatchesCount).toBe(3);
    expect(report.winRate).toBe(1.0);
    expect(report.averageGoalsScored).toBe(2.33);
    expect(report.averageGoalsConceded).toBe(0.67);
  });
});
