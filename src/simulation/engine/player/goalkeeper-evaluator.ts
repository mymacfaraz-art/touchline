// ─────────────────────────────────────────────────────────────────────────────
// GOALKEEPER EVALUATOR
//
// Evaluates whether a goalkeeper saves a shot.
//
// Formula:
//   P(save) = gkSaveProbBase(xG) × reflexModifier × positioningModifier
//             × handlingModifier × composureModifier
//
// Final P(save) clamped to config.gkSaveProbabilityClamp [0.05, 0.95].
//
// RNG CALL 10 in the slot ordering (the save probability check).
// ─────────────────────────────────────────────────────────────────────────────

import { ShotAttempt, PlayerSimulationProfile } from '../match-state';
import { SimulationConfig } from '../simulation-config';
import { SeededRNG } from '../rng';
import { clamp } from '../probability/probability-utils';

// ─────────────────────────────────────────────────────────────────────────────
// SAVE PROBABILITY MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reflex modifier: better reflexes improve save probability across all shots.
 * Range: [0.80, 1.20]
 */
function reflexModifier(gkReflexes: number): number {
  return clamp(0.80 + (clamp(gkReflexes, 1, 99) / 99) * 0.40, 0.80, 1.20);
}

/**
 * Positioning modifier: good positioning reduces the angles available to shooters.
 * Less impactful on 1v1 situations (too close to matter).
 * Range: [0.85, 1.15]
 */
function positioningModifier(gkPositioning: number, isOneOnOne: boolean): number {
  if (isOneOnOne) return clamp(0.88 + (gkPositioning / 99) * 0.12, 0.88, 1.0);
  return clamp(0.85 + (gkPositioning / 99) * 0.30, 0.85, 1.15);
}

/**
 * Handling modifier: affects saves from crosses and high balls.
 * For headers: directly affects the save probability.
 * For foot shots: minimal effect (gkHandling matters for crosses, not shots).
 * Range: [0.90, 1.10] for headers; 1.0 for foot shots
 */
function handlingModifier(gkHandling: number, isHeader: boolean): number {
  if (!isHeader) return 1.0;
  return clamp(0.80 + (gkHandling / 99) * 0.40, 0.80, 1.20);
}

/**
 * Composure modifier: under high fatigue, GKs make more errors.
 * Range: [0.90, 1.10]
 */
function composureModifier(gkMentalComposure: number, gkCurrentFatigue: number): number {
  const base = clamp(0.90 + (gkMentalComposure / 99) * 0.20, 0.90, 1.10);
  // Fatigue degrades composure slightly
  const fatiguePenalty = gkCurrentFatigue > 60
    ? (gkCurrentFatigue - 60) / 400  // max −0.075 at fatigue=90
    : 0;
  return clamp(base - fatiguePenalty, 0.85, 1.10);
}

/**
 * Sweeper keeper bonus: SWEEPER_KEEPER role provides extra P(save) on 1v1 and throughballs.
 */
function sweeperKeeperBonus(assignedRole: string, isOneOnOne: boolean): number {
  return assignedRole === 'SWEEPER_KEEPER' && isOneOnOne ? 0.05 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PENALTY SAVE MODEL
//
// Penalties use a separate simpler model:
// base P(save) = 0.20 (realistic penalty save rate ~20–25%)
// modified by reflexes (dominant) and positioning (minimal)
// ─────────────────────────────────────────────────────────────────────────────

function computePenaltySaveProbability(
  gk: PlayerSimulationProfile,
  config: SimulationConfig
): number {
  const gkAttrs = gk.rawAttributes.goalkeeping;
  if (!gkAttrs) return config.gkSaveProbabilityClamp[0];

  const base = 0.20; // Realistic penalty save rate
  const reflexBonus = (gkAttrs.gkReflexes / 99) * 0.12; // Max +0.12 from elite reflexes
  const composureBonus = (gkAttrs.gkPositioning / 99) * 0.04; // Slight positioning read
  return clamp(base + reflexBonus + composureBonus, 0.10, 0.35);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GOALKEEPER EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────

export type ShotOutcome = 'GOAL' | 'SAVE' | 'MISS';

/**
 * Determines the outcome of a shot: GOAL, SAVE, or MISS (off target).
 *
 * Two-step model:
 *   1. Does the shot hit the target? (MISS probability)
 *   2. If on target, does the goalkeeper save it?
 *
 * RNG CALLS:
 *   Call 10: on-target check
 *   Call 11: save probability check (only if on-target)
 *
 * @param shot    The shot attempt with xG and context
 * @param gk      The goalkeeper's simulation profile
 * @param config  Simulation config
 * @param rng     Seeded RNG (advances 1–2 positions)
 * @returns       'GOAL', 'SAVE', or 'MISS'
 */
export function evaluateGoalkeeperSave(
  shot: ShotAttempt,
  gk: PlayerSimulationProfile,
  config: SimulationConfig,
  rng: SeededRNG
): ShotOutcome {
  const gkAttrs = gk.rawAttributes.goalkeeping;
  if (!gkAttrs) {
    // No GK attributes — should never happen; treat as average GK
    const p = rng.nextFloat();   // Call 10: on-target check
    rng.nextFloat();             // Call 11: save check (always consumed)
    return p < shot.xgValue ? 'GOAL' : 'SAVE';
  }

  // ── Step 1: Does the shot hit the target? ──────────────────────────────────
  // On-target probability: correlated to xG but independent from save
  // Better chance → more likely on target. xG already captures shot quality.
  // Roughly: CLEAR_CUT=0.85, GOOD=0.65, HALF_CHANCE=0.45, LONG_RANGE=0.40
  const onTargetProb = clamp(0.35 + shot.xgValue * 0.80, 0.20, 0.90);
  const isOnTarget = rng.nextFloat() < onTargetProb; // Call 10

  if (!isOnTarget) {
    rng.nextFloat(); // Call 11: consumed but discarded (RNG ordering preserved)
    return 'MISS';
  }

  // ── Step 2: Does the goalkeeper save the on-target shot? ──────────────────
  let saveProbability: number;

  if (shot.isPenalty) {
    saveProbability = computePenaltySaveProbability(gk, config);
  } else {
    // Base: given shot is on target, P(save) = 1 - (xG / onTargetProb)
    const base = clamp(1 - (shot.xgValue / onTargetProb), 0.05, 0.95);

    const rMod = reflexModifier(gkAttrs.gkReflexes);
    const posMod = positioningModifier(gkAttrs.gkPositioning, shot.isOneOnOne);
    const hMod = handlingModifier(gkAttrs.gkHandling, shot.isHeader);
    const cMod = composureModifier(gk.rawAttributes.mental.composure, gk.currentFatigue);
    const skBonus = sweeperKeeperBonus(gk.assignedRole, shot.isOneOnOne);

    saveProbability = base * rMod * posMod * hMod * cMod + skBonus;
  }

  saveProbability = clamp(
    saveProbability,
    config.gkSaveProbabilityClamp[0],
    config.gkSaveProbabilityClamp[1]
  );

  const saved = rng.nextFloat() < saveProbability; // Call 11

  return saved ? 'SAVE' : 'GOAL';
}
