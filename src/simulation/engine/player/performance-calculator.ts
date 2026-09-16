// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE CALCULATOR
//
// Computes per-player match ratings and statistics from the micro-event stream
// and the final match state.
//
// Ratings are on the 4.0–10.0 scale (config.ratingClamp).
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationState, PlayerSimulationProfile, ExtendedMicroEvent } from '../match-state';
import { PlayerMatchPerformance } from '../../../domain/types/match';
import { SimulationConfig } from '../simulation-config';
import { clamp } from '../probability/probability-utils';

// ─────────────────────────────────────────────────────────────────────────────
// PER-PLAYER EVENT AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerRawStats {
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  xgAssisted: number;
  keyPasses: number;
  yellowCards: number;
  redCards: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  aerialDuelsWon: number;
}

function emptyStats(): PlayerRawStats {
  return {
    goals: 0, assists: 0, shots: 0, shotsOnTarget: 0,
    xg: 0, xgAssisted: 0, keyPasses: 0,
    yellowCards: 0, redCards: 0,
    passes: 0, passesCompleted: 0,
    tackles: 0, interceptions: 0, aerialDuelsWon: 0,
  };
}

/**
 * Aggregates micro-event data into per-player raw stats.
 */
function aggregatePlayerStats(
  microEvents: ExtendedMicroEvent[]
): Map<string, PlayerRawStats> {
  const statsMap = new Map<string, PlayerRawStats>();

  const get = (id: string): PlayerRawStats => {
    if (!statsMap.has(id)) statsMap.set(id, emptyStats());
    return statsMap.get(id)!;
  };

  for (const event of microEvents) {
    const initiator = event.initiatorId;
    const target = event.targetId;

    switch (event.type) {
      case 'GOAL_SCORED':
        if (initiator) {
          get(initiator).goals++;
          get(initiator).shots++;
          get(initiator).shotsOnTarget++;
          get(initiator).xg += event.xgContribution ?? 0;
        }
        if (target) {
          get(target).assists++;
          get(target).xgAssisted += event.xgContribution ?? 0;
        }
        break;

      case 'SHOT_ON_TARGET':
        if (initiator) {
          get(initiator).shots++;
          get(initiator).shotsOnTarget++;
          get(initiator).xg += event.xgContribution ?? 0;
        }
        break;

      case 'SHOT_OFF_TARGET':
        if (initiator) {
          get(initiator).shots++;
          get(initiator).xg += event.xgContribution ?? 0;
        }
        break;

      case 'CARD_ISSUED': {
        const meta = event.metadata as { cardType?: string } | undefined;
        if (initiator) {
          if (meta?.cardType === 'RED_CARD' || meta?.cardType === 'SECOND_YELLOW') {
            get(initiator).redCards++;
          } else {
            get(initiator).yellowCards++;
          }
        }
        break;
      }

      case 'DUEL_WON':
        if (initiator) get(initiator).tackles++;
        break;

      case 'PASS_COMPLETED':
        if (initiator) {
          get(initiator).passes++;
          get(initiator).passesCompleted++;
        }
        break;

      case 'PASS_INTERCEPTED':
        if (initiator) get(initiator).passes++;
        break;

      default:
        break;
    }
  }

  return statsMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATING CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a match rating for a player on the 4.0–10.0 scale.
 *
 * Formula:
 *   base = 6.0
 *   + goal × ratingGoalBonus
 *   + assist × ratingAssistBonus
 *   + keyPass × ratingKeyPassBonus
 *   + xg × ratingXgBonus
 *   − yellowCards × ratingYellowPenalty
 *   − redCards × ratingRedPenalty
 *   ± win/loss team result modifier
 *   ± effective ability relative contribution (small bias)
 *
 * Clamped to [ratingClamp.min, ratingClamp.max]
 */
function computeRating(
  stats: PlayerRawStats,
  profile: PlayerSimulationProfile,
  isTeamWin: boolean,
  isTeamLoss: boolean,
  config: SimulationConfig
): number {
  const BASE = 6.0;

  let rating = BASE;

  // Positive contributions
  rating += stats.goals * config.ratingGoalBonus;
  rating += stats.assists * config.ratingAssistBonus;
  rating += stats.keyPasses * config.ratingKeyPassBonus;
  rating += stats.xg * config.ratingXgBonus;

  // Disciplinary penalties
  rating -= stats.yellowCards * config.ratingYellowPenalty;
  rating -= stats.redCards * config.ratingRedPenalty;

  // Team result modifier
  if (isTeamWin) rating += config.ratingWinBonus;
  if (isTeamLoss) rating -= config.ratingLossPenalty;

  // Small effective ability bias: elite players floor higher
  const abilityBias = ((profile.effectiveMatchAbility - 100) / 200) * 0.5;
  rating += abilityBias;

  // Fatigue penalty: very tired players tend to have worse ratings
  if (profile.currentFatigue > config.fatigueOnsetThreshold) {
    const fatiguePen = ((profile.currentFatigue - config.fatigueOnsetThreshold) / 100) * 0.5;
    rating -= fatiguePen;
  }

  return clamp(
    Number(rating.toFixed(1)),
    config.ratingClamp[0],
    config.ratingClamp[1]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PERFORMANCE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes PlayerMatchPerformance for all players who participated.
 */
export function computePlayerPerformances(
  state: MatchSimulationState,
  config: SimulationConfig
): PlayerMatchPerformance[] {
  const statsMap = aggregatePlayerStats(state.microEvents);

  const isHomeWin = state.homeScore > state.awayScore;
  const isHomeLoss = state.homeScore < state.awayScore;

  const allProfiles = [...state.homePlayers, ...state.awayPlayers];

  const performances: PlayerMatchPerformance[] = [];

  for (const profile of allProfiles) {
    // Only include players who actually played
    if (profile.minutesPlayed === 0 && !profile.isStarting) continue;

    const isHome = profile.teamId === state.home.teamId;
    const isWin = isHome ? isHomeWin : isHomeLoss; // from player's team perspective
    const isLoss = isHome ? isHomeLoss : isHomeWin;

    const raw = statsMap.get(profile.playerId) ?? emptyStats();
    const rating = computeRating(raw, profile, isWin, isLoss, config);

    const passAccuracy = raw.passes > 0
      ? Number(((raw.passesCompleted / raw.passes) * 100).toFixed(1))
      : 0;

    performances.push({
      matchId: '',  // filled in by service layer after DB write
      playerId: profile.playerId,
      teamId: profile.teamId,
      isStarting: profile.isStarting,
      minutesPlayed: profile.minutesPlayed,
      rating,
      goals: raw.goals,
      assists: raw.assists,
      shots: raw.shots,
      shotsOnTarget: raw.shotsOnTarget,
      keyPasses: raw.keyPasses,
      passesCompleted: raw.passesCompleted,
      passAccuracy,
      tackles: raw.tackles,
      interceptions: raw.interceptions,
      aerialDuelsWon: raw.aerialDuelsWon,
      yellowCards: raw.yellowCards,
      redCards: raw.redCards,
      xg: Number(raw.xg.toFixed(2)),
      xgAssisted: Number(raw.xgAssisted.toFixed(2)),
      wasSubstitutedOff: !profile.isOnPitch && profile.minutesPlayed < 90,
      substitutedOffMinute: !profile.isOnPitch && profile.minutesPlayed < 90
        ? profile.minutesPlayed
        : undefined,
    });
  }

  return performances;
}
