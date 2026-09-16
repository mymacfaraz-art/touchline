// ─────────────────────────────────────────────────────────────────────────────
// XG CALCULATOR
//
// Computes the Expected Goals (xG) value for a shot attempt.
//
// Formula:
//   xG = baseXG(tier) × finishingModifier × pressureModifier
//        × angleModifier × bodyPartModifier × assistTypeModifier
//
// All modifiers are multiplicative in [0.5, 1.5].
// Final xG is clamped to [xgClamp.min, xgClamp.max] from config.
//
// RNG CALLS 6–9 in the slot ordering (for angle, pressure, assist type, header).
// ─────────────────────────────────────────────────────────────────────────────

import { ChanceTier, ShotAttempt, MicroAssistType } from '../match-state';
import { SimulationConfig, AssistType } from '../simulation-config';
import { SeededRNG } from '../rng';
import { clamp, triangular } from './probability-utils';
import { PlayerSimulationProfile } from '../match-state';
import { TeamSimulationProfile } from '../match-state';

// ─────────────────────────────────────────────────────────────────────────────
// BASE xG RANGES BY TIER
// ─────────────────────────────────────────────────────────────────────────────

/** [min, mode, max] xG for each chance tier */
const TIER_XG_RANGE: Record<ChanceTier, readonly [number, number, number]> = {
  CLEAR_CUT:   [0.45, 0.60, 0.75],
  GOOD:        [0.20, 0.30, 0.44],
  HALF_CHANCE: [0.08, 0.13, 0.19],
  LONG_RANGE:  [0.03, 0.05, 0.07],
  SPECULATIVE: [0.01, 0.015, 0.02],
};

// ─────────────────────────────────────────────────────────────────────────────
// MODIFIER FORMULAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finishing modifier: better finishers convert more of their xG into goals.
 * Range: [fitnessScale[0], fitnessScale[1]] = [0.7, 1.3]
 */
function finishingModifier(finishing: number, config: SimulationConfig): number {
  const [base, scale] = config.xgFinishingScale;
  // Linear: 0 finishing → base, 99 finishing → base + scale
  return clamp(base + (clamp(finishing, 1, 99) / 99) * scale, 0.5, 1.5);
}

/**
 * Pressure modifier: tightly marked shots have lower xG.
 * defensivePressure ∈ [0, 1]: 0 = open, 1 = tightly marked
 * Range: [1 - scale, 1.0] = [0.6, 1.0]
 */
function pressureModifier(defensivePressure: number, config: SimulationConfig): number {
  return clamp(1.0 - defensivePressure * config.xgPressureScale, 0.5, 1.0);
}

/**
 * Angle modifier: shots from central positions have higher xG.
 * anglePenalty ∈ [0, 1]: 0 = straight-on, 1 = extreme angle
 * Range: [0.5, 1.0]
 */
function angleModifier(anglePenalty: number): number {
  return clamp(0.5 + (1 - anglePenalty) * 0.5, 0.5, 1.0);
}

/**
 * Body part modifier: headers are inherently harder to score from.
 * Adjusted by heading attribute of the shooter.
 * Range: [0.55, 1.0] for headers; 1.0 for foot shots
 */
function bodyPartModifier(
  isHeader: boolean,
  headingAttribute: number,
  config: SimulationConfig
): number {
  if (!isHeader) return 1.0;
  // Base penalty + heading attribute partially compensates
  const headingBonus = (clamp(headingAttribute, 1, 99) / 99) * 0.25;
  return clamp(config.xgHeaderPenalty + headingBonus, 0.55, 1.0);
}

/**
 * Assist type modifier: how the chance was created affects shot quality.
 */
function assistTypeModifier(
  assistType: MicroAssistType,
  config: SimulationConfig
): number {
  return clamp(
    config.xgAssistModifiers[assistType as AssistType] ?? 1.0,
    0.5,
    1.5
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANGLE & ASSIST SELECTION
// ─────────────────────────────────────────────────────────────────────────────

/** Probability of a shot being a header by chance tier */
const HEADER_PROB_BY_TIER: Record<ChanceTier, number> = {
  CLEAR_CUT:   0.12,
  GOOD:        0.15,
  HALF_CHANCE: 0.20,
  LONG_RANGE:  0.05,
  SPECULATIVE: 0.03,
};

/** Angle distribution by tier: [minPenalty, mode, maxPenalty] */
const ANGLE_BY_TIER: Record<ChanceTier, readonly [number, number, number]> = {
  CLEAR_CUT:   [0.00, 0.05, 0.20],  // mostly central
  GOOD:        [0.00, 0.15, 0.40],
  HALF_CHANCE: [0.10, 0.30, 0.60],  // often under pressure/wide
  LONG_RANGE:  [0.05, 0.20, 0.50],
  SPECULATIVE: [0.20, 0.40, 0.80],  // often awkward angles
};

/** Assist type weights — realistic frequency of assist types */
const ASSIST_TYPE_WEIGHTS: ReadonlyArray<readonly [MicroAssistType, number]> = [
  ['layOff', 3.0],
  ['throughBall', 2.0],
  ['cross', 2.5],
  ['dribble', 2.0],
  ['setpiece', 1.0],
];

function selectAssistType(rng: SeededRNG): MicroAssistType {
  const totalWeight = ASSIST_TYPE_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let threshold = rng.nextFloat() * totalWeight;
  for (const [type, weight] of ASSIST_TYPE_WEIGHTS) {
    threshold -= weight;
    if (threshold <= 0) return type;
  }
  return 'layOff';
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFENSIVE PRESSURE FROM DEFENDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the defensive pressure on the shooter from the defending team.
 * Range: [0, 1] where 1 = maximum pressure.
 */
export function computeDefensivePressure(
  defendingTeam: TeamSimulationProfile,
  tier: ChanceTier
): number {
  // Base pressure from defensive organisation
  let pressure = (defendingTeam.defensiveOrganisation / 100) * 0.6;

  // CLEAR_CUT chances inherently have less defensive pressure (shot already on)
  if (tier === 'CLEAR_CUT') pressure *= 0.4;
  else if (tier === 'GOOD') pressure *= 0.65;
  else if (tier === 'HALF_CHANCE') pressure *= 0.90;
  else if (tier === 'LONG_RANGE') pressure *= 0.70;
  // SPECULATIVE: often unchallenged long shot
  else pressure *= 0.50;

  // Fatigue in defenders reduces pressure quality
  // (captured at team level as a mean modifier)
  return clamp(pressure, 0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN XG CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the full xG value for a shot at a given chance tier.
 *
 * RNG CALLS (in fixed order):
 *   Call 6:  base xG draw from triangular distribution
 *   Call 7:  angle penalty draw
 *   Call 8:  header probability check
 *   Call 9:  assist type selection
 *
 * @param tier           Quality tier of the chance
 * @param shooter        The player taking the shot
 * @param defendingTeam  The defending team's profile
 * @param config         Simulation config
 * @param rng            Seeded RNG (advances 4 positions)
 * @returns              ShotAttempt with xgValue and all contextual fields
 */
export function computeXg(
  tier: ChanceTier,
  shooter: PlayerSimulationProfile,
  defendingTeam: TeamSimulationProfile,
  config: SimulationConfig,
  rng: SeededRNG
): ShotAttempt {
  // RNG CALL 6: base xG from triangular distribution within tier range
  const [xgMin, xgMode, xgMax] = TIER_XG_RANGE[tier];
  const baseXg = triangular(xgMin, xgMode, xgMax, rng);

  // RNG CALL 7: angle penalty
  const [aPenMin, aPenMode, aPenMax] = ANGLE_BY_TIER[tier];
  const anglePenalty = triangular(aPenMin, aPenMode, aPenMax, rng);

  // RNG CALL 8: is this a header?
  const headerProb = HEADER_PROB_BY_TIER[tier];
  const isHeader = rng.nextFloat() < headerProb;

  // RNG CALL 9: assist type
  const assistType = selectAssistType(rng);

  // Penalty check: only CLEAR_CUT in specific context; simplified here
  const isPenalty = tier === 'CLEAR_CUT' && rng.nextFloat() < 0.18; // ~18% of CLEAR_CUT are penalties
  const isOneOnOne = tier === 'CLEAR_CUT' && !isPenalty && rng.nextFloat() < 0.40;

  // Defensive pressure
  const defensivePressure = computeDefensivePressure(defendingTeam, tier);

  // ── Apply modifiers ────────────────────────────────────────────────────────
  const fMod = finishingModifier(
    isPenalty
      ? shooter.rawAttributes.technical.penaltyTaking
      : shooter.rawAttributes.technical.finishing,
    config
  );
  const pMod = isPenalty ? 1.0 : pressureModifier(defensivePressure, config); // No pressure on penalty
  const aMod = isPenalty ? 1.0 : angleModifier(anglePenalty); // Penalty always straight-on
  const bMod = bodyPartModifier(isHeader, shooter.rawAttributes.technical.heading, config);
  const astMod = isPenalty ? 1.0 : assistTypeModifier(assistType, config);

  const rawXg = baseXg * fMod * pMod * aMod * bMod * astMod;

  // Penalty xG override: always in 0.70–0.78 range
  const finalXg = isPenalty
    ? clamp(0.74 + (rng.nextFloat() - 0.5) * 0.08, 0.70, 0.78)
    : clamp(rawXg, config.xgClamp[0], config.xgClamp[1]);

  return {
    tier,
    xgValue: finalXg,
    isHeader,
    isPenalty,
    isOneOnOne,
    defensivePressure,
    shooterProfile: shooter,
  };
}
