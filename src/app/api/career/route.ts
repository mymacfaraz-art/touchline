import { NextResponse } from 'next/server';
import { CareerService, SeasonProgressionService } from '@/services/career/career.service';

const careerService = new CareerService();
const seasonProgressionService = new SeasonProgressionService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const careerId = searchParams.get('careerId');
    const competitionSeasonId = searchParams.get('competitionSeasonId');

    if (competitionSeasonId) {
      const standings = await seasonProgressionService.getStandings(competitionSeasonId);
      return NextResponse.json({ success: true, standings });
    }

    if (careerId) {
      const career = await careerService.loadCareer(careerId);
      return NextResponse.json({ success: true, career });
    }

    return NextResponse.json({ success: false, error: 'careerId or competitionSeasonId required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching career data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { userId, name, selectedClubId, managerName, startYear } = body;
      if (!userId || !name) {
        return NextResponse.json({ success: false, error: 'Missing userId or name' }, { status: 400 });
      }
      const career = await careerService.createCareer({
        userId,
        name,
        selectedClubId,
        managerName,
        startYear: startYear ? Number(startYear) : 2024,
      });
      return NextResponse.json({ success: true, career });
    }

    if (action === 'advance_matchday') {
      const { competitionSeasonId, matchWeek } = body;
      if (!competitionSeasonId) {
        return NextResponse.json({ success: false, error: 'Missing competitionSeasonId' }, { status: 400 });
      }
      const result = await seasonProgressionService.advanceToNextMatchday({
        competitionSeasonId,
        matchWeek: matchWeek !== undefined ? Number(matchWeek) : undefined,
      });
      return NextResponse.json({ success: true, result });
    }

    if (action === 'rollover_season') {
      const { careerId, currentGameSeasonId } = body;
      if (!careerId || !currentGameSeasonId) {
        return NextResponse.json({ success: false, error: 'Missing required parameters for rollover' }, { status: 400 });
      }
      const result = await seasonProgressionService.rolloverSeason({
        careerId,
        currentGameSeasonId,
      });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in career POST handler:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
