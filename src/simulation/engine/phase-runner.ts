// ─────────────────────────────────────────────────────────────────────────────
// PHASE RUNNER
//
// Runs all slots for a single match phase (FIRST_HALF, SECOND_HALF, etc.).
// Handles stoppage time slot generation and halftime score recording.
// ─────────────────────────────────────────────────────────────────────────────

import { MatchSimulationState, MatchPhase, SimulationContext } from './match-state';
import { SimulationConfig } from './simulation-config';
import { SeededRNG } from './rng';
import { EventRecorderState } from './events/event-recorder';
import { runSlot } from './slot-runner';
import { clamp } from './probability/probability-utils';

// ─────────────────────────────────────────────────────────────────────────────
// STOPPAGE TIME DRAW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws the number of additional stoppage time slots for a half.
 * Uses the config range [min, max].
 */
function drawStoppageSlots(
  range: readonly [number, number],
  rng: SeededRNG
): number {
  const [min, max] = range;
  if (min >= max) return min;
  return min + Math.floor(rng.nextFloat() * (max - min + 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs all slots for a given match phase.
 *
 * @param phase        The phase to run (FIRST_HALF or SECOND_HALF)
 * @param state        Mutable match state
 * @param context      Immutable simulation context
 * @param config       Simulation config
 * @param erState      Event recorder state (per-player yellow card tracking)
 * @param rng          Seeded RNG
 */
export function runPhase(
  phase: 'FIRST_HALF' | 'SECOND_HALF',
  state: MatchSimulationState,
  context: Readonly<SimulationContext>,
  config: Readonly<SimulationConfig>,
  erState: EventRecorderState,
  rng: SeededRNG
): void {
  state.phase = phase;

  // Regulation slots
  const regulationSlots = config.slotsPerHalf;

  // Stoppage time slots
  const stoppageRange = phase === 'FIRST_HALF'
    ? config.stoppageTimeSlotsFirst
    : config.stoppageTimeSlotsSecond;
  const stoppageSlots = drawStoppageSlots(stoppageRange, rng);

  const totalSlots = regulationSlots + stoppageSlots;

  // Run regulation slots
  for (let i = 0; i < regulationSlots; i++) {
    runSlot(state, context, config, erState, rng, i);
  }

  // Switch phase marker to stoppage for the additional slots
  if (stoppageSlots > 0) {
    state.phase = phase === 'FIRST_HALF' ? 'STOPPAGE_FIRST' : 'STOPPAGE_SECOND';
    for (let i = 0; i < stoppageSlots; i++) {
      runSlot(state, context, config, erState, rng, regulationSlots + i);
    }
    // Restore phase after stoppage
    state.phase = phase;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HALFTIME HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records the halftime score and transitions the state to HALF_TIME.
 * Resets possession accumulation for clean second-half tracking.
 */
export function runHalftime(state: MatchSimulationState): void {
  state.phase = 'HALF_TIME';
  state.homeScoreHT = state.homeScore;
  state.awayScoreHT = state.awayScore;
  state.currentMinute = 45;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL TIME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transitions the state to FULL_TIME.
 */
export function runFullTime(state: MatchSimulationState): void {
  state.phase = 'FULL_TIME';
  state.currentMinute = 90;
}
