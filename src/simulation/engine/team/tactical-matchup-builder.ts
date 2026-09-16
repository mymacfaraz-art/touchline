// ─────────────────────────────────────────────────────────────────────────────
// TACTICAL MATCHUP BUILDER
//
// Computes the TacticalMatchupProfile from two opposing team tactical setups.
// Evaluates tactical interactions (HIGH_PRESS + VERY_HIGH_LINE, etc.)
// and produces the combined match intensity and pressure balance.
// ─────────────────────────────────────────────────────────────────────────────

import { DomainTactics, PressingIntensity, DefensiveLineHeight, Tempo, TeamMentality } from '../../../domain/types/tactics';
import { TacticalMatchupProfile } from '../match-state';

// ─────────────────────────────────────────────────────────────────────────────
// TACTICAL VALUE MAPPINGS
// ─────────────────────────────────────────────────────────────────────────────

const PRESSING_INTENSITY_VALUE: Record<PressingIntensity, number> = {
  LOW: 0.30,
  MEDIUM: 0.50,
  HIGH: 0.70,
  EXTREME: 0.90,
};

const DEFENSIVE_LINE_VALUE: Record<DefensiveLineHeight, number> = {
  DEEP: 0.20,
  STANDARD: 0.45,
  HIGH: 0.65,
  VERY_HIGH: 0.85,
};

const TEMPO_VALUE: Record<Tempo, number> = {
  SLOW: 0.30,
  NORMAL: 0.55,
  HIGH: 0.85,
};

const MENTALITY_INTENSITY: Record<TeamMentality, number> = {
  VERY_DEFENSIVE: 0.30,
  DEFENSIVE: 0.45,
  BALANCED: 0.55,
  ATTACKING: 0.70,
  VERY_ATTACKING: 0.85,
};

// ─────────────────────────────────────────────────────────────────────────────
// TEAM TACTICAL INTENSITY
//
// Measures how intense a team's overall tactical approach is.
// HIGH intensity = more fatigue, more open space, more volatility.
// ─────────────────────────────────────────────────────────────────────────────

function computeTeamIntensity(tactics: DomainTactics): number {
  const pressing = PRESSING_INTENSITY_VALUE[tactics.pressingIntensity];
  const mentality = MENTALITY_INTENSITY[tactics.mentality];
  const tempo = TEMPO_VALUE[tactics.tempo];

  // Weighted combination
  return pressing * 0.45 + mentality * 0.35 + tempo * 0.20;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESSURE OUTPUT
//
// How hard a team presses out of possession.
// ─────────────────────────────────────────────────────────────────────────────

function computePressureOutput(tactics: DomainTactics): number {
  let output = PRESSING_INTENSITY_VALUE[tactics.pressingIntensity] * 100;

  // Interactions
  if (
    tactics.pressingIntensity === 'HIGH' &&
    tactics.defensiveLine === 'VERY_HIGH'
  ) {
    output += 15; // Combined high press + high line = maximum pressure
  }

  if (
    tactics.pressingIntensity === 'EXTREME' &&
    tactics.mentality === 'VERY_ATTACKING'
  ) {
    output += 10; // Extreme press with attacking mentality amplifies output
  }

  // Out of possession modifiers
  if (tactics.outOfPossession === 'PRESS') {
    output += 8;
  } else if (tactics.outOfPossession === 'CONTAIN') {
    output -= 15; // Containing = structured, not aggressive
  } else if (tactics.outOfPossession === 'BLOCK') {
    output -= 8; // Deep block reduces pressing output
  }

  return Math.min(100, Math.max(0, output));
}

// ─────────────────────────────────────────────────────────────────────────────
// SPACE BEHIND DEFENSE
//
// How exposed a team is to through-balls and counter-attacks.
// ─────────────────────────────────────────────────────────────────────────────

function computeSpaceBehindDefense(tactics: DomainTactics): number {
  let space = DEFENSIVE_LINE_VALUE[tactics.defensiveLine];

  // HIGH press + HIGH line compounds exposure
  if (
    tactics.pressingIntensity === 'HIGH' &&
    (tactics.defensiveLine === 'HIGH' || tactics.defensiveLine === 'VERY_HIGH')
  ) {
    space += 0.20;
  }

  if (tactics.mentality === 'VERY_ATTACKING' && tactics.defensiveLine === 'VERY_HIGH') {
    space += 0.15;
  }

  return Math.min(1.0, Math.max(0, space));
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHUP BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the TacticalMatchupProfile from two opposing tactics.
 * The profile describes how both teams' approaches interact.
 *
 * @param homeTactics  The home team's tactical setup
 * @param awayTactics  The away team's tactical setup
 */
export function buildTacticalMatchup(
  homeTactics: DomainTactics,
  awayTactics: DomainTactics
): TacticalMatchupProfile {
  const homeIntensity = computeTeamIntensity(homeTactics);
  const awayIntensity = computeTeamIntensity(awayTactics);

  // Combined intensity = average + interaction bonus for two aggressive teams
  const combinedIntensity = (homeIntensity + awayIntensity) / 2;
  const intensityInteractionBonus =
    homeIntensity > 0.70 && awayIntensity > 0.70 ? 0.10 : 0;
  const intensityLevel = Math.min(1.0, combinedIntensity + intensityInteractionBonus);

  // Pressure outputs
  const homePressureOutput = computePressureOutput(homeTactics);
  const awayPressureOutput = computePressureOutput(awayTactics);

  // Pressure balance: positive = home dominates, negative = away dominates
  const pressureBalance = (homePressureOutput - awayPressureOutput) / 100;

  // Space balance: average exposed space across both defenses
  const homeSpace = computeSpaceBehindDefense(homeTactics);
  const awaySpace = computeSpaceBehindDefense(awayTactics);
  const spaceBalance = (homeSpace + awaySpace) / 2;

  return {
    pressureBalance,
    spaceBalance,
    intensityLevel,
    homePressureOutput,
    awayPressureOutput,
  };
}
