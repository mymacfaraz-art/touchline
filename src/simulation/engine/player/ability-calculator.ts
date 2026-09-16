// ─────────────────────────────────────────────────────────────────────────────
// ABILITY CALCULATOR
//
// Implements the two ability computation contracts from simulation-contracts.ts:
//
//   1. ComputeCurrentAbility  — position-weighted aggregate from trained attributes
//   2. ComputeEffectiveMatchAbility — current ability × condition/context modifiers
//
// Neither result is ever persisted. Both are computed at context-build time.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CurrentAbilityProfile,
  EffectiveMatchAbilityProfile,
  MatchAbilityContext,
} from '../../models/simulation-contracts';
import { PlayerAttributes, PlayerPosition } from '../../../domain/types/player';
import { PlayerRole } from '../../../domain/types/tactics';
import { SimulationConfig } from '../simulation-config';
import { getRoleWeights, RoleWeightVector } from './role-weight-table';
import { clamp, linearModifier, weightedMean } from '../probability/probability-utils';

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTE EXTRACTION HELPERS
//
// Convert the nested PlayerAttributes structure into flat (value, weight) pairs
// for a given RoleWeightVector.
// ─────────────────────────────────────────────────────────────────────────────

interface ScoredAttribute {
  value: number;
  weight: number;
}

/**
 * Flattens all attributes from all groups into a list of (value, weight) pairs
 * using the role weight vector. Attributes with weight 0 are excluded.
 */
function extractWeightedAttributes(
  attrs: PlayerAttributes,
  weights: RoleWeightVector
): ScoredAttribute[] {
  const result: ScoredAttribute[] = [];

  function add(value: number, weight: number | undefined) {
    if (weight && weight > 0) {
      result.push({ value: clamp(value, 1, 99), weight });
    }
  }

  const { technical: t, physical: p, mental: m, goalkeeping: g } = attrs;

  // Technical
  add(t.passing, weights.passing);
  add(t.longPassing, weights.longPassing);
  add(t.crossing, weights.crossing);
  add(t.finishing, weights.finishing);
  add(t.firstTouch, weights.firstTouch);
  add(t.dribbling, weights.dribbling);
  add(t.ballControl, weights.ballControl);
  add(t.heading, weights.heading);
  add(t.tackling, weights.tackling);
  add(t.marking, weights.marking);
  add(t.freeKick, weights.freeKick);
  add(t.penaltyTaking, weights.penaltyTaking);

  // Physical
  add(p.acceleration, weights.acceleration);
  add(p.pace, weights.pace);
  add(p.stamina, weights.stamina);
  add(p.strength, weights.strength);
  add(p.agility, weights.agility);
  add(p.balance, weights.balance);
  add(p.jumping, weights.jumping);
  add(p.naturalFitness, weights.naturalFitness);

  // Mental
  add(m.composure, weights.composure);
  add(m.decisions, weights.decisions);
  add(m.vision, weights.vision);
  add(m.anticipation, weights.anticipation);
  add(m.positioning, weights.positioning);
  add(m.concentration, weights.concentration);
  add(m.workRate, weights.workRate);
  add(m.aggression, weights.aggression);
  add(m.leadership, weights.leadership);
  add(m.teamwork, weights.teamwork);
  add(m.adaptability, weights.adaptability);

  // Goalkeeping (only present for GK)
  if (g) {
    add(g.gkReflexes, weights.gkReflexes);
    add(g.gkHandling, weights.gkHandling);
    add(g.gkPositioning, weights.gkPositioning);
    add(g.gkKicking, weights.gkKicking);
    add(g.gkCommunication, weights.gkCommunication);
  } else {
    // Non-GK playing in goal has baseline minimum for GK-specific attributes
    add(1, weights.gkReflexes);
    add(1, weights.gkHandling);
    add(1, weights.gkPositioning);
    add(1, weights.gkKicking);
    add(1, weights.gkCommunication);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP SCORE HELPERS
//
// Separate weighted means for technical / physical / mental / gk groups.
// Used for the breakdown in CurrentAbilityProfile.
// ─────────────────────────────────────────────────────────────────────────────

interface AttributeGroupScores {
  technical: number;   // 0–99
  physical: number;    // 0–99
  mental: number;      // 0–99
  goalkeeping: number; // 0–99
}

function computeGroupScores(
  attrs: PlayerAttributes,
  weights: RoleWeightVector
): AttributeGroupScores {
  const t = attrs.technical;
  const p = attrs.physical;
  const m = attrs.mental;
  const g = attrs.goalkeeping;

  const technicalPairs: ReadonlyArray<readonly [number, number]> = (
    [
      [t.passing, weights.passing ?? 0],
      [t.longPassing, weights.longPassing ?? 0],
      [t.crossing, weights.crossing ?? 0],
      [t.finishing, weights.finishing ?? 0],
      [t.firstTouch, weights.firstTouch ?? 0],
      [t.dribbling, weights.dribbling ?? 0],
      [t.ballControl, weights.ballControl ?? 0],
      [t.heading, weights.heading ?? 0],
      [t.tackling, weights.tackling ?? 0],
      [t.marking, weights.marking ?? 0],
      [t.freeKick, weights.freeKick ?? 0],
      [t.penaltyTaking, weights.penaltyTaking ?? 0],
    ] as [number, number][]
  ).filter(([, w]) => w > 0);

  const physicalPairs: ReadonlyArray<readonly [number, number]> = (
    [
      [p.acceleration, weights.acceleration ?? 0],
      [p.pace, weights.pace ?? 0],
      [p.stamina, weights.stamina ?? 0],
      [p.strength, weights.strength ?? 0],
      [p.agility, weights.agility ?? 0],
      [p.balance, weights.balance ?? 0],
      [p.jumping, weights.jumping ?? 0],
      [p.naturalFitness, weights.naturalFitness ?? 0],
    ] as [number, number][]
  ).filter(([, w]) => w > 0);

  const mentalPairs: ReadonlyArray<readonly [number, number]> = (
    [
      [m.composure, weights.composure ?? 0],
      [m.decisions, weights.decisions ?? 0],
      [m.vision, weights.vision ?? 0],
      [m.anticipation, weights.anticipation ?? 0],
      [m.positioning, weights.positioning ?? 0],
      [m.concentration, weights.concentration ?? 0],
      [m.workRate, weights.workRate ?? 0],
      [m.aggression, weights.aggression ?? 0],
      [m.leadership, weights.leadership ?? 0],
      [m.teamwork, weights.teamwork ?? 0],
      [m.adaptability, weights.adaptability ?? 0],
    ] as [number, number][]
  ).filter(([, w]) => w > 0);

  const gkPairs: ReadonlyArray<readonly [number, number]> = g
    ? (
        [
          [g.gkReflexes, weights.gkReflexes ?? 0],
          [g.gkHandling, weights.gkHandling ?? 0],
          [g.gkPositioning, weights.gkPositioning ?? 0],
          [g.gkKicking, weights.gkKicking ?? 0],
          [g.gkCommunication, weights.gkCommunication ?? 0],
        ] as [number, number][]
      ).filter(([, w]) => w > 0)
    : [];

  return {
    technical: weightedMean(technicalPairs) || 0,
    physical: weightedMean(physicalPairs) || 0,
    mental: weightedMean(mentalPairs) || 0,
    goalkeeping: weightedMean(gkPairs) || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSITION → ROLE MAPPING
//
// When no explicit role is provided, derive the most likely role from position.
// Used only for the ComputeCurrentAbility contract (no role context available).
// ─────────────────────────────────────────────────────────────────────────────

const POSITION_DEFAULT_ROLE: Record<PlayerPosition, PlayerRole> = {
  GK: 'GOALKEEPER',
  CB: 'CENTRAL_DEFENDER',
  LB: 'FULL_BACK',
  RB: 'FULL_BACK',
  LWB: 'WING_BACK',
  RWB: 'WING_BACK',
  CDM: 'DEFENSIVE_MIDFIELDER',
  CM: 'CENTRAL_MIDFIELDER',
  CAM: 'ATTACKING_MIDFIELDER',
  LM: 'WIDE_MIDFIELDER',
  RM: 'WIDE_MIDFIELDER',
  LW: 'WINGER',
  RW: 'WINGER',
  CF: 'CENTRE_FORWARD',
  ST: 'CENTRE_FORWARD',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE CURRENT ABILITY
//
// Maps weighted attribute mean (0–99) to internal ability scale (1–200).
//
// Mapping: ability = mean × (200/99) ≈ mean × 2.02
//   An average player with all attributes at 50 → ability ≈ 101
//   An elite player with role-relevant attributes at 90 → ability ≈ 182
//   A novice with all attributes at 20 → ability ≈ 40
// ─────────────────────────────────────────────────────────────────────────────

const ATTR_TO_ABILITY_SCALE = 200 / 99; // ≈ 2.0202...

/**
 * Computes a player's current ability from their trained attributes.
 * Uses the role-specific weight vector for the player's primary position.
 *
 * Implements the ComputeCurrentAbility contract from simulation-contracts.ts.
 */
export function computeCurrentAbility(
  attributes: PlayerAttributes,
  position: PlayerPosition
): CurrentAbilityProfile {
  const role = POSITION_DEFAULT_ROLE[position];
  const weights = getRoleWeights(role);

  const allWeighted = extractWeightedAttributes(attributes, weights);

  if (allWeighted.length === 0) {
    // Edge case: no weighted attributes at all (malformed data)
    return { currentAbility: 1, breakdown: { technical: 0, physical: 0, mental: 0, goalkeeping: 0 } };
  }

  const rawMean = weightedMean(
    allWeighted.map((a) => [a.value, a.weight] as const)
  );

  const currentAbility = clamp(
    Math.round(rawMean * ATTR_TO_ABILITY_SCALE),
    1,
    200
  );

  const groups = computeGroupScores(attributes, weights);

  return {
    currentAbility,
    breakdown: {
      technical: Math.round(groups.technical),
      physical: Math.round(groups.physical),
      mental: Math.round(groups.mental),
      goalkeeping: Math.round(groups.goalkeeping),
    },
  };
}

/**
 * Computes current ability using a specific role (rather than the default for
 * the player's position). Used when the simulation has an explicit role assignment.
 */
export function computeCurrentAbilityForRole(
  attributes: PlayerAttributes,
  role: PlayerRole
): CurrentAbilityProfile {
  const weights = getRoleWeights(role);
  const allWeighted = extractWeightedAttributes(attributes, weights);

  if (allWeighted.length === 0) {
    return { currentAbility: 1, breakdown: { technical: 0, physical: 0, mental: 0, goalkeeping: 0 } };
  }

  const rawMean = weightedMean(
    allWeighted.map((a) => [a.value, a.weight] as const)
  );

  const currentAbility = clamp(Math.round(rawMean * ATTR_TO_ABILITY_SCALE), 1, 200);
  const groups = computeGroupScores(attributes, weights);

  return {
    currentAbility,
    breakdown: {
      technical: Math.round(groups.technical),
      physical: Math.round(groups.physical),
      mental: Math.round(groups.mental),
      goalkeeping: Math.round(groups.goalkeeping),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE EFFECTIVE MATCH ABILITY
//
// Takes current ability and applies condition/context multipliers.
//
// Modifier formula: modifier = base + (value/100) × scale
// Combined modifier = product of all individual modifiers
// Hard clamped to [0.55, 1.20]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the effective match ability for a player given their current ability
 * and full match context (condition, role, home advantage).
 *
 * Implements the ComputeEffectiveMatchAbility contract from simulation-contracts.ts.
 */
export function computeEffectiveMatchAbility(
  currentAbilityProfile: CurrentAbilityProfile,
  context: MatchAbilityContext,
  config: SimulationConfig
): EffectiveMatchAbilityProfile {
  const { condition } = context;

  // Individual modifiers from config scales
  const fitnessM = linearModifier(
    condition.fitness,
    config.fitnessModifierScale[0],
    config.fitnessModifierScale[1]
  );
  const moraleM = linearModifier(
    condition.morale,
    config.moraleModifierScale[0],
    config.moraleModifierScale[1]
  );
  const confidenceM = linearModifier(
    condition.confidence,
    config.confidenceModifierScale[0],
    config.confidenceModifierScale[1]
  );
  const sharpnessM = linearModifier(
    condition.sharpness,
    config.sharpnessModifierScale[0],
    config.sharpnessModifierScale[1]
  );
  const tfM = linearModifier(
    condition.tacticalFamiliarity,
    config.tacticalFamiliarityModifierScale[0],
    config.tacticalFamiliarityModifierScale[1]
  );

  // Fatigue is inverted: high fatigue is bad
  // (fatigue is already modelled in-match by FatigueUpdater;
  //  here we apply initial kick-off fatigue from the condition snapshot)
  const kickoffFatigueM = 1.0 - (clamp(condition.fatigue, 0, 100) / 100) * 0.12;
  // At kick-off fatigue=0 → ×1.0, fatigue=100 → ×0.88

  // Home advantage bonus (optional)
  const homeM = 1.0 + (context.homeAdvantageBonus ?? 0);

  // Combined multiplier: product of all modifiers
  const rawCombined =
    fitnessM * moraleM * confidenceM * sharpnessM * tfM * kickoffFatigueM * homeM;

  const conditionMultiplier = clamp(
    rawCombined,
    config.conditionMultiplierClamp[0],
    config.conditionMultiplierClamp[1]
  );

  const effectiveAbility = clamp(
    Math.round(currentAbilityProfile.currentAbility * conditionMultiplier),
    1,
    200
  );

  return {
    effectiveAbility,
    conditionMultiplier,
    conditionBreakdown: {
      fitnessContribution: fitnessM,
      moraleContribution: moraleM,
      sharpnessContribution: sharpnessM,
      confidenceContribution: confidenceM,
      tacticalFamiliarityContribution: tfM,
      roleSuitabilityContribution: 1.0, // Applied by PlayerProfileBuilder, not here
    },
  };
}
