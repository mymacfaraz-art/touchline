// ─────────────────────────────────────────────────────────────────────────────
// PLAYER PROFILE BUILDER
//
// Constructs a complete PlayerSimulationProfile from a PlayerSimulationState.
// Called once per player at context-build time — never during the simulation.
// ─────────────────────────────────────────────────────────────────────────────

import { PlayerSimulationProfile } from '../match-state';
import { PlayerSimulationState } from '../../models/simulation-contracts';
import { SimulationConfig } from '../simulation-config';
import { computeCurrentAbilityForRole } from './ability-calculator';
import { getRoleWeights } from './role-weight-table';
import { computePositionSuitability, isGoalkeeperPosition } from './position-suitability';
import { clamp, linearModifier, weightedMean } from '../probability/probability-utils';
import { PlayerPosition } from '../../../domain/types/player';
import { PlayerRole } from '../../../domain/types/tactics';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE SUITABILITY
//
// Measures how well a player's primary position aligns with the demands of
// the assigned role. Separate from position suitability.
//
// A striker playing as DEFENSIVE_MIDFIELDER has bad role suitability even
// if they have nominally acceptable position scores.
// ─────────────────────────────────────────────────────────────────────────────

/** Position groups for role suitability grouping */
const GK_POSITIONS: PlayerPosition[] = ['GK'];
const DEFENDER_POSITIONS: PlayerPosition[] = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
const MIDFIELDER_POSITIONS: PlayerPosition[] = ['CDM', 'CM', 'CAM', 'LM', 'RM'];
const FORWARD_POSITIONS: PlayerPosition[] = ['LW', 'RW', 'CF', 'ST'];

/** Role groups matching the broad position groups */
const GK_ROLES: PlayerRole[] = ['GOALKEEPER', 'SWEEPER_KEEPER'];
const DEFENDER_ROLES: PlayerRole[] = [
  'CENTRAL_DEFENDER', 'BALL_PLAYING_DEFENDER', 'WIDE_CENTRE_BACK',
  'FULL_BACK', 'WING_BACK', 'INVERTED_WING_BACK',
];
const MIDFIELDER_ROLES: PlayerRole[] = [
  'DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'BOX_TO_BOX',
  'DEEP_LYING_PLAYMAKER', 'ADVANCED_PLAYMAKER', 'ATTACKING_MIDFIELDER',
  'WIDE_MIDFIELDER', 'WINGER', 'INVERTED_WINGER',
];
const FORWARD_ROLES: PlayerRole[] = [
  'PRESSING_FORWARD', 'CENTRE_FORWARD', 'FALSE_NINE', 'POACHER',
];

function positionGroup(pos: PlayerPosition): 'GK' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' {
  if (GK_POSITIONS.includes(pos)) return 'GK';
  if (DEFENDER_POSITIONS.includes(pos)) return 'DEFENDER';
  if (MIDFIELDER_POSITIONS.includes(pos)) return 'MIDFIELDER';
  return 'FORWARD';
}

function roleGroup(role: PlayerRole): 'GK' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' {
  if (GK_ROLES.includes(role)) return 'GK';
  if (DEFENDER_ROLES.includes(role)) return 'DEFENDER';
  if (MIDFIELDER_ROLES.includes(role)) return 'MIDFIELDER';
  return 'FORWARD';
}

/**
 * Computes how well a player's natural position group suits their assigned role.
 * Perfect match = 1.0. Adjacent groups (e.g. MIDFIELDER/FORWARD) = 0.75.
 * Crossing group boundaries = 0.50. GK mismatch = 0.35 (severe penalty).
 */
function computeRoleSuitability(
  primaryPosition: PlayerPosition,
  assignedRole: PlayerRole
): number {
  const posGroup = positionGroup(primaryPosition);
  const rlGroup = roleGroup(assignedRole);

  if (posGroup === rlGroup) return 1.00;

  // GK in any outfield role (or vice versa) is a severe mismatch
  if (posGroup === 'GK' || rlGroup === 'GK') return 0.35;

  // Adjacent groups (DEFENDER/MIDFIELDER or MIDFIELDER/FORWARD)
  if (
    (posGroup === 'DEFENDER' && rlGroup === 'MIDFIELDER') ||
    (posGroup === 'MIDFIELDER' && rlGroup === 'DEFENDER') ||
    (posGroup === 'MIDFIELDER' && rlGroup === 'FORWARD') ||
    (posGroup === 'FORWARD' && rlGroup === 'MIDFIELDER')
  ) {
    return 0.75;
  }

  // Remote (DEFENDER/FORWARD crossing)
  return 0.50;
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP SCORE CALCULATION
//
// Computes the role-weighted composite scores for each attribute group.
// These are the "technicalScore", "physicalScore", "mentalScore" fields.
// ─────────────────────────────────────────────────────────────────────────────

function computeGroupScores(
  attrs: PlayerSimulationState['player']['attributes'],
  role: PlayerRole
): { technicalScore: number; physicalScore: number; mentalScore: number; gkScore: number | null } {
  if (!attrs) {
    return { technicalScore: 0, physicalScore: 0, mentalScore: 0, gkScore: null };
  }

  const weights = getRoleWeights(role);
  const { technical: t, physical: p, mental: m, goalkeeping: g } = attrs;

  // Technical composite
  const techPairs: ReadonlyArray<readonly [number, number]> = (
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

  const physPairs: ReadonlyArray<readonly [number, number]> = (
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

  const mentPairs: ReadonlyArray<readonly [number, number]> = (
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

  const technicalScore = weightedMean(techPairs);
  const physicalScore = weightedMean(physPairs);
  const mentalScore = weightedMean(mentPairs);

  let gkScore: number | null = null;
  if (g) {
    const gkPairs: ReadonlyArray<readonly [number, number]> = (
      [
        [g.gkReflexes, weights.gkReflexes ?? 0],
        [g.gkHandling, weights.gkHandling ?? 0],
        [g.gkPositioning, weights.gkPositioning ?? 0],
        [g.gkKicking, weights.gkKicking ?? 0],
        [g.gkCommunication, weights.gkCommunication ?? 0],
      ] as [number, number][]
    ).filter(([, w]) => w > 0);
    gkScore = weightedMean(gkPairs) || 0;
  }

  return {
    technicalScore: clamp(technicalScore, 0, 99),
    physicalScore: clamp(physicalScore, 0, 99),
    mentalScore: clamp(mentalScore, 0, 99),
    gkScore: gkScore !== null ? clamp(gkScore, 0, 99) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD PLAYER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a complete PlayerSimulationProfile from a PlayerSimulationState.
 *
 * @param state   Input player state (from MatchSimulationInput)
 * @param teamId  The team this player belongs to
 * @param config  Simulation configuration (for modifier scale values)
 * @param homeAdvantageBonus  Morale bonus if this is a home player (0 for away)
 */
export function buildPlayerProfile(
  state: PlayerSimulationState,
  teamId: string,
  config: SimulationConfig,
  homeAdvantageBonus: number
): PlayerSimulationProfile {
  const player = state.player;
  const attrs = player.attributes;

  if (!attrs) {
    throw new Error(
      `buildPlayerProfile: player ${player.id} has no attributes. ` +
      'Ensure PlayerAttributes are loaded before passing to simulation.'
    );
  }

  const assignedRole = state.assignedRole;
  const assignedPosition = state.assignedPosition as PlayerPosition;

  // ── Ability ────────────────────────────────────────────────────────────────
  const abilityProfile = computeCurrentAbilityForRole(attrs, assignedRole);
  const currentAbility = abilityProfile.currentAbility;

  // ── Suitability ────────────────────────────────────────────────────────────
  const positionSuitability = computePositionSuitability(
    assignedPosition,
    player.primaryPosition,
    player.secondaryPositions
  );
  const roleSuitability = computeRoleSuitability(player.primaryPosition, assignedRole);

  // ── Group Scores ───────────────────────────────────────────────────────────
  const { technicalScore, physicalScore, mentalScore, gkScore } =
    computeGroupScores(attrs, assignedRole);

  // ── Condition Modifiers ────────────────────────────────────────────────────
  // Morale gets home advantage bonus before modifier computation
  const effectiveMorale = clamp(
    state.morale + (homeAdvantageBonus > 0 ? config.homeAdvantage.moraleBonus : 0),
    0,
    100
  );

  const fitnessModifier = linearModifier(
    state.fitness,
    config.fitnessModifierScale[0],
    config.fitnessModifierScale[1]
  );
  const moraleModifier = linearModifier(
    effectiveMorale,
    config.moraleModifierScale[0],
    config.moraleModifierScale[1]
  );
  const confidenceModifier = linearModifier(
    state.confidence,
    config.confidenceModifierScale[0],
    config.confidenceModifierScale[1]
  );
  const sharpnessModifier = linearModifier(
    state.sharpness,
    config.sharpnessModifierScale[0],
    config.sharpnessModifierScale[1]
  );
  const tacticalFamiliarityModifier = linearModifier(
    state.tacticalFamiliarity,
    config.tacticalFamiliarityModifierScale[0],
    config.tacticalFamiliarityModifierScale[1]
  );

  // Kick-off fatigue penalty (mild — heavy fatigue at kick-off is unusual)
  const kickoffFatigueModifier = 1.0 - (clamp(state.fatigue, 0, 100) / 100) * 0.12;

  // Combined condition multiplier
  const rawMultiplier =
    fitnessModifier *
    moraleModifier *
    confidenceModifier *
    sharpnessModifier *
    tacticalFamiliarityModifier *
    kickoffFatigueModifier;

  const conditionMultiplier = clamp(
    rawMultiplier,
    config.conditionMultiplierClamp[0],
    config.conditionMultiplierClamp[1]
  );

  // ── Effective Match Ability ────────────────────────────────────────────────
  // Also factors in role suitability as a multiplier
  const effectiveMatchAbility = clamp(
    Math.round(currentAbility * conditionMultiplier * roleSuitability),
    1,
    200
  );

  // ── Build Profile ──────────────────────────────────────────────────────────
  const profile: PlayerSimulationProfile = {
    playerId: player.id,
    teamId,
    assignedPosition,
    assignedRole,
    instructions: state.assignedRole
      ? (player as { instructions?: PlayerSimulationProfile['instructions'] }).instructions ?? []
      : [],
    isStarting: state.isStarting,

    rawAttributes: attrs,

    currentAbility,
    positionSuitability,
    roleSuitability,
    technicalScore,
    physicalScore,
    mentalScore,
    gkScore,

    fitnessModifier,
    moraleModifier,
    confidenceModifier,
    sharpnessModifier,
    tacticalFamiliarityModifier,

    effectiveMatchAbility,

    // Mutable — initialised at kick-off values
    currentFatigue: state.fatigue,
    minutesPlayed: 0,
    isOnPitch: state.isStarting,
    isInjured: state.isInjured,
    isSuspended: state.isSuspended,
  };

  return profile;
}

/**
 * Builds all player profiles for a team.
 * Excluded: injured or suspended players in starting XI (they cannot play).
 */
export function buildTeamPlayerProfiles(
  players: PlayerSimulationState[],
  teamId: string,
  config: SimulationConfig,
  homeAdvantageBonus: number
): PlayerSimulationProfile[] {
  return players
    .filter((p) => {
      // Remove players who cannot participate at all
      if (p.isSuspended) return false;
      if (p.isInjured && p.isStarting) return false; // Bench injured players kept (may be emergency)
      return true;
    })
    .map((p) => buildPlayerProfile(p, teamId, config, homeAdvantageBonus));
}
