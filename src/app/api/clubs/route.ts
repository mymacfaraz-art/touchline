import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const search = searchParams.get('search');
    const competitionId = searchParams.get('competitionId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (clubId) {
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: {
          country: true,
        },
      });

      if (!club) {
        return NextResponse.json({ success: false, error: 'Club not found' }, { status: 404 });
      }

      // Count active registrations
      const activeRegistrationsCount = await prisma.playerClubRegistration.count({
        where: {
          clubId,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        club: {
          ...club,
          squadSize: activeRegistrationsCount,
        },
      });
    }

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (competitionId) {
      where.participations = {
        some: {
          competitionSeason: {
            competitionId,
          },
        },
      };
    }

    const clubs = await prisma.club.findMany({
      where,
      take: limit,
      orderBy: { reputation: 'desc' },
      include: {
        country: true,
      },
    });

    return NextResponse.json({ success: true, clubs });
  } catch (error: any) {
    console.error('Error in clubs API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
