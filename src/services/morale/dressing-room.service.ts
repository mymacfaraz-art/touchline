// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: DRESSING ROOM & MORALE SERVICE
// Team harmony, player relationships, and squad morale aggregation
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';

export interface SquadHarmonyOverview {
  clubId: string;
  gameSeasonId: string;
  squadMoraleAvg: number;
  harmonyLevel: 'EXCELLENT' | 'GOOD' | 'UNSETTLED' | 'CRISIS';
  dissatisfiedPlayersCount: number;
  keyLeadershipPlayers: string[];
}

export class DressingRoomService {
  /**
   * Computes holistic squad harmony and updates ClubSeasonState.squadMorale.
   */
  public async computeSquadHarmony(
    clubId: string,
    gameSeasonId: string
  ): Promise<SquadHarmonyOverview> {
    const registrations = await prisma.playerClubRegistration.findMany({
      where: { clubId, gameSeasonId, isActive: true },
      include: {
        player: {
          include: {
            personality: true,
          },
        },
      },
    });

    const playerIds = registrations.map((r) => r.playerId);

    const conditions = await prisma.playerCondition.findMany({
      where: {
        gameSeasonId,
        playerId: { in: playerIds },
      },
    });

    if (conditions.length === 0) {
      return {
        clubId,
        gameSeasonId,
        squadMoraleAvg: 75.0,
        harmonyLevel: 'GOOD',
        dissatisfiedPlayersCount: 0,
        keyLeadershipPlayers: [],
      };
    }

    const totalMorale = conditions.reduce((acc, c) => acc + c.morale, 0);
    const squadMoraleAvg = Number((totalMorale / conditions.length).toFixed(1));

    const dissatisfiedCount = conditions.filter((c) => c.morale < 50).length;

    let harmonyLevel: 'EXCELLENT' | 'GOOD' | 'UNSETTLED' | 'CRISIS' = 'GOOD';
    if (squadMoraleAvg >= 85) harmonyLevel = 'EXCELLENT';
    else if (squadMoraleAvg >= 70) harmonyLevel = 'GOOD';
    else if (squadMoraleAvg >= 50) harmonyLevel = 'UNSETTLED';
    else harmonyLevel = 'CRISIS';

    // Identify leaders
    const leaders = registrations
      .filter((r) => (r.player.personality?.professionalism ?? 10) >= 15)
      .map((r) => r.player.shortName);

    // Update ClubSeasonState
    try {
      const state = await prisma.clubSeasonState.findUnique({
        where: { clubId_gameSeasonId: { clubId, gameSeasonId } },
      });
      if (state) {
        await prisma.clubSeasonState.update({
          where: { id: state.id },
          data: { squadMorale: squadMoraleAvg },
        });
      }
    } catch (err) {
      console.warn('[DressingRoomService] Failed to update club squadMorale:', err);
    }

    return {
      clubId,
      gameSeasonId,
      squadMoraleAvg,
      harmonyLevel,
      dissatisfiedPlayersCount: dissatisfiedCount,
      keyLeadershipPlayers: leaders,
    };
  }

  /**
   * Records or updates a player relationship state.
   */
  public async updateRelationship(params: {
    careerId: string;
    playerId: string;
    targetType: 'MANAGER' | 'TEAMMATE' | 'CLUB';
    targetId: string;
    satisfaction: number;
    trustLevel: number;
    notes?: string;
  }) {
    const { careerId, playerId, targetType, targetId, satisfaction, trustLevel, notes } = params;

    return await prisma.playerRelationship.upsert({
      where: {
        careerId_playerId_targetType_targetId: {
          careerId,
          playerId,
          targetType,
          targetId,
        },
      },
      update: {
        satisfaction: Math.max(0, Math.min(100, satisfaction)),
        trustLevel: Math.max(0, Math.min(100, trustLevel)),
        notes,
      },
      create: {
        careerId,
        playerId,
        targetType,
        targetId,
        satisfaction: Math.max(0, Math.min(100, satisfaction)),
        trustLevel: Math.max(0, Math.min(100, trustLevel)),
        notes,
      },
    });
  }
}
