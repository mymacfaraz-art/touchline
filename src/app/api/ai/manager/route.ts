import { NextResponse } from 'next/server';
import { ManagerAIService } from '@/ai/manager/manager-ai.service';
import { SubstitutionAIService } from '@/ai/manager/substitution-ai';

const managerAIService = new ManagerAIService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'evaluate_match_adaptation') {
      const { matchState, managerProfile } = body;
      if (!matchState || !managerProfile) {
        return NextResponse.json({ success: false, error: 'Missing matchState or managerProfile' }, { status: 400 });
      }

      const trace = await managerAIService.evaluateMatchAdaptation(matchState, managerProfile);
      return NextResponse.json({ success: true, trace });
    }

    if (action === 'select_substitution') {
      const { playersOnPitch, benchPlayers, remainingSubs, minute } = body;
      const sub = SubstitutionAIService.selectBestSubstitution({
        playersOnPitch: playersOnPitch || [],
        benchPlayers: benchPlayers || [],
        remainingSubs: remainingSubs !== undefined ? Number(remainingSubs) : 3,
        minute: minute !== undefined ? Number(minute) : 60,
      });

      return NextResponse.json({ success: true, substitution: sub });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in Manager AI POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
