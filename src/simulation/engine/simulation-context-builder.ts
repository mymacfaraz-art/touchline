// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION CONTEXT BUILDER
//
// Assembles the complete SimulationContext from a MatchSimulationInput.
// Called once before the phase loop starts.
// The resulting context is passed as Readonly<> throughout the simulation.
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationInput } from '../models/simulation-contracts';
import { SimulationContext, PlayerSimulationProfile } from './match-state';
import { SimulationConfig, resolveConfig } from './simulation-config';
import { buildTeamPlayerProfiles } from './player/player-profile-builder';
import { buildTeamProfile } from './team/team-profile-builder';
import { buildTacticalMatchup } from './team/tactical-matchup-builder';

/**
 * Builds a complete, immutable SimulationContext from a MatchSimulationInput.
 *
 * This is the only place where:
 *   - Config overrides are merged with defaults
 *   - Player profiles are built (once, never rebuilt during simulation)
 *   - Team profiles are computed
 *   - Tactical matchup is evaluated
 *
 * @param input   Complete match simulation input
 * @returns       Resolved config + immutable simulation context
 */
export function buildSimulationContext(input: MatchSimulationInput): {
  context: SimulationContext;
  config: Readonly<SimulationConfig>;
} {
  // ── 1. Resolve configuration ───────────────────────────────────────────────
  const config = resolveConfig(input.config);

  const isNeutralVenue = input.neutralVenue ?? false;

  // Home advantage bonus: 0 at neutral venues; config morale value otherwise
  const homeAdvantageBonus = isNeutralVenue ? 0 : config.homeAdvantage.possessionBonus;
  const homePlayerMoraleBonus = isNeutralVenue ? 0 : config.homeAdvantage.moraleBonus;

  // ── 2. Build player profiles ───────────────────────────────────────────────
  const homePlayers = buildTeamPlayerProfiles(
    [...input.homeTeam.startingXI, ...input.homeTeam.bench],
    input.homeTeam.teamId,
    config,
    homePlayerMoraleBonus   // home players get morale bonus
  );

  const awayPlayers = buildTeamPlayerProfiles(
    [...input.awayTeam.startingXI, ...input.awayTeam.bench],
    input.awayTeam.teamId,
    config,
    0  // away players get no morale bonus from home advantage
  );

  // ── 3. Build team profiles ──────────────────────────────────────────────────
  const homeStartingProfiles = homePlayers.filter((p: PlayerSimulationProfile) => p.isStarting);
  const awayStartingProfiles = awayPlayers.filter((p: PlayerSimulationProfile) => p.isStarting);

  const homeTeamProfile = buildTeamProfile(
    input.homeTeam,
    homeStartingProfiles,
    config,
    true   // isHomeTeam
  );

  const awayTeamProfile = buildTeamProfile(
    input.awayTeam,
    awayStartingProfiles,
    config,
    false  // isHomeTeam
  );

  // Apply neutral venue: strip any home advantage modifiers
  if (isNeutralVenue) {
    (homeTeamProfile as { homeAdvantageModifier: number }).homeAdvantageModifier = 1.0;
  }

  // ── 4. Build tactical matchup ──────────────────────────────────────────────
  const matchup = buildTacticalMatchup(
    input.homeTeam.tactics,
    input.awayTeam.tactics
  );

  // ── 5. Assemble context ────────────────────────────────────────────────────
  const context: SimulationContext = {
    matchId: input.matchId,
    seed: input.seed,
    neutralVenue: isNeutralVenue,
    homePlayers,
    awayPlayers,
    homeTeam: homeTeamProfile,
    awayTeam: awayTeamProfile,
    matchup,
  };

  return { context, config };
}
