// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: SQUAD & ELIGIBILITY RESOLVER
// Resolves authoritative player registrations, condition, attributes, and eligibility
// for a club on a given fixture matchday.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import {
  DomainPlayer,
  PlayerAttributes,
  PlayerCondition,
  PlayerPosition,
} from '../../domain/types/player';
import { PlayerEligibilityResult } from '../types/orchestration.types';

export class SquadResolver {
  /**
   * Resolves all registered players for a club in a given GameSeason,
   * including their attributes, condition, and eligibility status for a fixture.
   */
  public async resolveClubSquad(
    clubId: string,
    gameSeasonId: string,
    competitionSeasonId: string,
    matchDate: Date
  ): Promise<{
    players: DomainPlayer[];
    playerConditions: Map<string, PlayerCondition>;
    eligibilityMap: Map<string, PlayerEligibilityResult>;
  }> {
    // 1. Query active registrations for the club in this GameSeason
    const registrations = await prisma.playerClubRegistration.findMany({
      where: {
        clubId,
        gameSeasonId,
        isActive: true,
        startDate: { lte: matchDate },
        OR: [
          { endDate: null },
          { endDate: { gte: matchDate } },
        ],
      },
      include: {
        player: {
          include: {
            attributes: true,
            potential: true,
            personality: true,
            injuries: {
              where: {
                startDate: { lte: matchDate },
                actualReturn: null,
                expectedReturn: { gt: matchDate },
              },
            },
            suspensions: {
              where: {
                competitionSeasonId,
                matchesMissedRemaining: { gt: 0 },
              },
            },
          },
        },
      },
    });

    // 2. Query conditions for these players in this GameSeason
    const playerIds = registrations.map((r) => r.playerId);
    const dbConditions = await prisma.playerCondition.findMany({
      where: {
        gameSeasonId,
        playerId: { in: playerIds },
      },
    });

    const conditionMap = new Map<string, PlayerCondition>();
    for (const dbCond of dbConditions) {
      conditionMap.set(dbCond.playerId, {
        playerId: dbCond.playerId,
        gameSeasonId: dbCond.gameSeasonId,
        fitness: dbCond.fitness,
        fatigue: dbCond.fatigue,
        morale: dbCond.morale,
        confidence: dbCond.confidence,
        sharpness: dbCond.sharpness,
        form: dbCond.form,
        tacticalFamiliarity: dbCond.tacticalFamiliarity,
      });
    }

    const domainPlayers: DomainPlayer[] = [];
    const eligibilityMap = new Map<string, PlayerEligibilityResult>();

    for (const reg of registrations) {
      const p = reg.player;
      
      // Default condition fallback if no record exists
      if (!conditionMap.has(p.id)) {
        conditionMap.set(p.id, {
          playerId: p.id,
          gameSeasonId,
          fitness: 100,
          fatigue: 0,
          morale: 75,
          confidence: 75,
          sharpness: 75,
          form: 50,
          tacticalFamiliarity: 50,
        });
      }

      const attributes = p.attributes
        ? this.mapDbAttributesToDomain(p.attributes)
        : undefined;

      const isInjured = p.injuries.length > 0;
      const isSuspended = p.suspensions.length > 0;
      const reasons: string[] = [];

      if (isInjured) {
        reasons.push(`Injured: ${p.injuries[0].description}`);
      }
      if (isSuspended) {
        reasons.push(`Suspended: ${p.suspensions[0].reason}`);
      }

      const isEligible = !isInjured && !isSuspended && p.isActive;

      eligibilityMap.set(p.id, {
        playerId: p.id,
        isEligible,
        isRegistered: true,
        isInjured,
        isSuspended,
        reasons,
      });

      const domainPlayer: DomainPlayer = {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        shortName: p.shortName,
        dateOfBirth: p.dateOfBirth,
        nationality: p.nationality,
        secondNationality: p.secondNationality ?? undefined,
        primaryPosition: p.primaryPosition as PlayerPosition,
        secondaryPositions: (p.secondaryPositions as PlayerPosition[]) || [],
        preferredFoot: p.preferredFoot as any,
        height: p.height,
        weight: p.weight ?? undefined,
        isActive: p.isActive,
        attributes,
        currentCondition: conditionMap.get(p.id),
      };

      domainPlayers.push(domainPlayer);
    }

    return {
      players: domainPlayers,
      playerConditions: conditionMap,
      eligibilityMap,
    };
  }

  /**
   * Converts flat database PlayerAttributes columns to nested domain PlayerAttributes.
   */
  private mapDbAttributesToDomain(dbAttrs: any): PlayerAttributes {
    const isGk = dbAttrs.gkReflexes !== null && dbAttrs.gkReflexes !== undefined;

    return {
      technical: {
        passing: dbAttrs.passing,
        longPassing: dbAttrs.longPassing,
        crossing: dbAttrs.crossing,
        finishing: dbAttrs.finishing,
        firstTouch: dbAttrs.firstTouch,
        dribbling: dbAttrs.dribbling,
        ballControl: dbAttrs.ballControl,
        heading: dbAttrs.heading,
        tackling: dbAttrs.tackling,
        marking: dbAttrs.marking,
        freeKick: dbAttrs.freeKick,
        penaltyTaking: dbAttrs.penaltyTaking,
      },
      physical: {
        acceleration: dbAttrs.acceleration,
        pace: dbAttrs.pace,
        stamina: dbAttrs.stamina,
        strength: dbAttrs.strength,
        agility: dbAttrs.agility,
        balance: dbAttrs.balance,
        jumping: dbAttrs.jumping,
        naturalFitness: dbAttrs.naturalFitness,
      },
      mental: {
        composure: dbAttrs.composure,
        decisions: dbAttrs.decisions,
        vision: dbAttrs.vision,
        anticipation: dbAttrs.anticipation,
        positioning: dbAttrs.positioning,
        concentration: dbAttrs.concentration,
        workRate: dbAttrs.workRate,
        aggression: dbAttrs.aggression,
        leadership: dbAttrs.leadership,
        teamwork: dbAttrs.teamwork,
        adaptability: dbAttrs.adaptability,
      },
      goalkeeping: isGk
        ? {
            gkReflexes: dbAttrs.gkReflexes,
            gkHandling: dbAttrs.gkHandling,
            gkPositioning: dbAttrs.gkPositioning,
            gkKicking: dbAttrs.gkKicking,
            gkCommunication: dbAttrs.gkCommunication,
          }
        : null,
    };
  }
}
