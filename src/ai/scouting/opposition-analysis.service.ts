// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: OPPOSITION ANALYSIS SERVICE
// Structured tactical opposition reports derived strictly from historical data
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { OppositionAnalysis } from '../../domain/types/advanced-ai';

export class OppositionAnalysisService {
  /**
   * Generates opposition analysis report from actual persisted match history.
   * Returns INSUFFICIENT_DATA if fewer than 3 historical matches are available.
   */
  public async analyzeOpponent(
    opponentClubId: string,
    gameSeasonId: string
  ): Promise<OppositionAnalysis> {
    const club = await prisma.club.findUnique({
      where: { id: opponentClubId },
      select: { id: true, name: true },
    });

    const opponentName = club?.name || 'Opposition Club';

    // Query recent completed matches for opponent
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'COMPLETED',
        OR: [{ homeClubId: opponentClubId }, { awayClubId: opponentClubId }],
      },
      include: {
        match: true,
      },
      take: 10,
      orderBy: { matchDate: 'desc' },
    });

    const completedMatches = fixtures.filter((f) => f.match !== null);

    if (completedMatches.length < 3) {
      return {
        opponentClubId,
        opponentName,
        dataQuality: 'INSUFFICIENT_DATA',
        sampleMatchesCount: completedMatches.length,
      };
    }

    let goalsScored = 0;
    let goalsConceded = 0;
    let wins = 0;

    for (const f of completedMatches) {
      const m = f.match!;
      const isHome = f.homeClubId === opponentClubId;
      const teamScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;

      goalsScored += teamScore;
      goalsConceded += oppScore;
      if (teamScore > oppScore) wins++;
    }

    const count = completedMatches.length;
    const winRate = Number((wins / count).toFixed(2));
    const averageGoalsScored = Number((goalsScored / count).toFixed(2));
    const averageGoalsConceded = Number((goalsConceded / count).toFixed(2));

    const vulnerabilityNote =
      averageGoalsConceded > 1.5
        ? 'Vulnerable against quick counter-attacks and wide crosses.'
        : 'Solid defensive record with low goals conceded.';

    return {
      opponentClubId,
      opponentName,
      dataQuality: 'SUFFICIENT_DATA',
      sampleMatchesCount: count,
      winRate,
      averageGoalsScored,
      averageGoalsConceded,
      pressingTendency: averageGoalsScored > 2.0 ? 'HIGH_PRESS' : 'BALANCED',
      vulnerabilityNote,
    };
  }
}
