// ─────────────────────────────────────────────────────────────────────────────
// POSSESSION RESOLVER
//
// Computes per-slot possession values from team profiles, tactics, and
// current match state. Every slot draws from a triangular distribution
// around the current expected possession.
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationState, TeamSimulationProfile } from '../match-state';
import { SimulationConfig } from '../simulation-config';
import { SeededRNG } from '../rng';
import { clamp, triangular } from './probability-utils';
import { TeamMentality, Tempo } from '../../../domain/types/tactics';
import { MENTALITY_POSSESSION_BIAS } from '../team/team-profile-builder';

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED POSSESSION
// ─────────────────────────────────────────────────────────────────────────────

const TEMPO_POSSESSION_BIAS: Record<Tempo, number> = {
  SLOW: -3.0,
  NORMAL: 0.0,
  HIGH: 3.5,
};

/**
 * Computes the structural expected possession for the home team
 * based on team profiles and tactics.
 *
 * Result is in the range [35, 65] — clamped hard.
 * This is the structural starting point before dynamic adjustments.
 */
export function computeExpectedPossession(
  homeTeam: TeamSimulationProfile,
  awayTeam: TeamSimulationProfile,
  config: SimulationConfig
): number {
  const base = 50;

  // Pass quality delta: better passing team keeps more possession
  const passQualityDelta = (homeTeam.buildUpQuality - awayTeam.buildUpQuality) / 100;
  // Normalised to [−1, +1], scaled by weight
  const passContribution = passQualityDelta * config.passWeightFactor;

  // Pressing: away pressing reduces home possession
  const pressureDelta = (awayTeam.pressureOutput - homeTeam.pressResistance) / 100;
  const pressContribution = -pressureDelta * config.pressWeightFactor;

  // Tempo: high tempo team often dictates play
  const homeTempoBias = TEMPO_POSSESSION_BIAS[homeTeam.tactics.tempo];
  const awayTempoBias = TEMPO_POSSESSION_BIAS[awayTeam.tactics.tempo];
  const tempoContribution = (homeTempoBias - awayTempoBias) * config.tempoWeightFactor / 10;

  // Mentality: more attacking = wants the ball more
  const homeMentalityBias = MENTALITY_POSSESSION_BIAS[homeTeam.tactics.mentality];
  const awayMentalityBias = MENTALITY_POSSESSION_BIAS[awayTeam.tactics.mentality];
  const mentalityContribution =
    (homeMentalityBias - awayMentalityBias) * config.mentalityWeightFactor / 10;

  const expected = base + passContribution + pressContribution + tempoContribution + mentalityContribution;

  // Hard clamp: no team realistically has 70%+ in contested match
  return clamp(expected, config.possessionClamp[0], config.possessionClamp[1]);
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC ADJUSTMENTS
//
// Applied to expected possession based on current match state.
// These shift the distribution as the match evolves.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the dynamic expected possession for the home team
 * in the current slot, based on structural expectation + match state.
 *
 * RNG CALL 1 in the slot ordering.
 */
export function resolveSlotPossession(
  state: MatchSimulationState,
  structuralExpected: number,
  config: SimulationConfig,
  rng: SeededRNG
): number {
  let expected = structuralExpected;

  const gd = state.homeScore - state.awayScore;

  // Score effect: losing team pushes harder (wants possession to attack)
  if (gd < 0) {
    // Home team is losing — they push forward
    expected += Math.min(5, Math.abs(gd) * 2.5);
  } else if (gd > 0) {
    // Home team is winning — they may drop possession intentionally (waste time)
    expected -= Math.min(3, gd * 1.5);
  }

  // Momentum effect: team with momentum gets more possession
  const momentumBonus = state.momentum * config.momentumPossessionWeight * 100;
  expected += momentumBonus;

  // Fatigue effect: high fatigue reduces ability to hold possession
  const homeFatigue = state.home.currentFatigueMean;
  const awayFatigue = state.away.currentFatigueMean;
  if (homeFatigue > 60) {
    expected -= ((homeFatigue - 60) / 100) * 10;
  }
  if (awayFatigue > 60) {
    expected += ((awayFatigue - 60) / 100) * 10;
  }

  // Red card: missing a player = significant possession disadvantage
  expected -= state.home.redCards * 8;
  expected += state.away.redCards * 8;

  // Clamp dynamic expected before drawing the slot value
  const clampedExpected = clamp(expected, config.possessionClamp[0], config.possessionClamp[1]);

  // RNG CALL 1: draw slot possession from triangular distribution
  const variance = config.possessionVariance;
  const slotPossession = triangular(
    clampedExpected - variance,
    clampedExpected,
    clampedExpected + variance,
    rng
  );

  return clamp(slotPossession, 0, 100);
}
