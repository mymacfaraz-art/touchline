import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MatchService } from '@/services/match.service';
import { MatchdayOrchestrator } from '@/orchestration/matchday-orchestrator';

const matchService = new MatchService();
const orchestrator = new MatchdayOrchestrator();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionSeasonId = searchParams.get('competitionSeasonId');
    const matchId = searchParams.get('matchId');
    const clubId = searchParams.get('clubId');

    if (matchId) {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          fixture: {
            include: {
              homeClub: true,
              awayClub: true,
            },
          },
          statistics: true,
          events: {
            orderBy: { minute: 'asc' },
          },
          playerPerformances: {
            include: {
              player: true,
            },
          },
        },
      });

      if (!match) {
        return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, match });
    }

    const where: any = {};
    if (competitionSeasonId) {
      where.fixture = {
        competitionPhase: {
          competitionSeasonId,
        },
      };
    }
    if (clubId) {
      where.fixture = {
        ...where.fixture,
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
      };
    }

    const matches = await prisma.match.findMany({
      where,
      orderBy: { simulatedAt: 'desc' },
      take: 100,
      include: {
        fixture: {
          include: {
            homeClub: true,
            awayClub: true,
          },
        },
        statistics: true,
      },
    });

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'simulate_match') {
      const { fixtureId, seed } = body;

      if (fixtureId) {
        const result = await orchestrator.orchestrateMatchday({
          fixtureId,
          seedOverride: seed,
        });
        return NextResponse.json({ success: true, result });
      }

      const { homeTeam, awayTeam, competitionSeasonId, competitionPhaseId } = body;
      if (!homeTeam || !awayTeam) {
        return NextResponse.json({ success: false, error: 'Missing homeTeam or awayTeam data' }, { status: 400 });
      }

      const simulationResult = await matchService.executeMatchSimulation({
        matchId: `sim-${Date.now()}`,
        seed: seed || `seed-${Date.now()}`,
        competitionSeasonId: competitionSeasonId || 'cs-default',
        competitionPhaseId: competitionPhaseId || 'phase-league',
        homeTeam,
        awayTeam,
      });

      return NextResponse.json({ success: true, result: simulationResult });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in matches POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
