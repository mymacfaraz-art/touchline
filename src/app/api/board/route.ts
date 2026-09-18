import { NextResponse } from 'next/server';
import { BoardObjectivesService } from '@/services/board/board-objectives.service';
import { DressingRoomService } from '@/services/morale/dressing-room.service';

const boardService = new BoardObjectivesService();
const dressingRoomService = new DressingRoomService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const gameSeasonId = searchParams.get('gameSeasonId');

    if (clubId && gameSeasonId) {
      const harmony = await dressingRoomService.computeSquadHarmony(clubId, gameSeasonId);
      return NextResponse.json({ success: true, harmony });
    }

    return NextResponse.json({ success: false, error: 'clubId and gameSeasonId are required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching dressing room harmony:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'initialize_objectives') {
      const { careerId, gameSeasonId, clubId } = body;
      if (!careerId || !gameSeasonId || !clubId) {
        return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
      }

      const objectives = await boardService.initializeSeasonObjectives({ careerId, gameSeasonId, clubId });
      return NextResponse.json({ success: true, objectives });
    }

    if (action === 'evaluate_objectives') {
      const { careerId, gameSeasonId, clubId, currentLeaguePosition } = body;
      if (!careerId || !gameSeasonId || !clubId || currentLeaguePosition === undefined) {
        return NextResponse.json({ success: false, error: 'Missing required evaluation parameters' }, { status: 400 });
      }

      const objectives = await boardService.evaluateObjectives(careerId, gameSeasonId, clubId, Number(currentLeaguePosition));
      return NextResponse.json({ success: true, objectives });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in board POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
