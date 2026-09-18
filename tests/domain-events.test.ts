// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: DOMAIN EVENT BUS TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainEventBus } from '../src/events/event-bus';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    domainEventLog: {
      create: vi.fn(),
    },
  },
}));

describe('Phase 10: In-Process Domain Event Bus', () => {
  let bus: DomainEventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    bus = DomainEventBus.getInstance();
    bus.clearAllListeners();
  });

  it('publishes events to subscribers and writes to DomainEventLog', async () => {
    const callback = vi.fn();
    bus.subscribe('MatchCompleted', callback);

    vi.mocked(prisma.domainEventLog.create).mockResolvedValue({} as any);

    await bus.publish('MatchCompleted', 'career-100', {
      matchId: 'match-1',
      fixtureId: 'fix-1',
      careerId: 'career-100',
      gameSeasonId: 'season-1',
      homeClubId: 'club-1',
      awayClubId: 'club-2',
      homeScore: 2,
      awayScore: 0,
      homeClubName: 'Arsenal',
      awayClubName: 'Chelsea',
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match-1',
        homeScore: 2,
        awayScore: 0,
      })
    );
    expect(prisma.domainEventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          careerId: 'career-100',
          eventType: 'MatchCompleted',
        }),
      })
    );
  });
});
