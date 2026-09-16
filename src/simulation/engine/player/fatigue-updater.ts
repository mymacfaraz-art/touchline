// ─────────────────────────────────────────────────────────────────────────────
// FATIGUE UPDATER
//
// Accumulates fatigue for each on-pitch player every slot.
// Uses a smooth sigmoid-shaped penalty curve — no sudden cliff.
//
// Called once per slot by the SlotRunner, after all probability evaluations.
// RNG CALLS 14–24 (one per on-pitch player, team by team).
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationState, PlayerSimulationProfile } from '../match-state';
import { SimulationConfig } from '../simulation-config';
import { SeededRNG } from '../rng';
import { clamp, fatiguePenalty } from '../probability/probability-utils';

// ─────────────────────────────────────────────────────────────────────────────
// FATIGUE ACCUMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the fatigue delta for a single player in one slot.
 *
 * Formula:
 *   Δfatigue = baseRate × (1 − stamina/99)
 *            + matchIntensity × intensityFactor
 *            + pressingContribution
 *            − naturalFitness × naturalFitnessReduction
 *            + noise (small RNG variation ±0.3)
 *
 * @param player         Player profile (provides stamina, naturalFitness)
 * @param matchIntensity Current match intensity (0–1)
 * @param isHeavilyPressing Whether this team is pressing at HIGH/EXTREME intensity
 * @param config         Simulation config
 * @param rng            Seeded RNG (1 call for noise)
 */
export function computeFatigueDelta(
  player: PlayerSimulationProfile,
  matchIntensity: number,
  isHeavilyPressing: boolean,
  config: SimulationConfig,
  rng: SeededRNG
): number {
  const stamina = clamp(player.rawAttributes.physical.stamina, 1, 99);
  const naturalFitness = clamp(player.rawAttributes.physical.naturalFitness, 1, 99);

  // Base rate: lower stamina → fatigue faster
  const baseRate = config.fatigueBaseRate * (1 - stamina / 99);

  // Match intensity contribution
  const intensityContribution = matchIntensity * config.fatigueIntensityFactor;

  // Pressing contribution (only for pressing team)
  const pressingContribution = isHeavilyPressing ? config.fatiguePressBonus : 0;

  // Natural fitness reduces base rate
  const naturalFitnessReduction = (naturalFitness / 99) * config.fatigueStaminaReduction;

  // Small noise for realism (±0.3) — RNG call
  const noise = (rng.nextFloat() - 0.5) * 0.6;

  const delta =
    baseRate +
    intensityContribution +
    pressingContribution -
    naturalFitnessReduction +
    noise;

  // Minimum 0.1 per slot (always some tiredness); maximum 4.0 (extreme conditions)
  return clamp(delta, 0.1, 4.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM FATIGUE UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates fatigue for all on-pitch players of a team.
 * Also updates minutes played and the team's mean fatigue.
 *
 * @param players         Mutable player profiles for this team
 * @param matchIntensity  Current match intensity
 * @param isHeavilyPressing Whether this team is pressing at HIGH/EXTREME
 * @param minutesPerSlot  How many game minutes this slot represents
 * @param config          Simulation config
 * @param rng             Seeded RNG (one call per on-pitch player)
 */
export function updateTeamFatigue(
  players: PlayerSimulationProfile[],
  matchIntensity: number,
  isHeavilyPressing: boolean,
  minutesPerSlot: number,
  config: SimulationConfig,
  rng: SeededRNG
): void {
  let totalFatigue = 0;
  let onPitchCount = 0;

  for (const player of players) {
    if (!player.isOnPitch) {
      // Off-pitch players still consume an RNG call to preserve ordering
      rng.nextFloat(); // consumed but discarded
      continue;
    }

    const delta = computeFatigueDelta(
      player,
      matchIntensity,
      isHeavilyPressing,
      config,
      rng
    );

    player.currentFatigue = clamp(player.currentFatigue + delta, 0, 100);
    player.minutesPlayed += minutesPerSlot;

    totalFatigue += player.currentFatigue;
    onPitchCount++;
  }

  // Return mean fatigue (caller updates TeamInMatchState)
  // We don't touch state directly — slot-runner does that
}

// ─────────────────────────────────────────────────────────────────────────────
// EFFECTIVE FATIGUE MODIFIER
//
// Returns the current performance modifier for a player based on their fatigue.
// Used by probability evaluators that need real-time fatigue effects.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the fatigue performance modifier for a player (0.75–1.0).
 * Uses the smooth sigmoid-shaped curve from probability-utils.
 */
export function getFatigueModifier(
  player: PlayerSimulationProfile,
  config: SimulationConfig
): number {
  const penalty = fatiguePenalty(
    player.currentFatigue,
    config.fatigueOnsetThreshold,
    config.fatigueMaxPenalty
  );
  return clamp(1.0 - penalty, 1.0 - config.fatigueMaxPenalty, 1.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM MEAN FATIGUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the current mean fatigue for on-pitch players of a team.
 */
export function computeMeanFatigue(players: PlayerSimulationProfile[]): number {
  const onPitch = players.filter((p) => p.isOnPitch);
  if (onPitch.length === 0) return 0;
  return onPitch.reduce((sum, p) => sum + p.currentFatigue, 0) / onPitch.length;
}
