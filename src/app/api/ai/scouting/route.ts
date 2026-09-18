import { NextResponse } from 'next/server';
import { ScoutingService } from '@/ai/scouting/scouting.service';
import { OppositionAnalysisService } from '@/ai/scouting/opposition-analysis.service';
import { RecruitmentAIService } from '@/ai/recruitment/recruitment-ai.service';

const scoutingService = new ScoutingService();
const oppositionService = new OppositionAnalysisService();
const recruitmentService = new RecruitmentAIService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const opponentClubId = searchParams.get('opponentClubId');
    const gameSeasonId = searchParams.get('gameSeasonId');

    if (opponentClubId && gameSeasonId) {
      const analysis = await oppositionService.analyzeOpponent(opponentClubId, gameSeasonId);
      return NextResponse.json({ success: true, analysis });
    }

    return NextResponse.json({ success: false, error: 'opponentClubId and gameSeasonId are required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching opposition analysis:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'scout_player') {
      const { careerId, playerId, targetClubId } = body;
      if (!careerId || !playerId) {
        return NextResponse.json({ success: false, error: 'Missing careerId or playerId' }, { status: 400 });
      }

      const report = await scoutingService.generateReport({ careerId, playerId, targetClubId });
      return NextResponse.json({ success: true, report });
    }

    if (action === 'evaluate_recruitment') {
      const { targetPlayerId, buyerClubId, gameSeasonId } = body;
      if (!targetPlayerId || !buyerClubId || !gameSeasonId) {
        return NextResponse.json({ success: false, error: 'Missing targetPlayerId, buyerClubId or gameSeasonId' }, { status: 400 });
      }

      const evaluation = await recruitmentService.evaluatePlayerTarget(targetPlayerId, buyerClubId, gameSeasonId);
      return NextResponse.json({ success: true, evaluation });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in scouting POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
