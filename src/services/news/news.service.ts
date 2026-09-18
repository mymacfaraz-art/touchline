// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: NEWS SERVICE
// Structured news generation & event-driven game world reporting
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { DomainEventBus } from '../../events/event-bus';
import { NewsCategory } from '@prisma/client';

export class NewsService {
  constructor() {
    this.registerEventSubscriptions();
  }

  private registerEventSubscriptions(): void {
    const bus = DomainEventBus.getInstance();

    bus.subscribe('MatchCompleted', async (payload) => {
      await this.createNewsItem({
        careerId: payload.careerId,
        gameSeasonId: payload.gameSeasonId,
        category: NewsCategory.MATCH_RESULT,
        title: `${payload.homeClubName || 'Home'} ${payload.homeScore}–${payload.awayScore} ${payload.awayClubName || 'Away'}`,
        body: `Match finished: ${payload.homeClubName} vs ${payload.awayClubName} ended ${payload.homeScore}–${payload.awayScore}.`,
        relatedMatchId: payload.matchId,
        relatedClubId: payload.homeClubId,
      });
    });

    bus.subscribe('PlayerTransferred', async (payload) => {
      await this.createNewsItem({
        careerId: 'career-active',
        gameSeasonId: 'season-active',
        category: NewsCategory.TRANSFER,
        title: `Official Transfer: Player Transfer Completed`,
        body: `Player ${payload.playerId} transferred from ${payload.sourceClubId} to ${payload.destinationClubId} for £${(payload.fee / 1e6).toFixed(1)}M.`,
        relatedPlayerId: payload.playerId,
        relatedClubId: payload.destinationClubId,
      });
    });
  }

  public async createNewsItem(params: {
    careerId: string;
    gameSeasonId: string;
    category: NewsCategory;
    title: string;
    body: string;
    relatedClubId?: string;
    relatedPlayerId?: string;
    relatedMatchId?: string;
    sourceType?: string;
  }) {
    return await prisma.newsItem.create({
      data: {
        careerId: params.careerId,
        gameSeasonId: params.gameSeasonId,
        category: params.category,
        title: params.title,
        body: params.body,
        relatedClubId: params.relatedClubId,
        relatedPlayerId: params.relatedPlayerId,
        relatedMatchId: params.relatedMatchId,
        sourceType: params.sourceType || 'DETERMINISTIC_EVENT',
        narrativeVersion: 'v1.0',
      },
    });
  }

  public async getLatestNews(careerId: string, limit: number = 10) {
    return await prisma.newsItem.findMany({
      where: { careerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
