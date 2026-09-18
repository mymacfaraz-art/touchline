import { NextResponse } from 'next/server';
import { PlayerDevelopmentService } from '@/services/development/development.service';
import { AttributeChangeReason } from '@prisma/client';

const developmentService = new PlayerDevelopmentService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'run_team_training') {
      const { clubId, gameSeasonId, intensity, focus } = body;
      if (!clubId || !gameSeasonId) {
        return NextResponse.json({ success: false, error: 'Missing clubId or gameSeasonId' }, { status: 400 });
      }

      const results = await developmentService.runTeamTrainingSession({
        clubId,
        gameSeasonId,
        intensity: intensity || 'NORMAL',
        focus: focus || 'BALANCED',
      });

      return NextResponse.json({ success: true, results });
    }

    if (action === 'process_player_development') {
      const {
        playerId,
        gameSeasonId,
        minutesPlayed,
        matchRatingAvg,
        trainingIntensity,
        reason,
        referenceDate,
      } = body;

      if (!playerId || !gameSeasonId) {
        return NextResponse.json({ success: false, error: 'Missing playerId or gameSeasonId' }, { status: 400 });
      }

      const result = await developmentService.processPlayerDevelopment({
        playerId,
        gameSeasonId,
        minutesPlayed: minutesPlayed ? Number(minutesPlayed) : 0,
        matchRatingAvg: matchRatingAvg ? Number(matchRatingAvg) : 6.5,
        trainingIntensity: trainingIntensity || 'NORMAL',
        reason: reason as AttributeChangeReason,
        referenceDate: referenceDate ? new Date(referenceDate) : undefined,
      });

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in development POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
