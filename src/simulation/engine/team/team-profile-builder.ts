// ─────────────────────────────────────────────────────────────────────────────
// TEAM PROFILE BUILDER
//
// Builds the TeamSimulationProfile from player profiles + tactics.
// All dimensions are computed from player abilities — no independent scores.
// ─────────────────────────────────────────────────────────────────────────────

import { PlayerSimulationProfile, TeamSimulationProfile } from '../match-state';
import { TeamSimulationState } from '../../models/simulation-contracts';
import { SimulationConfig } from '../simulation-config';
import { DomainTactics, TeamMentality, Width, DefensiveLineHeight } from '../../../domain/types/tactics';
import { clamp } from '../probability/probability-utils';

// ─────────────────────────────────────────────────────────────────────────────
// MENTALITY MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/** Possession bias added to expected possession base from mentality */
export const MENTALITY_POSSESSION_BIAS: Record<TeamMentality, number> = {
  VERY_ATTACKING: 3.0,
  ATTACKING: 1.5,
  BALANCED: 0.0,
  DEFENSIVE: -1.5,
  VERY_DEFENSIVE: -3.0,
};

/** Width factor: −1.0 (narrow) to +1.0 (wide) */
const WIDTH_FACTOR: Record<Width, number> = {
  NARROW: -1.0,
  NORMAL: 0.0,
  WIDE: 1.0,
};

const DEFENSIVE_LINE_DEPTH: Record<DefensiveLineHeight, number> = {
  DEEP: 0.85,
  STANDARD: 0.55,
  HIGH: 0.35,
  VERY_HIGH: 0.15,
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER SUBSET SELECTORS
// ─────────────────────────────────────────────────────────────────────────────

/** Role groups for computing dimension scores */
const GOALKEEPER_ROLES = new Set(['GOALKEEPER', 'SWEEPER_KEEPER']);
const DEFENSIVE_ROLES = new Set([
  'CENTRAL_DEFENDER', 'BALL_PLAYING_DEFENDER', 'WIDE_CENTRE_BACK',
  'FULL_BACK', 'WING_BACK', 'INVERTED_WING_BACK',
]);
const MIDFIELDER_ROLES = new Set([
  'DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'BOX_TO_BOX',
  'DEEP_LYING_PLAYMAKER', 'ADVANCED_PLAYMAKER', 'ATTACKING_MIDFIELDER',
  'WIDE_MIDFIELDER', 'WINGER', 'INVERTED_WINGER',
]);
const FORWARD_ROLES = new Set(['PRESSING_FORWARD', 'CENTRE_FORWARD', 'FALSE_NINE', 'POACHER']);

const WIDE_ROLES = new Set(['FULL_BACK', 'WING_BACK', 'INVERTED_WING_BACK', 'WINGER', 'INVERTED_WINGER', 'WIDE_MIDFIELDER', 'WIDE_CENTRE_BACK']);
const BUILD_UP_ROLES = new Set(['BALL_PLAYING_DEFENDER', 'DEEP_LYING_PLAYMAKER', 'DEFENSIVE_MIDFIELDER', 'CENTRAL_MIDFIELDER']);

function meanAbility(players: PlayerSimulationProfile[]): number {
  if (players.length === 0) return 0;
  return players.reduce((sum, p) => sum + p.effectiveMatchAbility, 0) / players.length;
}

function meanTechnical(players: PlayerSimulationProfile[]): number {
  if (players.length === 0) return 0;
  return players.reduce((sum, p) => sum + p.technicalScore, 0) / players.length;
}

function meanMental(players: PlayerSimulationProfile[]): number {
  if (players.length === 0) return 0;
  return players.reduce((sum, p) => sum + p.mentalScore, 0) / players.length;
}

/** Converts ability (1–200) to a 0–100 dimension score */
function abilityToDimension(ability: number): number {
  return clamp((ability / 200) * 100, 0, 100);
}

/** Converts attribute score (0–99) to a 0–100 dimension score */
function attrToDimension(score: number): number {
  return clamp((score / 99) * 100, 0, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD TEAM PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the TeamSimulationProfile from player profiles and team tactics.
 *
 * @param teamState    The full team simulation state from input
 * @param players      Built player profiles for this team
 * @param config       Simulation configuration
 * @param isHomeTeam   Whether this is the home team
 */
export function buildTeamProfile(
  teamState: TeamSimulationState,
  players: PlayerSimulationProfile[],
  config: SimulationConfig,
  isHomeTeam: boolean
): TeamSimulationProfile {
  const tactics = teamState.tactics;
  const startingXI = players.filter((p) => p.isStarting && p.isOnPitch);

  // ── Player subsets ─────────────────────────────────────────────────────────
  const defenders = startingXI.filter((p) => DEFENSIVE_ROLES.has(p.assignedRole));
  const midfielders = startingXI.filter((p) => MIDFIELDER_ROLES.has(p.assignedRole));
  const forwards = startingXI.filter((p) => FORWARD_ROLES.has(p.assignedRole));
  const gk = startingXI.filter((p) => GOALKEEPER_ROLES.has(p.assignedRole));

  const widePlayers = startingXI.filter((p) => WIDE_ROLES.has(p.assignedRole));
  const buildUpPlayers = startingXI.filter((p) => BUILD_UP_ROLES.has(p.assignedRole));

  const allOutfield = startingXI.filter((p) => !GOALKEEPER_ROLES.has(p.assignedRole));

  // ── Attacking Dimensions ───────────────────────────────────────────────────
  const attackingStrength = abilityToDimension(meanAbility(forwards));

  // Chance creation: attacking/creative midfielder + forward technical quality
  const creativeGroup = [...midfielders, ...forwards];
  const chanceCreationAbility = clamp(
    attrToDimension(meanTechnical(creativeGroup)) * 0.70 +
    attrToDimension(meanMental(creativeGroup)) * 0.30,
    0,
    100
  );

  // Finishing quality: raw finishing attribute of forwards, weighted by effectiveAbility
  const finishingQuality = (() => {
    if (forwards.length === 0) return 30; // teams without forwards have poor finishing
    const total = forwards.reduce(
      (sum, p) => sum + (p.rawAttributes.technical.finishing * (p.effectiveMatchAbility / 200)),
      0
    );
    return clamp((total / forwards.length / 99) * 100, 0, 100);
  })();

  const crossingThreat = widePlayers.length > 0
    ? clamp(
        widePlayers.reduce(
          (sum, p) => sum + (p.rawAttributes.technical.crossing / 99) * 100,
          0
        ) / widePlayers.length,
        0,
        100
      )
    : 20;

  // ── Defensive Dimensions ───────────────────────────────────────────────────
  const defensiveStrength = abilityToDimension(meanAbility(defenders));

  // Defensive organisation: concentration + teamwork + tactical familiarity
  const defensiveOrganisation = (() => {
    const relevant = [...defenders, ...midfielders.filter((p) =>
      p.assignedRole === 'DEFENSIVE_MIDFIELDER'
    )];
    if (relevant.length === 0) return 50;
    const orgScore = relevant.reduce((sum, p) => {
      const tf = p.tacticalFamiliarityModifier;
      return sum + (
        p.rawAttributes.mental.concentration * 0.35 +
        p.rawAttributes.mental.teamwork * 0.35 +
        tf * 29  // tf in range [0.9, 1.1] → contributes 26–32 points
      );
    }, 0) / relevant.length;
    return clamp((orgScore / 99) * 100, 0, 100);
  })();

  // Press resistance: composure + first touch + decisions of build-up players
  const pressResistance = buildUpPlayers.length > 0
    ? clamp(
        buildUpPlayers.reduce((sum, p) => {
          const t = p.rawAttributes.technical;
          const m = p.rawAttributes.mental;
          return sum + (t.firstTouch * 0.35 + m.composure * 0.40 + m.decisions * 0.25);
        }, 0) / buildUpPlayers.length / 99 * 100,
        0,
        100
      )
    : 50;

  // Aerial strength: heading + jumping for defenders + forwards
  const aerialPlayers = [...defenders, ...forwards];
  const aerialStrength = aerialPlayers.length > 0
    ? clamp(
        aerialPlayers.reduce((sum, p) => {
          return sum + (
            p.rawAttributes.technical.heading * 0.55 +
            p.rawAttributes.physical.jumping * 0.45
          );
        }, 0) / aerialPlayers.length / 99 * 100,
        0,
        100
      )
    : 40;

  // ── Transition Dimensions ──────────────────────────────────────────────────
  const fastForwards = [...forwards, ...midfielders.filter((p) =>
    ['WINGER', 'INVERTED_WINGER', 'WIDE_MIDFIELDER'].includes(p.assignedRole)
  )];

  const counterAttackThreat = fastForwards.length > 0
    ? clamp(
        fastForwards.reduce((sum, p) => {
          return sum + (
            p.rawAttributes.physical.pace * 0.40 +
            p.rawAttributes.physical.acceleration * 0.35 +
            p.rawAttributes.mental.positioning * 0.25
          );
        }, 0) / fastForwards.length / 99 * 100,
        0,
        100
      )
    : 30;

  // Counter vulnerability: based on defensive line height and backline pace
  const lineHeightPenalty = (1 - DEFENSIVE_LINE_DEPTH[tactics.defensiveLine]) * 100;
  const backlinePaceMean = defenders.length > 0
    ? defenders.reduce((sum, p) => sum + p.rawAttributes.physical.pace, 0) / defenders.length
    : 50;
  const counterAttackVulnerability = clamp(
    lineHeightPenalty * 0.60 + (1 - backlinePaceMean / 99) * 40,
    0,
    100
  );

  // ── Possession Dimensions ──────────────────────────────────────────────────
  const buildUpQuality = buildUpPlayers.length > 0
    ? clamp(
        buildUpPlayers.reduce((sum, p) => {
          const t = p.rawAttributes.technical;
          const m = p.rawAttributes.mental;
          return sum + (
            t.passing * 0.30 + m.vision * 0.25 + t.firstTouch * 0.25 + m.decisions * 0.20
          );
        }, 0) / buildUpPlayers.length / 99 * 100,
        0,
        100
      )
    : 50;

  const progressionQuality = clamp(
    allOutfield.length > 0
      ? allOutfield.reduce((sum, p) => {
          const t = p.rawAttributes.technical;
          const m = p.rawAttributes.mental;
          return sum + (t.passing * 0.30 + t.dribbling * 0.20 + m.vision * 0.25 + m.decisions * 0.25);
        }, 0) / allOutfield.length / 99 * 100
      : 50,
    0,
    100
  );

  // Possession base: starts at 50, adjusted by mentality
  const possessionBase = 50 + MENTALITY_POSSESSION_BIAS[tactics.mentality];

  // ── Set Piece ──────────────────────────────────────────────────────────────
  // Best set piece deliverer (by freeKick attribute)
  const bestSetDeliverer = startingXI.reduce(
    (best, p) =>
      p.rawAttributes.technical.freeKick > (best?.rawAttributes.technical.freeKick ?? 0) ? p : best,
    null as PlayerSimulationProfile | null
  );
  const deliveryQuality = bestSetDeliverer
    ? (bestSetDeliverer.rawAttributes.technical.freeKick / 99) * 100
    : 30;

  const setPieceThreat = clamp(
    deliveryQuality * 0.50 + aerialStrength * 0.50,
    0,
    100
  );

  const setPieceDefense = clamp(aerialStrength * 0.60 + defensiveOrganisation * 0.40, 0, 100);

  // ── Home Advantage ─────────────────────────────────────────────────────────
  const homeAdvantageModifier = isHomeTeam
    ? 1.0 + config.homeAdvantage.chanceCreationBonus  // slight uplift on chance creation
    : 1.0;

  // ── Cohesion ───────────────────────────────────────────────────────────────
  const meanTF = startingXI.length > 0
    ? startingXI.reduce((sum, p) => sum + p.tacticalFamiliarityModifier, 0) / startingXI.length
    : 1.0;
  const teamCohesion = clamp(teamState.teamCohesion ?? 70, 0, 100);
  const effectiveCohesion = (teamCohesion / 100) * meanTF;

  // ── Pressure output ────────────────────────────────────────────────────────
  const pressingMap: Record<string, number> = {
    LOW: 30, MEDIUM: 50, HIGH: 70, EXTREME: 90,
  };
  const pressureOutput = pressingMap[tactics.pressingIntensity] ?? 50;

  return {
    teamId: teamState.teamId,
    isHomeTeam,
    tactics,

    attackingStrength,
    chanceCreationAbility,
    finishingQuality,
    crossingThreat,

    defensiveStrength,
    defensiveOrganisation,
    pressResistance,
    aerialStrength,

    counterAttackThreat,
    counterAttackVulnerability,

    possessionBase,
    buildUpQuality,
    progressionQuality,

    setPieceThreat,
    setPieceDefense,

    homeAdvantageModifier,
    effectiveCohesion,
    pressureOutput,
    widthFactor: WIDTH_FACTOR[tactics.width],
  };
}
