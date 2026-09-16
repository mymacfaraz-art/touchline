// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION CONFIGURATION
//
// All tunable numeric constants for the match simulation engine live here.
// NO inline magic numbers are permitted in any engine file.
//
// Values are INITIAL TUNABLE CONSTANTS — not empirically derived from
// real-world data and not ML-learned. They are calibrated via Monte Carlo
// runs against the targets documented in each section.
//
// Configuration is versioned (configVersion). Breaking changes to the
// schema increment the version string so migration logic can detect them.
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationConfig {
  readonly configVersion: string;

  // ── Match Structure ───────────────────────────────────────────────────────
  /** Standard match duration (minutes) */
  readonly matchDurationMinutes: number;
  /** Number of simulation slots per regulation half */
  readonly slotsPerHalf: number;
  /** [min, max] additional stoppage-time slots for first half */
  readonly stoppageTimeSlotsFirst: readonly [number, number];
  /** [min, max] additional stoppage-time slots for second half */
  readonly stoppageTimeSlotsSecond: readonly [number, number];

  // ── Possession ───────────────────────────────────────────────────────────
  /**
   * ±% variance per slot drawn from triangular distribution.
   * A higher value means more slot-to-slot possession volatility.
   * Calibration target: realistic 55/45 splits in practice.
   */
  readonly possessionVariance: number;
  readonly passWeightFactor: number;
  readonly pressWeightFactor: number;
  readonly tempoWeightFactor: number;
  readonly mentalityWeightFactor: number;
  /** Hard clamps on expected possession [min%, max%] */
  readonly possessionClamp: readonly [number, number];

  // ── Chance Creation ───────────────────────────────────────────────────────
  /** P(attacking phase) = possessionBase × progressionQuality × this + 0.02 */
  readonly progressionChanceBase: number;
  /** P(chance | attacking phase) = chanceCreationAbility × this + pressingBonus */
  readonly chanceFromProgressionBase: number;
  /** P(shot | chance) = finishingQuality × this + mentalityBias */
  readonly shotFromChanceBase: number;

  // ── xG Coefficients ───────────────────────────────────────────────────────
  /** [min, max] scale for finishing modifier on xG */
  readonly xgFinishingScale: readonly [number, number];
  /** How much defensive pressure reduces xG (multiplied by pressure [0,1]) */
  readonly xgPressureScale: number;
  /** xG multiplier for headers (inherently less accurate) */
  readonly xgHeaderPenalty: number;
  /** xG multipliers by assist type */
  readonly xgAssistModifiers: Readonly<Record<AssistType, number>>;
  /** Clamp for final xG value [min, max] */
  readonly xgClamp: readonly [number, number];

  // ── Fatigue ───────────────────────────────────────────────────────────────
  /** Base fatigue accumulated per slot for an average-stamina player */
  readonly fatigueBaseRate: number;
  /** Reduction per stamina point (70 stamina → −0.56 per slot) */
  readonly fatigueStaminaReduction: number;
  /** Extra fatigue contributed by match intensity per slot */
  readonly fatigueIntensityFactor: number;
  /** Extra fatigue added when pressing > HIGH */
  readonly fatiguePressBonus: number;
  /** Fatigue at which performance degradation begins (0–100) */
  readonly fatigueOnsetThreshold: number;
  /** Maximum performance penalty from fatigue alone (fraction: 0.25 = 25%) */
  readonly fatigueMaxPenalty: number;

  // ── Cards & Injuries ─────────────────────────────────────────────────────
  readonly cardRates: Readonly<{
    /** P(yellow card) per slot per team (before multipliers) */
    yellowBaseRate: number;
  }>;
  readonly injuryRates: Readonly<{
    /** P(injury) per slot (before fatigue + intensity multipliers) */
    baseRate: number;
    /** Fatigue scaling: injury multiplier ramps from 1.0 at onset to this at full fatigue */
    fatigueScale: number;
    /**
     * Severity distribution: [MINOR, MODERATE, SEVERE, CAREER_THREATENING]
     * Must sum to 1.0
     */
    severityDistribution: readonly [number, number, number, number];
  }>;

  // ── Home Advantage ────────────────────────────────────────────────────────
  readonly homeAdvantage: Readonly<{
    /** +N% expected possession (e.g. 3.0) */
    possessionBonus: number;
    /** +N morale input points before modifier calculation */
    moraleBonus: number;
    /** additive bonus to P(chance creation) */
    chanceCreationBonus: number;
    /** additive bonus to P(goal | shot) */
    goalConversionBonus: number;
  }>;

  // ── Momentum ─────────────────────────────────────────────────────────────
  /** Fraction of momentum that decays to 0 per slot */
  readonly momentumDecayRate: number;
  /** How much momentum shifts P(chance creation) */
  readonly momentumChanceWeight: number;
  /** How much momentum shifts expected possession */
  readonly momentumPossessionWeight: number;

  // ── Pressing ─────────────────────────────────────────────────────────────
  /** Multiplier on turnover probability from pressing: [0.02, 0.35] */
  readonly pressEffectivenessConstant: number;

  // ── Anti-Cheese Clamps ────────────────────────────────────────────────────
  /** No probability may be set below this value */
  readonly minProbability: number;
  /** No probability may be set above this value */
  readonly maxProbability: number;

  // ── Condition Modifiers ───────────────────────────────────────────────────
  /** [scale_base, scale_multiplier] for fitness → modifier: base + (val/100) × mult */
  readonly fitnessModifierScale: readonly [number, number];
  readonly moraleModifierScale: readonly [number, number];
  readonly confidenceModifierScale: readonly [number, number];
  readonly sharpnessModifierScale: readonly [number, number];
  readonly tacticalFamiliarityModifierScale: readonly [number, number];
  /** Hard [min, max] clamp on the combined condition multiplier */
  readonly conditionMultiplierClamp: readonly [number, number];

  // ── Goalkeeper ────────────────────────────────────────────────────────────
  /** P(save) clamp [min, max] */
  readonly gkSaveProbabilityClamp: readonly [number, number];

  // ── Performance Ratings ───────────────────────────────────────────────────
  /** Goal bonus added to match rating */
  readonly ratingGoalBonus: number;
  /** Assist bonus added to match rating */
  readonly ratingAssistBonus: number;
  /** Key pass bonus per key pass */
  readonly ratingKeyPassBonus: number;
  /** xG contribution per unit of xG generated */
  readonly ratingXgBonus: number;
  /** Penalty per yellow card */
  readonly ratingYellowPenalty: number;
  /** Penalty per red card */
  readonly ratingRedPenalty: number;
  /** Bonus/penalty for team result */
  readonly ratingWinBonus: number;
  readonly ratingLossPenalty: number;
  /** [min, max] clamp for final player rating */
  readonly ratingClamp: readonly [number, number];
}

export type AssistType = 'throughBall' | 'cross' | 'dribble' | 'layOff' | 'setpiece';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION — Phase 3 v1.0.0
//
// These values are starting calibration points.
// Adjust via Monte Carlo runs without changing code.
// Calibration targets are documented inline.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SIMULATION_CONFIG: Readonly<SimulationConfig> = Object.freeze({
  configVersion: '1.0.0',

  // Match structure
  matchDurationMinutes: 90,
  slotsPerHalf: 15,
  stoppageTimeSlotsFirst: [1, 3] as const,
  stoppageTimeSlotsSecond: [2, 5] as const,

  // Possession — target: equal teams produce 50% ± ~8% possession
  possessionVariance: 12,
  passWeightFactor: 10.0,
  pressWeightFactor: 8.0,
  tempoWeightFactor: 5.0,
  mentalityWeightFactor: 7.0,
  possessionClamp: [35, 65] as const,

  // Chance creation — target: ~2.5 attacking phases per half average
  progressionChanceBase: 0.012,
  chanceFromProgressionBase: 0.008,
  shotFromChanceBase: 0.006,

  // xG — target: realistic chance quality distribution
  xgFinishingScale: [0.7, 1.3] as const,
  xgPressureScale: 0.4,
  xgHeaderPenalty: 0.75,
  xgAssistModifiers: {
    throughBall: 1.20,
    cross: 0.85,
    dribble: 1.00,
    layOff: 1.10,
    setpiece: 0.90,
  },
  xgClamp: [0.01, 0.95] as const,

  // Fatigue — target: 70-stamina player at ~20–25 fatigue after 90 mins
  fatigueBaseRate: 1.2,
  fatigueStaminaReduction: 0.008,
  fatigueIntensityFactor: 0.8,
  fatiguePressBonus: 0.6,
  fatigueOnsetThreshold: 30,
  fatigueMaxPenalty: 0.25,

  // Cards — target: ~3–4 yellows per match across both teams
  cardRates: {
    yellowBaseRate: 0.006,
  },

  // Injuries — target: ~1 injury per 3–4 simulated matches
  injuryRates: {
    baseRate: 0.003,
    fatigueScale: 2.0,
    severityDistribution: [0.60, 0.30, 0.08, 0.02] as const,
  },

  // Home advantage — Monte Carlo target: equal teams → home 40% / draw 28% / away 32%
  homeAdvantage: {
    possessionBonus: 3.0,
    moraleBonus: 4.0,
    chanceCreationBonus: 0.04,
    goalConversionBonus: 0.02,
  },

  // Momentum — decays to 0 in ~7 slots
  momentumDecayRate: 0.15,
  momentumChanceWeight: 0.08,
  momentumPossessionWeight: 0.05,

  // Pressing
  pressEffectivenessConstant: 0.25,

  // Anti-cheese
  minProbability: 0.02,
  maxProbability: 0.98,

  // Condition modifiers: value = base + (attr/100) × scale
  fitnessModifierScale: [0.85, 0.30] as const,     // 100→1.15, 50→1.00, 0→0.85
  moraleModifierScale: [0.90, 0.20] as const,      // 100→1.10, 50→1.00, 0→0.90
  confidenceModifierScale: [0.92, 0.16] as const,  // 100→1.08, 50→1.00, 0→0.92
  sharpnessModifierScale: [0.88, 0.24] as const,   // 100→1.12, 50→1.00, 0→0.88
  tacticalFamiliarityModifierScale: [0.90, 0.20] as const, // 100→1.10, 50→1.00
  conditionMultiplierClamp: [0.55, 1.20] as const,

  // Goalkeeper
  gkSaveProbabilityClamp: [0.05, 0.95] as const,

  // Performance ratings
  ratingGoalBonus: 1.20,
  ratingAssistBonus: 0.70,
  ratingKeyPassBonus: 0.15,
  ratingXgBonus: 0.80,
  ratingYellowPenalty: 0.50,
  ratingRedPenalty: 2.00,
  ratingWinBonus: 0.30,
  ratingLossPenalty: 0.20,
  ratingClamp: [4.0, 10.0] as const,
});

/**
 * Merges a partial config override with the default config.
 * The override takes precedence for any fields provided.
 * The result is frozen to prevent accidental mutation at runtime.
 */
export function resolveConfig(
  override?: Partial<SimulationConfig>
): Readonly<SimulationConfig> {
  if (!override) return DEFAULT_SIMULATION_CONFIG;
  return Object.freeze({ ...DEFAULT_SIMULATION_CONFIG, ...override });
}
