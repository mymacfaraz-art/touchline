// ─────────────────────────────────────────────────────────────────────────────
// RESULT VALIDATOR
//
// Validates a MatchSimulationResult before it is returned to the caller.
// Catches logical inconsistencies that indicate simulation bugs.
//
// The validator NEVER modifies the result. It either passes or throws.
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationResult } from './models/simulation-contracts';
import { MatchSimulationState } from './engine/match-state';
import { DomainMatchEvent } from '../domain/types/match';

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION RULES
// ─────────────────────────────────────────────────────────────────────────────

export class SimulationValidationError extends Error {
  constructor(
    public readonly rule: string,
    public readonly detail: string
  ) {
    super(`[SimulationValidationError] ${rule}: ${detail}`);
    this.name = 'SimulationValidationError';
  }
}

/**
 * Validates a completed MatchSimulationResult.
 * Throws SimulationValidationError if any rule is violated.
 *
 * Rules checked:
 *   1. Score is non-negative
 *   2. HT score ≤ FT score for each team
 *   3. xG ≥ 0 for both teams
 *   4. Player rating in [4.0, 10.0] for all performances
 *   5. Events list contains KICK_OFF and FULL_TIME
 *   6. Number of goals in events matches final score
 *   7. No NaN or Infinity in numeric fields
 *   8. Possession sums to 100
 */
export function validateSimulationResult(result: MatchSimulationResult): void {
  const { homeScore, awayScore, homeScoreHT, awayScoreHT, statistics } = result;

  // Rule 1: Scores non-negative
  if (homeScore < 0 || awayScore < 0) {
    throw new SimulationValidationError('NEGATIVE_SCORE', `Home: ${homeScore}, Away: ${awayScore}`);
  }

  // Rule 2: HT score ≤ FT score
  if (homeScoreHT > homeScore) {
    throw new SimulationValidationError(
      'HALFTIME_EXCEEDS_FULLTIME',
      `Home HT: ${homeScoreHT} > FT: ${homeScore}`
    );
  }
  if (awayScoreHT > awayScore) {
    throw new SimulationValidationError(
      'HALFTIME_EXCEEDS_FULLTIME',
      `Away HT: ${awayScoreHT} > FT: ${awayScore}`
    );
  }

  // Rule 3: xG ≥ 0
  if (statistics.homeStats.xg < 0 || statistics.awayStats.xg < 0) {
    throw new SimulationValidationError(
      'NEGATIVE_XG',
      `Home xG: ${statistics.homeStats.xg}, Away xG: ${statistics.awayStats.xg}`
    );
  }

  // Rule 4: Player ratings in [4.0, 10.0]
  for (const perf of result.playerPerformances) {
    if (perf.rating < 4.0 || perf.rating > 10.0) {
      throw new SimulationValidationError(
        'RATING_OUT_OF_RANGE',
        `Player ${perf.playerId} rating: ${perf.rating}`
      );
    }
  }

  // Rule 5: Events contain KICK_OFF and FULL_TIME
  const hasKickOff = result.events.some((e: DomainMatchEvent) => e.kind === 'KICK_OFF');
  const hasFullTime = result.events.some((e: DomainMatchEvent) => e.kind === 'FULL_TIME');
  if (!hasKickOff) {
    throw new SimulationValidationError('MISSING_EVENT', 'KICK_OFF event not found');
  }
  if (!hasFullTime) {
    throw new SimulationValidationError('MISSING_EVENT', 'FULL_TIME event not found');
  }

  // Rule 6: Goal events match final score
  const homeGoalEvents = result.events.filter(
    (e: DomainMatchEvent) =>
      (e.kind === 'GOAL' || e.kind === 'PENALTY_GOAL') &&
      e.teamId === result.events.find((ev: DomainMatchEvent) => ev.kind === 'KICK_OFF')?.teamId
  ).length;
  // Note: Simplified check — just verify total goals in events ≤ FT goals (sum)
  const totalGoalEvents = result.events.filter(
    (e: DomainMatchEvent) => e.kind === 'GOAL' || e.kind === 'PENALTY_GOAL' || e.kind === 'OWN_GOAL'
  ).length;
  const totalFTGoals = homeScore + awayScore;
  if (totalGoalEvents !== totalFTGoals) {
    throw new SimulationValidationError(
      'GOAL_EVENT_MISMATCH',
      `Goal events: ${totalGoalEvents}, FT goals: ${totalFTGoals}`
    );
  }

  // Rule 7: No NaN or Infinity in critical numeric fields
  const criticalNumbers = [
    homeScore, awayScore, homeScoreHT, awayScoreHT,
    statistics.homeStats.xg, statistics.awayStats.xg,
    statistics.homeStats.possession, statistics.awayStats.possession,
  ];
  for (const n of criticalNumbers) {
    if (!Number.isFinite(n)) {
      throw new SimulationValidationError('INVALID_NUMBER', `Non-finite value: ${n}`);
    }
  }

  // Rule 8: Possession sums to ~100 (±1 for rounding)
  const totalPossession = statistics.homeStats.possession + statistics.awayStats.possession;
  if (Math.abs(totalPossession - 100) > 1.5) {
    throw new SimulationValidationError(
      'POSSESSION_SUM_INVALID',
      `Total possession: ${totalPossession.toFixed(1)} (expected ~100)`
    );
  }
}

/**
 * Validates internal match state consistency before result extraction.
 * Called internally by the match runner.
 */
export function validateMatchState(state: MatchSimulationState): void {
  if (state.homeScore < 0 || state.awayScore < 0) {
    throw new SimulationValidationError('NEGATIVE_SCORE_STATE', `State scores invalid`);
  }
  if (state.homeScoreHT > state.homeScore || state.awayScoreHT > state.awayScore) {
    throw new SimulationValidationError('HALFTIME_STATE_INCONSISTENT', 'HT score > FT score in state');
  }
  if (state.phase !== 'FULL_TIME') {
    throw new SimulationValidationError('INCOMPLETE_SIMULATION', `Phase is ${state.phase}, expected FULL_TIME`);
  }
}
