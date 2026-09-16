// ─────────────────────────────────────────────────────────────────────────────
// PROBABILITY UTILITIES
//
// Pure, stateless mathematical utilities used throughout the simulation engine.
// All functions are deterministic given their inputs.
// SeededRNG is passed in where randomness is needed.
// ─────────────────────────────────────────────────────────────────────────────

import { SeededRNG } from '../rng';

/**
 * Clamps a value to [min, max] inclusive.
 * Used throughout the engine to enforce probability bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamps a probability to the configured [minP, maxP] range.
 * Prevents deterministic outcomes (0 or 1) in simulation logic.
 */
export function clampProbability(
  p: number,
  minP = 0.02,
  maxP = 0.98
): number {
  return clamp(p, minP, maxP);
}

/**
 * Draws a value from a triangular distribution.
 *
 * A triangular distribution is bounded by [min, max] with a mode (peak)
 * at `mode`. It concentrates probability around the mode while allowing
 * variation. Used for possession slot variance.
 *
 * @param min  Lower bound (inclusive)
 * @param mode Most likely value (peak of distribution)
 * @param max  Upper bound (inclusive)
 * @param rng  Seeded RNG instance
 */
export function triangular(
  min: number,
  mode: number,
  max: number,
  rng: SeededRNG
): number {
  // Guard: handle degenerate case
  if (min >= max) return mode;

  const range = max - min;
  const fc = (mode - min) / range; // fractional position of mode
  const u = rng.nextFloat();       // uniform [0, 1)

  if (u < fc) {
    return min + Math.sqrt(u * range * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * range * (max - mode));
  }
}

/**
 * Normalises an array of positive weights to sum to 1.0.
 * Used when combining attribute group scores with role weights.
 *
 * @throws if weights array is empty or all-zero
 */
export function normaliseWeights(weights: number[]): number[] {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total === 0) {
    throw new Error('normaliseWeights: all weights are zero or negative');
  }
  return weights.map((w) => Math.max(0, w) / total);
}

/**
 * Computes a weighted average of attribute values.
 *
 * @param attributes  Array of (value, weight) pairs
 * @returns           Weighted mean in the same scale as the input values
 */
export function weightedMean(
  attributes: ReadonlyArray<readonly [value: number, weight: number]>
): number {
  if (attributes.length === 0) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [val, w] of attributes) {
    const safeWeight = Math.max(0, w);
    weightedSum += val * safeWeight;
    totalWeight += safeWeight;
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

/**
 * Normalises an attribute value on 1–99 scale to a 0–1 fraction.
 * Used when converting raw attributes to probability modifiers.
 */
export function attrToFraction(value: number): number {
  return clamp(value, 1, 99) / 99;
}

/**
 * Applies a linear modifier formula: base + (value/100) × scale
 * Used for condition modifier calculations.
 *
 * @param value  The condition value (0–100)
 * @param base   Output when value = 0
 * @param scale  Added as value goes from 0 → 100
 * @returns      Modifier in [base, base + scale]
 */
export function linearModifier(
  value: number,
  base: number,
  scale: number
): number {
  return base + clamp(value, 0, 100) / 100 * scale;
}

/**
 * Sigmoid-shaped fatigue performance penalty.
 *
 * Returns a penalty fraction in [0, maxPenalty]:
 *   - 0 below onset threshold
 *   - Smooth ramp between onset and 90
 *   - Saturates at maxPenalty above 90
 *
 * This prevents a sudden cliff at a fixed minute.
 *
 * @param fatigue      Current fatigue value (0–100)
 * @param onset        Fatigue level at which penalty begins (e.g. 30)
 * @param maxPenalty   Maximum fraction penalty (e.g. 0.25)
 */
export function fatiguePenalty(
  fatigue: number,
  onset: number,
  maxPenalty: number
): number {
  if (fatigue <= onset) return 0;
  const rampRange = 90 - onset; // ramp zone: onset → 90
  const progress = clamp((fatigue - onset) / rampRange, 0, 1);
  // Smooth ease-in: slow start, accelerates toward max
  return maxPenalty * (progress * progress);
}

/**
 * Selects a value from a weighted discrete distribution.
 * Items with higher weights are selected more often.
 *
 * @param items  Array of (item, weight) pairs
 * @param rng    Seeded RNG instance
 * @returns      Selected item
 *
 * @throws if items is empty
 */
export function weightedChoice<T>(
  items: ReadonlyArray<readonly [item: T, weight: number]>,
  rng: SeededRNG
): T {
  if (items.length === 0) {
    throw new Error('weightedChoice: items array is empty');
  }
  const totalWeight = items.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (totalWeight === 0) {
    // Fallback to uniform choice
    return rng.choice(items.map(([item]) => item));
  }
  let threshold = rng.nextFloat() * totalWeight;
  for (const [item, weight] of items) {
    threshold -= Math.max(0, weight);
    if (threshold <= 0) return item;
  }
  // Fallback: return last item (floating point edge case)
  return items[items.length - 1]![0];
}

/**
 * Maps two competing values (attack vs defence, presser vs ball-carrier)
 * to a probability for the attacking/pressing side.
 *
 * Produces a value in (0, 1) — never reaches exactly 0 or 1.
 * Larger gap between values produces a more lopsided probability,
 * but the minP/maxP clamps prevent determinism.
 *
 * @param advantage    Advantage score (0–200)
 * @param disadvantage Disadvantage score (0–200)
 * @param minP         Minimum probability (anti-cheese floor)
 * @param maxP         Maximum probability (anti-cheese ceiling)
 */
export function duelProbability(
  advantage: number,
  disadvantage: number,
  minP = 0.10,
  maxP = 0.90
): number {
  const total = Math.max(advantage, 0) + Math.max(disadvantage, 0);
  if (total === 0) return 0.5;
  const raw = Math.max(advantage, 0) / total;
  return clamp(raw, minP, maxP);
}

/**
 * Validates that a result object has no NaN or Infinity values.
 * Used by ResultValidator post-simulation.
 *
 * @returns true if all numeric values are finite
 */
export function hasNoInvalidNumbers(obj: unknown): boolean {
  if (typeof obj === 'number') {
    return Number.isFinite(obj);
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).every(hasNoInvalidNumbers);
  }
  if (Array.isArray(obj)) {
    return (obj as unknown[]).every(hasNoInvalidNumbers);
  }
  return true;
}
