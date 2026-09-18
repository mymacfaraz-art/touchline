import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTacticDocument, TacticDocument } from '@/domain/types/tactics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    if (!clubId) {
      return NextResponse.json({ success: false, error: 'clubId is required' }, { status: 400 });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ success: false, error: 'Club not found' }, { status: 404 });
    }

    // Default tactics if none saved
    const tactics = toTacticDocument({
      formation: '4-3-3',
      mentality: 'ATTACKING',
      pressingIntensity: 'HIGH',
      defensiveLine: 'HIGH',
      passingStyle: 'SHORT_POSSESSION',
      tempo: 'HIGH',
      width: 'WIDE',
      buildUpStyle: 'SHORT_PASSING',
      transitionStyle: 'COUNTER',
      outOfPossession: 'PRESS',
      playerRoles: [],
    });

    return NextResponse.json({ success: true, tactics, clubName: club.name });
  } catch (error: any) {
    console.error('Error fetching tactics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clubId, tactics } = body;

    if (!clubId || !tactics) {
      return NextResponse.json({ success: false, error: 'Missing clubId or tactics' }, { status: 400 });
    }

    // Validate tactic document format
    const validatedTactics = toTacticDocument(tactics);

    return NextResponse.json({ success: true, tactics: validatedTactics });
  } catch (error: any) {
    console.error('Error updating tactics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
