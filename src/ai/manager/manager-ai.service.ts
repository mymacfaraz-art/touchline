// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: ADVANCED MANAGER AI SERVICE
// Tactical adaptation, in-game decision reasoning, and explainable decision traces
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';
import { DomainEventBus } from '../../events/event-bus';
import {
  IManagerDecisionProvider,
  AdaptiveMatchState,
  ManagerTacticalIdentity,
  ManagerDecisionTraceOutput,
} from '../../domain/types/advanced-ai';
import { TacticDocument } from '../../domain/types/tactics';

export class ManagerAIService implements IManagerDecisionProvider {
  /**
   * Evaluates match situation at discrete decision intervals (halftime, min 65, min 80, red cards, trailing score).
   * Returns adapted tactical document and substitution requests without bypassing the deterministic simulation.
   */
  public async evaluateMatchAdaptation(
    matchState: AdaptiveMatchState,
    managerProfile: ManagerTacticalIdentity
  ): Promise<ManagerDecisionTraceOutput | null> {
    const {
      matchId,
      minute,
      isHomeTeam,
      homeScore,
      awayScore,
      homeRedCards,
      awayRedCards,
      currentTactics,
    } = matchState;

    const teamScore = isHomeTeam ? homeScore : awayScore;
    const opponentScore = isHomeTeam ? awayScore : homeScore;
    const teamRedCards = isHomeTeam ? homeRedCards : awayRedCards;
    const goalDiff = teamScore - opponentScore;

    // Decision Checkpoints: Min 45 (HT), Min 65, Min 80, or active red card
    const isHalftime = minute === 45;
    const isLateMatch = minute >= 75;
    const isMidSecondHalf = minute >= 60 && minute < 75;

    if (!isHalftime && !isMidSecondHalf && !isLateMatch && teamRedCards === 0) {
      return null;
    }

    let trigger = '';
    let selectedAction = '';
    let rationale = '';
    const availableOptions: string[] = [
      'MAINTAIN_CURRENT_TACTICS',
      'SWITCH_TO_ATTACKING_PUSH',
      'SWITCH_TO_PARK_THE_BUS',
      'INCREASE_PRESSING_AND_TEMPO',
      'DROP_DEFENSIVE_LINE_FOR_SAFETY',
    ];

    const adaptedTactics: TacticDocument = { ...currentTactics };

    // Scenario A: Red card received -> Drop defensive line and switch to cautious mentality
    if (teamRedCards > 0 && currentTactics.mentality !== 'DEFENSIVE') {
      trigger = `Red card received (${teamRedCards} sent off at ${minute}')`;
      selectedAction = 'DROP_DEFENSIVE_LINE_FOR_SAFETY';
      rationale = 'Adjusting structure to compensate for numerical disadvantage and prevent defensive overload.';
      adaptedTactics.mentality = 'DEFENSIVE';
      adaptedTactics.defensiveLine = 'DEEP';
      adaptedTactics.pressingIntensity = 'MEDIUM';
    }
    // Scenario B: Trailing in late match (Min 75+) -> All-out attack push
    else if (goalDiff < 0 && isLateMatch) {
      trigger = `Trailing ${teamScore}-${opponentScore} at ${minute}'`;
      selectedAction = 'SWITCH_TO_ATTACKING_PUSH';
      rationale = 'Increasing attacking urgency, tempo, and high pressing to force turnover in opposition half.';
      adaptedTactics.mentality = 'ATTACKING';
      adaptedTactics.tempo = 'HIGH';
      adaptedTactics.pressingIntensity = 'HIGH';
      adaptedTactics.defensiveLine = 'HIGH';
    }
    // Scenario C: Leading narrowly in late match (Min 80+) -> Protect lead
    else if (goalDiff > 0 && isLateMatch) {
      trigger = `Leading ${teamScore}-${opponentScore} at ${minute}'`;
      selectedAction = 'SWITCH_TO_PARK_THE_BUS';
      rationale = 'Consolidating defensive shape and slowing tempo to preserve match lead.';
      adaptedTactics.mentality = 'BALANCED';
      adaptedTactics.tempo = 'NORMAL';
      adaptedTactics.defensiveLine = 'STANDARD';
    }
    // Scenario D: Level score at halftime -> Apply manager's baseline identity preferences
    else if (isHalftime && goalDiff === 0) {
      trigger = `Halftime level score 0-0 or tied at 45'`;
      selectedAction = 'INCREASE_PRESSING_AND_TEMPO';
      rationale = 'Applying tactical identity adjustments at halftime to gain midfield control.';
      adaptedTactics.pressingIntensity = managerProfile.pressingIntensity;
      adaptedTactics.tempo = managerProfile.tempo;
    } else {
      return null;
    }

    const result: ManagerDecisionTraceOutput = {
      minute,
      trigger,
      gameState: { minute, goalDiff, teamScore, opponentScore, teamRedCards },
      availableOptions,
      selectedAction,
      confidence: 0.9,
      rationale,
      adaptedTactics,
    };

    // Audit trace persistence
    try {
      const clubId = isHomeTeam ? matchState.homeClubId : matchState.awayClubId;
      await prisma.managerDecisionTrace.create({
        data: {
          careerId: 'career-active',
          gameSeasonId: 'season-active',
          matchId,
          clubId,
          minute,
          trigger,
          gameState: result.gameState,
          availableOptions,
          selectedAction,
          confidence: result.confidence,
          rationale,
          managerProfileVersion: 'v1.0',
        },
      });

      // Emit domain event
      await DomainEventBus.getInstance().publish('ManagerDecisionMade', 'career-active', {
        careerId: 'career-active',
        gameSeasonId: 'season-active',
        matchId,
        clubId,
        minute,
        trigger,
        selectedAction,
        rationale,
      });
    } catch (err) {
      console.warn('[ManagerAIService] Audit trace persistence warning:', err);
    }

    return result;
  }
}
