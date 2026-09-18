// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: BOARD OBJECTIVES SERVICE
// Structured season board goals, tracking, and evaluation mechanics
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { DomainEventBus } from '../../events/event-bus';
import { ObjectiveStatus } from '@prisma/client';

export interface BoardObjectiveDTO {
  id: string;
  title: string;
  category: string;
  targetValue: number;
  currentValue: number;
  status: ObjectiveStatus;
  priority: number;
}

export class BoardObjectivesService {
  /**
   * Initializes default seasonal board objectives for a club based on board ambition.
   */
  public async initializeSeasonObjectives(params: {
    careerId: string;
    gameSeasonId: string;
    clubId: string;
  }): Promise<BoardObjectiveDTO[]> {
    const { careerId, gameSeasonId, clubId } = params;

    const existing = await prisma.boardObjective.findMany({
      where: { careerId, gameSeasonId, clubId },
    });

    if (existing.length > 0) {
      return existing.map(this.mapToDTO);
    }

    const clubState = await prisma.clubSeasonState.findUnique({
      where: { clubId_gameSeasonId: { clubId, gameSeasonId } },
    });

    const ambition = clubState?.boardAmbition || 'MID_TABLE';
    const targetPosition = ambition === 'TITLE' ? 1 : ambition === 'EUROPEAN' ? 4 : 10;

    const created = await prisma.$transaction([
      prisma.boardObjective.create({
        data: {
          careerId,
          gameSeasonId,
          clubId,
          title: `Finish in top ${targetPosition} in the league`,
          category: 'LEAGUE_POSITION',
          targetValue: targetPosition,
          currentValue: 20,
          status: ObjectiveStatus.IN_PROGRESS,
          priority: 1,
        },
      }),
      prisma.boardObjective.create({
        data: {
          careerId,
          gameSeasonId,
          clubId,
          title: 'Maintain transfer budget discipline',
          category: 'FINANCIAL_HEALTH',
          targetValue: 1000000,
          currentValue: clubState?.transferBudget ?? 5000000,
          status: ObjectiveStatus.IN_PROGRESS,
          priority: 2,
        },
      }),
    ]);

    return created.map(this.mapToDTO);
  }

  /**
   * Evaluates and updates board objectives based on live standings or budget state.
   */
  public async evaluateObjectives(
    careerId: string,
    gameSeasonId: string,
    clubId: string,
    currentLeaguePosition: number
  ): Promise<BoardObjectiveDTO[]> {
    const objectives = await prisma.boardObjective.findMany({
      where: { careerId, gameSeasonId, clubId },
    });

    const updatedDTOs: BoardObjectiveDTO[] = [];

    for (const obj of objectives) {
      if (obj.category === 'LEAGUE_POSITION') {
        const isAchieved = currentLeaguePosition <= obj.targetValue;
        const newStatus = isAchieved ? ObjectiveStatus.ACHIEVED : ObjectiveStatus.IN_PROGRESS;

        const updated = await prisma.boardObjective.update({
          where: { id: obj.id },
          data: {
            currentValue: currentLeaguePosition,
            status: newStatus,
          },
        });

        await DomainEventBus.getInstance().publish('BoardObjectiveUpdated', careerId, {
          careerId,
          gameSeasonId,
          clubId,
          objectiveId: obj.id,
          status: newStatus,
          currentValue: currentLeaguePosition,
        });

        updatedDTOs.push(this.mapToDTO(updated));
      } else {
        updatedDTOs.push(this.mapToDTO(obj));
      }
    }

    return updatedDTOs;
  }

  private mapToDTO(record: any): BoardObjectiveDTO {
    return {
      id: record.id,
      title: record.title,
      category: record.category,
      targetValue: record.targetValue,
      currentValue: record.currentValue,
      status: record.status,
      priority: record.priority,
    };
  }
}
