// ─────────────────────────────────────────────────────────────────────────────
// EVENT RECORDER
//
// Translates simulation outcomes into ExtendedMicroEvents and DomainMatchEvents.
// All state mutations from goals, cards, injuries, and substitutions
// are applied here.
//
// This is the single source of truth for state transitions.
// ─────────────────────────────────────────────────────────────────────────────

import {
  MatchSimulationState,
  PlayerSimulationProfile,
  ExtendedMicroEvent,
  TeamInMatchState,
} from '../match-state';
import { DomainMatchEvent } from '../../../domain/types/match';
import { InjurySeverity } from '../../../domain/types/player';

// ─────────────────────────────────────────────────────────────────────────────
// MOMENTUM UPDATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Applies momentum decay each slot */
export function decayMomentum(state: MatchSimulationState, decayRate: number): void {
  state.momentum *= (1 - decayRate);
  // Clamp to [-1, +1]
  if (state.momentum > 1) state.momentum = 1;
  if (state.momentum < -1) state.momentum = -1;
}

/** Boosts momentum toward +1 (home) or -1 (away) after a goal */
export function shiftMomentumOnGoal(state: MatchSimulationState, isHomeGoal: boolean): void {
  const boost = 0.60;
  if (isHomeGoal) {
    state.momentum = Math.min(1, state.momentum + boost);
  } else {
    state.momentum = Math.max(-1, state.momentum - boost);
  }
}

/** Slight momentum shift when pressing succeeds */
export function shiftMomentumOnPress(state: MatchSimulationState, isHomePressing: boolean): void {
  const shift = 0.08;
  if (isHomePressing) {
    state.momentum = Math.min(1, state.momentum + shift);
  } else {
    state.momentum = Math.max(-1, state.momentum - shift);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER YELLOW CARD TRACKING
//
// Per-player yellow card count is tracked in this module via a Map.
// The map is cleared at the start of each match simulation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-match yellow card accumulation map.
 * Key: playerId, Value: yellow card count this match.
 * Must be initialised fresh for each match via createEventRecorderState().
 */
export interface EventRecorderState {
  playerYellowCards: Map<string, number>;
}

export function createEventRecorderState(): EventRecorderState {
  return { playerYellowCards: new Map() };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD GOAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a goal. Updates the score, significant events, micro-events,
 * and momentum.
 */
export function recordGoal(
  state: MatchSimulationState,
  scorer: PlayerSimulationProfile,
  assister: PlayerSimulationProfile | null,
  xgValue: number,
  minute: number,
  addedTime: number,
  isPenalty: boolean,
  isOwnGoal: boolean,
  slot: number
): void {
  const isHome = scorer.teamId === state.home.teamId;

  // Update score
  if (isOwnGoal) {
    if (isHome) {
      // Own goal: home player scored for away team
      state.awayScore++;
      state.away.goals++;
    } else {
      state.homeScore++;
      state.home.goals++;
    }
  } else {
    if (isHome) {
      state.homeScore++;
      state.home.goals++;
    } else {
      state.awayScore++;
      state.away.goals++;
    }
  }

  // Update xG
  if (isHome) {
    state.home.xg += xgValue;
  } else {
    state.away.xg += xgValue;
  }

  // Significant event (persisted)
  const event: DomainMatchEvent = {
    minute,
    addedTime: addedTime > 0 ? addedTime : undefined,
    kind: isOwnGoal ? 'OWN_GOAL' : isPenalty ? 'PENALTY_GOAL' : 'GOAL',
    teamId: isHome ? state.home.teamId : state.away.teamId,
    primaryPlayerId: scorer.playerId,
    secondaryPlayerId: assister?.playerId,
    xgValue,
    description: isOwnGoal
      ? `Own goal by ${scorer.playerId}`
      : `Goal${isPenalty ? ' (penalty)' : ''} by ${scorer.playerId}${assister ? ` (assist: ${assister.playerId})` : ''}`,
  };
  state.significantEvents.push(event);

  // Micro-event (internal)
  const micro: ExtendedMicroEvent = {
    slot,
    minute,
    type: isOwnGoal ? 'OWN_GOAL' : 'GOAL_SCORED',
    teamId: event.teamId,
    initiatorId: scorer.playerId,
    targetId: assister?.playerId,
    outcome: 'SUCCESS',
    xgContribution: xgValue,
  };
  state.microEvents.push(micro);

  // Momentum
  shiftMomentumOnGoal(state, isOwnGoal ? !isHome : isHome);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD SHOT (non-goal)
// ─────────────────────────────────────────────────────────────────────────────

export function recordShot(
  state: MatchSimulationState,
  shooter: PlayerSimulationProfile,
  xgValue: number,
  isOnTarget: boolean,
  slot: number,
  minute: number
): void {
  const isHome = shooter.teamId === state.home.teamId;
  const teamState = isHome ? state.home : state.away;

  teamState.shots++;
  teamState.xg += xgValue;
  if (isOnTarget) teamState.shotsOnTarget++;

  const micro: ExtendedMicroEvent = {
    slot,
    minute,
    type: isOnTarget ? 'SHOT_ON_TARGET' : 'SHOT_OFF_TARGET',
    teamId: shooter.teamId,
    initiatorId: shooter.playerId,
    outcome: 'FAILURE',
    xgContribution: xgValue,
  };
  state.microEvents.push(micro);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD YELLOW CARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a yellow card. Issues a red if this is the player's second yellow.
 * @returns true if the player was sent off (second yellow)
 */
export function recordYellowCard(
  state: MatchSimulationState,
  player: PlayerSimulationProfile,
  erState: EventRecorderState,
  minute: number,
  addedTime: number,
  slot: number
): boolean {
  const isHome = player.teamId === state.home.teamId;
  const teamState = isHome ? state.home : state.away;

  // Accumulate per-player yellow
  const current = erState.playerYellowCards.get(player.playerId) ?? 0;
  const newCount = current + 1;
  erState.playerYellowCards.set(player.playerId, newCount);

  const isSecondYellow = newCount >= 2;

  teamState.yellowCards++;

  const kind = isSecondYellow ? 'SECOND_YELLOW' : 'YELLOW_CARD';

  const event: DomainMatchEvent = {
    minute,
    addedTime: addedTime > 0 ? addedTime : undefined,
    kind,
    teamId: player.teamId,
    primaryPlayerId: player.playerId,
    description: isSecondYellow
      ? `${player.playerId} receives second yellow card and is sent off`
      : `${player.playerId} receives yellow card`,
  };
  state.significantEvents.push(event);

  const micro: ExtendedMicroEvent = {
    slot,
    minute,
    type: 'CARD_ISSUED',
    teamId: player.teamId,
    initiatorId: player.playerId,
    outcome: 'NEUTRAL',
    metadata: { cardType: kind },
  };
  state.microEvents.push(micro);

  if (isSecondYellow) {
    recordRedCard(state, player, slot, minute, addedTime, true);
  }

  return isSecondYellow;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD RED CARD
// ─────────────────────────────────────────────────────────────────────────────

export function recordRedCard(
  state: MatchSimulationState,
  player: PlayerSimulationProfile,
  slot: number,
  minute: number,
  addedTime: number,
  isSecondYellow: boolean
): void {
  const isHome = player.teamId === state.home.teamId;
  const teamState = isHome ? state.home : state.away;

  teamState.redCards++;

  // Remove player from pitch
  player.isOnPitch = false;
  const pitchIdx = teamState.playersOnPitch.indexOf(player.playerId);
  if (pitchIdx !== -1) {
    teamState.playersOnPitch.splice(pitchIdx, 1);
  }

  if (!isSecondYellow) {
    // Only add RED_CARD event if it wasn't already triggered by SECOND_YELLOW
    const event: DomainMatchEvent = {
      minute,
      addedTime: addedTime > 0 ? addedTime : undefined,
      kind: 'RED_CARD',
      teamId: player.teamId,
      primaryPlayerId: player.playerId,
      description: `${player.playerId} receives direct red card`,
    };
    state.significantEvents.push(event);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD INJURY
// ─────────────────────────────────────────────────────────────────────────────

export function recordInjury(
  state: MatchSimulationState,
  player: PlayerSimulationProfile,
  severity: InjurySeverity,
  minute: number,
  addedTime: number,
  slot: number
): void {
  player.isInjured = true;
  // Player remains on pitch until substituted (handled by substitution evaluator)

  const event: DomainMatchEvent = {
    minute,
    addedTime: addedTime > 0 ? addedTime : undefined,
    kind: 'INJURY',
    teamId: player.teamId,
    primaryPlayerId: player.playerId,
    description: `${player.playerId} suffers a ${severity.toLowerCase()} injury`,
    metadata: { severity },
  };
  state.significantEvents.push(event);

  const micro: ExtendedMicroEvent = {
    slot,
    minute,
    type: 'INJURY_OCCURRED',
    teamId: player.teamId,
    initiatorId: player.playerId,
    outcome: 'NEUTRAL',
    metadata: { severity },
  };
  state.microEvents.push(micro);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD SUBSTITUTION
// ─────────────────────────────────────────────────────────────────────────────

export function recordSubstitution(
  state: MatchSimulationState,
  playerOff: PlayerSimulationProfile,
  playerOn: PlayerSimulationProfile,
  minute: number,
  slot: number,
  reason: 'TACTICAL' | 'INJURY'
): void {
  const isHome = playerOff.teamId === state.home.teamId;
  const teamState = isHome ? state.home : state.away;

  // Update pitch state
  playerOff.isOnPitch = false;
  playerOn.isOnPitch = true;
  playerOn.isStarting = false; // They are a substitute
  playerOn.minutesPlayed = 0;

  // Update on-pitch list
  const offIdx = teamState.playersOnPitch.indexOf(playerOff.playerId);
  if (offIdx !== -1) {
    teamState.playersOnPitch.splice(offIdx, 1, playerOn.playerId);
  } else {
    teamState.playersOnPitch.push(playerOn.playerId);
  }

  teamState.substitutionsUsed++;

  const event: DomainMatchEvent = {
    minute,
    kind: 'SUBSTITUTION',
    teamId: playerOff.teamId,
    primaryPlayerId: playerOn.playerId,
    secondaryPlayerId: playerOff.playerId,
    description: `${playerOn.playerId} on, ${playerOff.playerId} off (${reason.toLowerCase()})`,
    metadata: { reason },
  };
  state.significantEvents.push(event);

  const micro: ExtendedMicroEvent = {
    slot,
    minute,
    type: 'SUBSTITUTION_MADE',
    teamId: playerOff.teamId,
    initiatorId: playerOn.playerId,
    targetId: playerOff.playerId,
    outcome: 'NEUTRAL',
    metadata: { reason },
  };
  state.microEvents.push(micro);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD POSSESSION TRANSITION
// ─────────────────────────────────────────────────────────────────────────────

export function recordPossessionTransition(
  state: MatchSimulationState,
  gainerId: string,
  loserTeamId: string,
  slot: number,
  minute: number
): void {
  const micro: ExtendedMicroEvent = {
    slot,
    minute,
    type: 'POSSESSION_TRANSITION',
    teamId: gainerId,
    outcome: 'NEUTRAL',
    metadata: { from: loserTeamId },
  };
  state.microEvents.push(micro);
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE POSSESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the accumulated possession state for the home team.
 * Away team's possession is inferred as 100 - homePossession.
 */
export function recordPossession(
  state: MatchSimulationState,
  homePossessionPct: number
): void {
  state.homePossessionAccumulated += homePossessionPct;
  state.homePossessionSlotCount++;

  // Update team running stat
  state.home.possession = state.homePossessionAccumulated / state.homePossessionSlotCount;
  state.away.possession = 100 - state.home.possession;
}
