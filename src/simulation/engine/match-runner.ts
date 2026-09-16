// ─────────────────────────────────────────────────────────────────────────────
// MATCH RUNNER
//
// The top-level orchestrator. Wires together all engine components into a
// single complete match simulation.
//
// Execution flow:
//   1. Build SimulationContext (profiles + team profiles + matchup)
//   2. Create initial MatchSimulationState
//   3. Add KICK_OFF event
//   4. Run FIRST_HALF phase (regulation + stoppage)
//   5. Run HALF_TIME transition
//   6. Run SECOND_HALF phase (regulation + stoppage)
//   7. Run FULL_TIME transition
//   8. Validate match state
//   9. Extract statistics and player performances
//  10. Build and validate MatchSimulationResult
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationInput, MatchSimulationResult } from '../models/simulation-contracts';
import { SeededRNG } from './rng';
import { buildSimulationContext } from './simulation-context-builder';
import { createInitialMatchState, MatchSimulationState } from './match-state';
import { runPhase, runHalftime, runFullTime } from './phase-runner';
import { createEventRecorderState } from './events/event-recorder';
import { computePlayerPerformances } from './player/performance-calculator';
import { validateMatchState } from '../result-validator';
import { DomainMatchEvent, DomainMatchStatistics, TeamMatchStats } from '../../domain/types/match';
import { homePossessionMean } from './match-state';

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function buildTeamStats(
  state: MatchSimulationState,
  isHome: boolean
): TeamMatchStats {
  const team = isHome ? state.home : state.away;
  const possessionMean = homePossessionMean(state);

  return {
    goals: isHome ? state.homeScore : state.awayScore,
    shots: team.shots,
    shotsOnTarget: team.shotsOnTarget,
    xg: Number(team.xg.toFixed(2)),
    possession: isHome
      ? Number(possessionMean.toFixed(1))
      : Number((100 - possessionMean).toFixed(1)),
    passes: team.passes,
    passAccuracy: team.passes > 0
      ? Number(((team.passesCompleted / team.passes) * 100).toFixed(1))
      : 0,
    tackles: team.tackles,
    fouls: team.fouls,
    yellowCards: team.yellowCards,
    redCards: team.redCards,
    corners: team.corners,
    interceptions: team.interceptions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KICK-OFF AND FULL-TIME EVENTS
// ─────────────────────────────────────────────────────────────────────────────

function buildKickOffEvent(input: MatchSimulationInput): DomainMatchEvent {
  return {
    minute: 0,
    kind: 'KICK_OFF',
    teamId: input.homeTeam.teamId,
    description: `Kick off: ${input.homeTeam.clubName} vs ${input.awayTeam.clubName}.`,
  };
}

function buildFullTimeEvent(
  state: MatchSimulationState,
  input: MatchSimulationInput
): DomainMatchEvent {
  return {
    minute: 90,
    kind: 'FULL_TIME',
    teamId: input.homeTeam.teamId,
    description: `Full time: ${input.homeTeam.clubName} ${state.homeScore}–${state.awayScore} ${input.awayTeam.clubName}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const MATCH_ENGINE_ID = 'ts-statistical-v1';
export const MATCH_ENGINE_VERSION = '2.0.0';
export const FULL_ENGINE_VERSION = `${MATCH_ENGINE_ID}@${MATCH_ENGINE_VERSION}`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MATCH RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs a complete football match simulation.
 *
 * Given identical `input` and `input.seed`, this function MUST produce an
 * identical `MatchSimulationResult` every time it is called.
 *
 * @param input  Complete match simulation input
 * @returns      Validated, immutable match simulation result
 */
export function runMatch(input: MatchSimulationInput): MatchSimulationResult {
  // ── 1. Build context ────────────────────────────────────────────────────────
  const { context, config } = buildSimulationContext(input);

  // ── 2. Initialise RNG ───────────────────────────────────────────────────────
  const rng = new SeededRNG(input.seed);

  // ── 3. Create initial state ─────────────────────────────────────────────────
  const state = createInitialMatchState(context);
  state.phase = 'FIRST_HALF';

  // ── 4. Event recorder state ─────────────────────────────────────────────────
  const erState = createEventRecorderState();

  // ── 5. KICK_OFF event ───────────────────────────────────────────────────────
  state.significantEvents.push(buildKickOffEvent(input));
  state.currentMinute = 0;

  // ── 6. FIRST HALF ───────────────────────────────────────────────────────────
  runPhase('FIRST_HALF', state, context, config, erState, rng);

  // ── 7. HALF TIME ────────────────────────────────────────────────────────────
  runHalftime(state);
  state.significantEvents.push({
    minute: 45,
    kind: 'HALF_TIME',
    teamId: input.homeTeam.teamId,
    description: `Half time: ${input.homeTeam.clubName} ${state.homeScore}–${state.awayScore} ${input.awayTeam.clubName}.`,
  });

  // ── 8. SECOND HALF ──────────────────────────────────────────────────────────
  state.phase = 'SECOND_HALF';
  runPhase('SECOND_HALF', state, context, config, erState, rng);

  // ── 9. FULL TIME ────────────────────────────────────────────────────────────
  runFullTime(state);
  state.significantEvents.push(buildFullTimeEvent(state, input));

  // ── 10. Validate state ──────────────────────────────────────────────────────
  validateMatchState(state);

  // ── 11. Extract statistics ──────────────────────────────────────────────────
  const homeStats = buildTeamStats(state, true);
  const awayStats = buildTeamStats(state, false);

  const statistics: DomainMatchStatistics = { homeStats, awayStats };

  // ── 12. Compute player performances ────────────────────────────────────────
  const playerPerformances = computePlayerPerformances(state, config);

  // ── 13. Sort events by minute ───────────────────────────────────────────────
  const sortedEvents = [...state.significantEvents].sort(
    (a, b) => a.minute - b.minute || (a.addedTime ?? 0) - (b.addedTime ?? 0)
  );

  // ── 14. Build result ────────────────────────────────────────────────────────
  const result: MatchSimulationResult = {
    matchId: input.matchId,
    seed: input.seed,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    homeScoreHT: state.homeScoreHT,
    awayScoreHT: state.awayScoreHT,
    events: sortedEvents,
    statistics,
    playerPerformances,
    simulationEngineVersion: FULL_ENGINE_VERSION,
    executedAt: new Date().toISOString(),
  };

  return result;
}
