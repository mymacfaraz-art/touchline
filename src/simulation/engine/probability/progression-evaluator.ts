// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION & CHANCE EVALUATORS
//
// Three probability gates:
//   1. ProgressionEvaluator: Possession → Attacking Phase
//   2. ChanceGenerator:      Attacking Phase → Chance Created
//   3. ShotEvaluator:        Chance → Shot Attempt + xG
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationState, ChanceTier, ShotAttempt, PlayerSimulationProfile, TeamSimulationProfile } from '../match-state';
import { SimulationConfig } from '../simulation-config';
import { SeededRNG } from '../rng';
import { clamp, clampProbability, weightedChoice } from './probability-utils';
import { TeamMentality } from '../../../domain/types/tactics';

// ─────────────────────────────────────────────────────────────────────────────
// MENTALITY SHOT BIAS
// ─────────────────────────────────────────────────────────────────────────────

const MENTALITY_SHOT_BIAS: Record<TeamMentality, number> = {
  VERY_ATTACKING: 0.10,
  ATTACKING: 0.05,
  BALANCED: 0.00,
  DEFENSIVE: -0.05,
  VERY_DEFENSIVE: -0.10,
};

// ─────────────────────────────────────────────────────────────────────────────
// GATE 2: PROGRESSION EVALUATOR
//
// Determines whether a team in possession generates an attacking phase
// from this slot's possession share.
//
// RNG CALL 2 in the slot ordering.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the attacking team creates an attacking phase from possession.
 *
 * @param possessionPct   Home team possession % for this slot (0–100)
 * @param isHome          Whether we are evaluating the home team's attack
 * @param attackingTeam   The attacking team's profile
 * @param config          Simulation config
 * @param state           Current match state
 * @param rng             Seeded RNG
 */
export function evaluateProgression(
  possessionPct: number,
  isHome: boolean,
  attackingTeam: TeamSimulationProfile,
  config: SimulationConfig,
  state: MatchSimulationState,
  rng: SeededRNG  // RNG CALL 2
): boolean {
  // Effective possession for this team
  const teamPossession = isHome ? possessionPct : (100 - possessionPct);

  // Base probability: possession × progression quality
  let p =
    (teamPossession / 100) *
    attackingTeam.progressionQuality *
    config.progressionChanceBase +
    0.02;

  // Momentum bonus
  const momentumBonus = isHome
    ? state.momentum * config.momentumChanceWeight
    : -state.momentum * config.momentumChanceWeight;
  p += momentumBonus;

  // Cohesion improves structured build-up
  p += (attackingTeam.effectiveCohesion - 0.5) * 0.02;

  p = clampProbability(p, config.minProbability, config.maxProbability);

  return rng.nextFloat() < p;
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE 3: CHANCE GENERATOR
//
// Determines whether an attacking phase produces a clear chance.
//
// RNG CALL 3 in the slot ordering.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the attacking phase results in a chance.
 *
 * @param attackingTeam  The attacking team's profile
 * @param defendingTeam  The defending team's profile
 * @param config         Simulation config
 * @param state          Current match state
 * @param isHome         Whether we evaluate the home team's chance
 * @param rng            Seeded RNG
 */
export function evaluateChanceCreation(
  attackingTeam: TeamSimulationProfile,
  defendingTeam: TeamSimulationProfile,
  config: SimulationConfig,
  state: MatchSimulationState,
  isHome: boolean,
  rng: SeededRNG  // RNG CALL 3
): boolean {
  let p =
    attackingTeam.chanceCreationAbility * config.chanceFromProgressionBase;

  // Defensive vulnerability adds chance creation opportunity for attacker
  const defensiveVulnerability =
    1 - (defendingTeam.defensiveOrganisation / 100) * 0.8;
  p += defensiveVulnerability * 0.05;

  // Pressing vulnerability: if defending team presses hard and fails,
  // transitional spaces open
  if (defendingTeam.pressureOutput > 70 && attackingTeam.pressResistance > 60) {
    p += 0.008; // Breaking a high press creates clean chances
  }

  // Home advantage on chance creation
  if (isHome) {
    p += config.homeAdvantage.chanceCreationBonus;
  }

  p = clampProbability(p, config.minProbability, config.maxProbability);

  return rng.nextFloat() < p;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANCE TIER SELECTION
//
// Determines the quality tier of the chance created.
//
// RNG CALL 4 in the slot ordering.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base xG ranges per tier (min, mode, max).
 * Used to draw the specific xG value within the tier.
 */
const TIER_XG_RANGES: Record<ChanceTier, readonly [number, number, number]> = {
  CLEAR_CUT:   [0.45, 0.60, 0.75],
  GOOD:        [0.20, 0.30, 0.44],
  HALF_CHANCE: [0.08, 0.13, 0.19],
  LONG_RANGE:  [0.03, 0.05, 0.07],
  SPECULATIVE: [0.01, 0.015, 0.02],
};

/**
 * Weighted distribution of chance tiers.
 * Weights reflect realistic chance quality distributions in football.
 * In a typical match: most chances are HALF_CHANCE/LONG_RANGE; few are CLEAR_CUT.
 *
 * Adjusted by attacking quality:
 * - Better finishers get more GOOD/CLEAR_CUT weight
 * - Worse attacks get more LONG_RANGE/SPECULATIVE
 */
function buildTierWeights(
  attackingStrength: number  // 0–100
): ReadonlyArray<readonly [ChanceTier, number]> {
  // Normalised attacking strength [0, 1]
  const str = attackingStrength / 100;

  return [
    ['CLEAR_CUT',   1.0 + str * 2.0],   // 1.0–3.0
    ['GOOD',        3.0 + str * 3.0],   // 3.0–6.0
    ['HALF_CHANCE', 6.0],               // constant
    ['LONG_RANGE',  5.0 - str * 2.0],   // 5.0–3.0
    ['SPECULATIVE', 3.0 - str * 1.5],   // 3.0–1.5
  ] as const;
}

/**
 * Selects the chance tier based on attacking quality and match context.
 * RNG CALL 4.
 */
export function selectChanceTier(
  attackingTeam: TeamSimulationProfile,
  defendingTeam: TeamSimulationProfile,
  rng: SeededRNG  // RNG CALL 4
): ChanceTier {
  let weights = buildTierWeights(attackingTeam.attackingStrength);

  // High defensive vulnerability → shift toward better tiers
  if (defendingTeam.defensiveOrganisation < 40) {
    weights = weights.map(([tier, w]) =>
      tier === 'CLEAR_CUT' ? [tier, w + 1.5] :
      tier === 'GOOD' ? [tier, w + 1.0] :
      [tier, w]
    ) as ReadonlyArray<readonly [ChanceTier, number]>;
  }

  return weightedChoice(weights, rng);
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE 4: SHOT EVALUATOR
//
// Determines whether a chance becomes a shot attempt.
//
// RNG CALL 5 in the slot ordering.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the chance results in a shot attempt.
 */
export function evaluateShot(
  attackingTeam: TeamSimulationProfile,
  config: SimulationConfig,
  state: MatchSimulationState,
  isHome: boolean,
  rng: SeededRNG  // RNG CALL 5
): boolean {
  const mentality = isHome
    ? state.home.effectiveMentality
    : state.away.effectiveMentality;

  let p =
    attackingTeam.finishingQuality * config.shotFromChanceBase +
    MENTALITY_SHOT_BIAS[mentality];

  p = clampProbability(p, config.minProbability, config.maxProbability);

  return rng.nextFloat() < p;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACKER SELECTOR
//
// Picks the player most likely to take the shot from the attacking team.
// ─────────────────────────────────────────────────────────────────────────────

const SHOOTING_ROLES = new Set([
  'CENTRE_FORWARD', 'POACHER', 'PRESSING_FORWARD', 'FALSE_NINE',
  'ATTACKING_MIDFIELDER', 'WINGER', 'INVERTED_WINGER', 'BOX_TO_BOX',
]);

/**
 * Selects the most likely shooter from the on-pitch players.
 * Prioritises forwards and attacking midfielders, weighted by finishing.
 */
export function selectShooter(
  players: PlayerSimulationProfile[],
  rng: SeededRNG  // RNG CALL — consumed after shot tier
): PlayerSimulationProfile {
  const candidates = players.filter(
    (p) => p.isOnPitch && SHOOTING_ROLES.has(p.assignedRole)
  );

  if (candidates.length === 0) {
    // Fallback: anyone on pitch
    const available = players.filter((p) => p.isOnPitch);
    return available.length > 0 ? rng.choice(available) : players[0]!;
  }

  // Weight by finishing attribute (better finishers take more shots)
  const weighted: ReadonlyArray<readonly [PlayerSimulationProfile, number]> =
    candidates.map((p) => [p, p.rawAttributes.technical.finishing] as const);

  return weightedChoice(weighted, rng);
}
