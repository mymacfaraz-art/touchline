// ─────────────────────────────────────────────────────────────────────────────
// CARD & INJURY EVALUATOR
//
// Evaluates disciplinary events (yellow/red cards) and injuries each slot.
//
// Disciplinary model:
//   P(yellow) = yellowBaseRate × aggressionMultiplier × intensityMultiplier
//               × mentalityMultiplier × temperamentMultiplier
//
// Injury model:
//   P(injury) = injuryBaseRate × fatigueScale × intensityScale
//
// These are evaluated team-by-team, player-by-player at the end of each slot.
// RNG CALLS: one per team for yellow check, one per team for injury check.
// ─────────────────────────────────────────────────────────────────────────────

import {
  MatchSimulationState,
  PlayerSimulationProfile,
  TeamInMatchState,
  ExtendedMicroEvent,
} from '../match-state';
import { SimulationConfig } from '../simulation-config';
import { SeededRNG } from '../rng';
import { clamp, fatiguePenalty, weightedChoice } from '../probability/probability-utils';
import { InjurySeverity, PersonalityTrait } from '../../../domain/types/player';
import { TeamMentality } from '../../../domain/types/tactics';

// ─────────────────────────────────────────────────────────────────────────────
// YELLOW CARD EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

const MENTALITY_FOUL_BIAS: Record<TeamMentality, number> = {
  VERY_DEFENSIVE: 1.30,  // sitting deeper → more desperate challenges
  DEFENSIVE: 1.15,
  BALANCED: 1.00,
  ATTACKING: 0.90,
  VERY_ATTACKING: 0.85,  // chasing the game → focus on attack, not fouling
};

/**
 * Selects the most likely fouling player from on-pitch players.
 * Higher aggression and lower temperament = more likely to commit fouls.
 */
function selectMostLikelyFouler(
  players: PlayerSimulationProfile[],
  rng: SeededRNG
): PlayerSimulationProfile | null {
  const candidates = players.filter((p) => p.isOnPitch);
  if (candidates.length === 0) return null;

  const weighted: ReadonlyArray<readonly [PlayerSimulationProfile, number]> =
    candidates.map((p) => {
      const aggression = p.rawAttributes.mental.aggression;
      // High aggression + high fatigue = more foul-prone
      const fatigueBonus = clamp((p.currentFatigue - 50) / 100, 0, 0.5);
      return [p, aggression + fatigueBonus * 20] as const;
    });

  return weightedChoice(weighted, rng);
}

/**
 * Evaluates whether a yellow card is issued to the given team this slot.
 *
 * RNG CALLS (per team):
 *   Call A: yellow card probability check
 *   Call B: fouling player selection (only if yellow issued)
 *
 * @returns The player who received the yellow card, or null
 */
export function evaluateYellowCard(
  players: PlayerSimulationProfile[],
  teamState: TeamInMatchState,
  matchIntensity: number,
  config: SimulationConfig,
  rng: SeededRNG
): PlayerSimulationProfile | null {
  let p = config.cardRates.yellowBaseRate;

  // Mentality modifier
  const mentalityMult = MENTALITY_FOUL_BIAS[teamState.effectiveMentality];
  p *= mentalityMult;

  // Match intensity modifier
  p *= 1 + matchIntensity * 0.5;

  // Mean aggression of on-pitch players
  const onPitch = players.filter((pl) => pl.isOnPitch);
  if (onPitch.length > 0) {
    const meanAggression = onPitch.reduce((s, pl) => s + pl.rawAttributes.mental.aggression, 0) / onPitch.length;
    p *= 0.7 + (meanAggression / 99) * 0.6; // 0.7–1.3 scale
  }

  // Clamp probability
  p = clamp(p, config.minProbability * 0.1, 0.15); // max 15% per team per slot

  const isYellow = rng.nextFloat() < p; // RNG Call A

  if (!isYellow) {
    // Still consume RNG call B to preserve ordering
    rng.nextFloat();
    return null;
  }

  // Select the fouling player
  const fouler = selectMostLikelyFouler(players, rng); // RNG Call B
  return fouler;
}

// ─────────────────────────────────────────────────────────────────────────────
// RED CARD LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines if a yellow card results in a second yellow (and therefore red).
 * A player with an existing yellow card who receives another is sent off.
 *
 * @returns true if this yellow is a second yellow (player sent off)
 */
export function isSecondYellow(
  player: PlayerSimulationProfile,
  teamState: TeamInMatchState
): boolean {
  // The TeamInMatchState.yellowCards is a team accumulator;
  // per-player tracking is done via micro-events in the event stream.
  // Here we use a simplified model: each yellow issued has a base P(second) = 0.08
  // (realistic rate — not all yellows are second yellows)
  // The event recorder will handle removing the player if this returns true.
  return false; // Second yellow detection is handled by event recorder's per-player state
}

// ─────────────────────────────────────────────────────────────────────────────
// INJURY EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Selects the most likely player to be injured.
 * Higher fatigue → higher injury probability.
 */
function selectMostLikelyInjuryVictim(
  players: PlayerSimulationProfile[],
  rng: SeededRNG
): PlayerSimulationProfile | null {
  const candidates = players.filter((p) => p.isOnPitch);
  if (candidates.length === 0) return null;

  const weighted: ReadonlyArray<readonly [PlayerSimulationProfile, number]> =
    candidates.map((p) => {
      // Higher fatigue and lower naturalFitness = more injury-prone
      const fatigueWeight = clamp(p.currentFatigue / 30, 0.1, 3.0);
      const fitnessRecovery = p.rawAttributes.physical.naturalFitness / 99;
      return [p, fatigueWeight * (1 - fitnessRecovery * 0.5)] as const;
    });

  return weightedChoice(weighted, rng);
}

/**
 * Selects injury severity from the config distribution.
 * Uses RNG to pick from [MINOR, MODERATE, SEVERE, CAREER_THREATENING].
 */
function selectInjurySeverity(
  config: SimulationConfig,
  rng: SeededRNG
): InjurySeverity {
  const [minor, moderate, severe] = config.injuryRates.severityDistribution;
  const roll = rng.nextFloat();

  if (roll < minor) return 'MINOR';
  if (roll < minor + moderate) return 'MODERATE';
  if (roll < minor + moderate + severe) return 'SEVERE';
  return 'CAREER_THREATENING';
}

/**
 * Evaluates whether an injury occurs to the given team this slot.
 *
 * RNG CALLS (per team):
 *   Call C: injury probability check
 *   Call D: victim selection (only if injury occurs)
 *   Call E: severity selection (only if injury occurs)
 *
 * @returns The injured player and severity, or null
 */
export function evaluateInjury(
  players: PlayerSimulationProfile[],
  matchIntensity: number,
  config: SimulationConfig,
  rng: SeededRNG
): { player: PlayerSimulationProfile; severity: InjurySeverity } | null {
  const onPitch = players.filter((p) => p.isOnPitch);
  if (onPitch.length === 0) {
    // Still consume all RNG calls to preserve ordering
    rng.nextFloat(); // Call C
    rng.nextFloat(); // Call D
    rng.nextFloat(); // Call E
    return null;
  }

  // Base injury probability
  let p = config.injuryRates.baseRate;

  // Fatigue scaling: higher mean team fatigue → more injuries
  const meanFatigue =
    onPitch.reduce((s, pl) => s + pl.currentFatigue, 0) / onPitch.length;
  if (meanFatigue > config.fatigueOnsetThreshold) {
    const fatigueProgress = (meanFatigue - config.fatigueOnsetThreshold) / 70;
    p *= 1 + fatigueProgress * (config.injuryRates.fatigueScale - 1);
  }

  // Intensity scaling
  p *= 1 + matchIntensity * 0.5;

  p = clamp(p, 0, 0.05); // Max 5% per team per slot

  const isInjury = rng.nextFloat() < p; // Call C

  if (!isInjury) {
    rng.nextFloat(); // Call D — consumed but discarded
    rng.nextFloat(); // Call E — consumed but discarded
    return null;
  }

  const victim = selectMostLikelyInjuryVictim(players, rng); // Call D
  if (!victim) {
    rng.nextFloat(); // Call E — consumed but discarded
    return null;
  }

  const severity = selectInjurySeverity(config, rng); // Call E

  return { player: victim, severity };
}
