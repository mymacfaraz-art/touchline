import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDefaultAttributes, createDefaultGKAttributes } from '@/domain/types/player';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const search = searchParams.get('search');
    const position = searchParams.get('position');
    const gameSeasonId = searchParams.get('gameSeasonId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (playerId) {
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: {
          attributes: true,
          registrations: {
            where: { isActive: true },
            include: { club: true },
            take: 1,
          },
          contracts: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
          attributeSnapshots: {
            orderBy: { occurredAt: 'desc' },
            take: 10,
          },
          competitionStats: {
            take: 5,
          },
        },
      });

      if (!player) {
        return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
      }

      const now = new Date();
      const dob = new Date(player.dateOfBirth);
      const age = now.getFullYear() - dob.getFullYear();

      let condition = null;
      if (gameSeasonId) {
        condition = await prisma.playerCondition.findFirst({
          where: {
            gameSeasonId,
            playerId,
          },
        });
      }

      const flat = (player.attributes as any) || {};
      const isGK = player.primaryPosition === 'GK';
      const defaultAttrs = isGK ? createDefaultGKAttributes(75) : createDefaultAttributes(75);

      const attributes = isGK
        ? {
            goalkeeping: {
              gkReflexes: flat.gkReflexes ?? defaultAttrs.goalkeeping?.gkReflexes ?? 75,
              gkHandling: flat.gkHandling ?? defaultAttrs.goalkeeping?.gkHandling ?? 75,
              gkPositioning: flat.gkPositioning ?? defaultAttrs.goalkeeping?.gkPositioning ?? 75,
              gkKicking: flat.gkKicking ?? defaultAttrs.goalkeeping?.gkKicking ?? 75,
              gkCommunication: flat.gkCommunication ?? defaultAttrs.goalkeeping?.gkCommunication ?? 75,
            },
            technical: {
              firstTouch: flat.firstTouch ?? defaultAttrs.technical.firstTouch,
              ballControl: flat.ballControl ?? defaultAttrs.technical.ballControl,
            },
            physical: {
              acceleration: flat.acceleration ?? defaultAttrs.physical.acceleration,
              pace: flat.pace ?? defaultAttrs.physical.pace,
              stamina: flat.stamina ?? defaultAttrs.physical.stamina,
              strength: flat.strength ?? defaultAttrs.physical.strength,
              agility: flat.agility ?? defaultAttrs.physical.agility,
              balance: flat.balance ?? defaultAttrs.physical.balance,
              jumping: flat.jumping ?? defaultAttrs.physical.jumping,
              naturalFitness: flat.naturalFitness ?? defaultAttrs.physical.naturalFitness,
            },
            mental: {
              composure: flat.composure ?? defaultAttrs.mental.composure,
              decisions: flat.decisions ?? defaultAttrs.mental.decisions,
              vision: flat.vision ?? defaultAttrs.mental.vision,
              positioning: flat.positioning ?? defaultAttrs.mental.positioning,
              workRate: flat.workRate ?? defaultAttrs.mental.workRate,
              leadership: flat.leadership ?? defaultAttrs.mental.leadership,
              teamwork: flat.teamwork ?? defaultAttrs.mental.teamwork,
            },
          }
        : {
            technical: {
              finishing: flat.finishing ?? defaultAttrs.technical.finishing,
              firstTouch: flat.firstTouch ?? defaultAttrs.technical.firstTouch,
              dribbling: flat.dribbling ?? defaultAttrs.technical.dribbling,
              ballControl: flat.ballControl ?? defaultAttrs.technical.ballControl,
              tackling: flat.tackling ?? defaultAttrs.technical.tackling,
              heading: flat.heading ?? defaultAttrs.technical.heading,
              marking: flat.marking ?? defaultAttrs.technical.marking,
            },
            physical: {
              acceleration: flat.acceleration ?? defaultAttrs.physical.acceleration,
              pace: flat.pace ?? defaultAttrs.physical.pace,
              stamina: flat.stamina ?? defaultAttrs.physical.stamina,
              strength: flat.strength ?? defaultAttrs.physical.strength,
              agility: flat.agility ?? defaultAttrs.physical.agility,
              balance: flat.balance ?? defaultAttrs.physical.balance,
              jumping: flat.jumping ?? defaultAttrs.physical.jumping,
              naturalFitness: flat.naturalFitness ?? defaultAttrs.physical.naturalFitness,
            },
            mental: {
              composure: flat.composure ?? defaultAttrs.mental.composure,
              decisions: flat.decisions ?? defaultAttrs.mental.decisions,
              vision: flat.vision ?? defaultAttrs.mental.vision,
              positioning: flat.positioning ?? defaultAttrs.mental.positioning,
              workRate: flat.workRate ?? defaultAttrs.mental.workRate,
              aggression: flat.aggression ?? defaultAttrs.mental.aggression,
              anticipation: flat.anticipation ?? defaultAttrs.mental.anticipation,
              leadership: flat.leadership ?? defaultAttrs.mental.leadership,
              teamwork: flat.teamwork ?? defaultAttrs.mental.teamwork,
            },
          };

      let sum = 0;
      let count = 0;
      Object.values(attributes).forEach((group: any) => {
        Object.values(group).forEach((val: any) => {
          if (typeof val === 'number') {
            sum += val;
            count++;
          }
        });
      });
      const ovr = Math.min(91, Math.max(50, Math.round(count > 0 ? sum / count : 75)));

      return NextResponse.json({
        success: true,
        player: {
          ...player,
          age,
          ovr,
          attributes,
          currentClub: player.registrations[0]?.club || null,
          contract: player.contracts[0] || null,
          condition: condition || {
            fitness: 95,
            fatigue: 5,
            sharpness: 85,
            morale: 80,
            form: 80,
            isInjured: false,
            isSuspended: false,
          },
        },
      });
    }

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (position) {
      where.primaryPosition = position;
    }

    const players = await prisma.player.findMany({
      where,
      take: limit,
      include: {
        attributes: true,
        registrations: {
          where: { isActive: true },
          include: { club: true },
          take: 1,
        },
        contracts: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    const formattedPlayers = players.map((p) => {
      const now = new Date();
      const dob = new Date(p.dateOfBirth);
      const age = now.getFullYear() - dob.getFullYear();
      const flat = (p.attributes as any) || {};

      const ovr = Math.min(
        91,
        Math.max(
          55,
          Math.round(
            ((flat.finishing || 70) +
              (flat.firstTouch || 70) +
              (flat.dribbling || 70) +
              (flat.acceleration || 70) +
              (flat.stamina || 70) +
              (flat.composure || 70)) /
              6
          )
        )
      );

      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        shortName: p.shortName,
        nationality: p.nationality,
        primaryPosition: p.primaryPosition,
        height: p.height,
        age,
        ovr,
        club: p.registrations[0]?.club || null,
        contract: p.contracts[0] || null,
      };
    });

    return NextResponse.json({ success: true, players: formattedPlayers });
  } catch (error: any) {
    console.error('Error in players API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
