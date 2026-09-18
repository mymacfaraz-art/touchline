// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: IN-PROCESS DOMAIN EVENT BUS
// Decoupled, typed domain events driving news, milestones, and audit trails.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';

export type TouchlineEventType =
  | 'MatchCompleted'
  | 'GoalScored'
  | 'PlayerInjured'
  | 'PlayerTransferred'
  | 'ContractExpired'
  | 'TrainingCompleted'
  | 'SeasonFinished'
  | 'PlayerDeveloped'
  | 'ManagerDecisionMade'
  | 'BoardObjectiveUpdated';

export interface TouchlineEventPayloadMap {
  MatchCompleted: {
    matchId: string;
    fixtureId: string;
    careerId: string;
    gameSeasonId: string;
    homeClubId: string;
    awayClubId: string;
    homeScore: number;
    awayScore: number;
    homeClubName?: string;
    awayClubName?: string;
  };
  GoalScored: {
    matchId: string;
    minute: number;
    scorerId: string;
    assistId?: string;
    teamId: string;
  };
  PlayerInjured: {
    playerId: string;
    injuryType: string;
    severity: string;
    expectedReturn: string;
  };
  PlayerTransferred: {
    playerId: string;
    sourceClubId: string;
    destinationClubId: string;
    fee: number;
    wage: number;
  };
  ContractExpired: {
    playerId: string;
    clubId: string;
  };
  TrainingCompleted: {
    clubId: string;
    gameSeasonId: string;
    intensity: string;
    focus: string;
  };
  SeasonFinished: {
    careerId: string;
    gameSeasonId: string;
    winnerClubId?: string;
  };
  PlayerDeveloped: {
    playerId: string;
    gameSeasonId: string;
    previousRating: number;
    newRating: number;
  };
  ManagerDecisionMade: {
    careerId: string;
    gameSeasonId: string;
    matchId?: string;
    clubId: string;
    minute?: number;
    trigger: string;
    selectedAction: string;
    rationale: string;
  };
  BoardObjectiveUpdated: {
    careerId: string;
    gameSeasonId: string;
    clubId: string;
    objectiveId: string;
    status: string;
    currentValue: number;
  };
}

export type EventCallback<K extends TouchlineEventType> = (
  payload: TouchlineEventPayloadMap[K]
) => void | Promise<void>;

export class DomainEventBus {
  private static instance: DomainEventBus;
  private listeners: Map<TouchlineEventType, Set<EventCallback<any>>> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  public subscribe<K extends TouchlineEventType>(
    eventType: K,
    callback: EventCallback<K>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const set = this.listeners.get(eventType)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  public async publish<K extends TouchlineEventType>(
    eventType: K,
    careerId: string,
    payload: TouchlineEventPayloadMap[K],
    gameSeasonId?: string
  ): Promise<void> {
    // 1. Audit event to database
    try {
      await prisma.domainEventLog.create({
        data: {
          careerId,
          gameSeasonId: gameSeasonId || (payload as any).gameSeasonId || null,
          eventType,
          payloadJson: payload as any,
        },
      });
    } catch (err) {
      // Don't crash in-process execution if logging fails
      console.warn(`[DomainEventBus] Audit log warning for ${eventType}:`, err);
    }

    // 2. Dispatch to subscribers
    const callbacks = this.listeners.get(eventType);
    if (callbacks && callbacks.size > 0) {
      for (const cb of Array.from(callbacks)) {
        try {
          await cb(payload);
        } catch (err) {
          console.error(`[DomainEventBus] Error in subscriber for ${eventType}:`, err);
        }
      }
    }
  }

  public clearAllListeners(): void {
    this.listeners.clear();
  }
}
