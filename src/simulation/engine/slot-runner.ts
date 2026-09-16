// ─────────────────────────────────────────────────────────────────────────────
// SLOT RUNNER
//
// The core simulation loop unit. Each slot represents ~3 game-minutes.
// Executes the full probability pipeline for both teams each slot.
//
// Strict RNG call ordering within a slot (never varies):
//   1.  Home possession draw (triangular)
//   2.  Home progression check
//   3.  Away progression check
//   4.  Home chance creation check (if home progressed)
//   5.  Away chance creation check (if away progressed)
//   6.  Home chance tier selection (if home chance)
//   7.  Away chance tier selection (if away chance)
//   8.  Home shot check (if home chance)
//   9.  Away shot check (if away chance)
//   10. Home xG draw + angle + header + assist (if home shot) — 4 RNG calls
//   14. Away xG draw + angle + header + assist (if away shot) — 4 RNG calls
//   18. Home on-target check (if home shot)
//   19. Home save check (if home on-target)
//   20. Away on-target check (if away shot)
//   21. Away save check (if away on-target)
//   22. Home yellow check (A) + fouler (B)
//   24. Away yellow check (A) + fouler (B)
//   26. Home injury check (C) + victim (D) + severity (E)
//   29. Away injury check (C) + victim (D) + severity (E)
//   32. Home fatigue updates (one per player)
//   N.  Away fatigue updates (one per player)
//
// This ordering is FIXED and must not change between versions without
// incrementing engineId in the simulation contracts.
// ─────────────────────────────────────────────────────────────────────────────

import {
  MatchSimulationState,
  PlayerSimulationProfile,
  SimulationContext,
  ShotAttempt,
  ChanceTier,
} from './match-state';
import { SimulationConfig } from './simulation-config';
import { SeededRNG } from './rng';
import { resolveSlotPossession, computeExpectedPossession } from './probability/possession-resolver';
import {
  evaluateProgression,
  evaluateChanceCreation,
  selectChanceTier,
  evaluateShot,
  selectShooter,
} from './probability/progression-evaluator';
import { computeXg } from './probability/xg-calculator';
import { evaluateGoalkeeperSave, ShotOutcome } from './player/goalkeeper-evaluator';
import { evaluateYellowCard, evaluateInjury } from './events/card-injury-evaluator';
import {
  EventRecorderState,
  decayMomentum,
  recordGoal,
  recordShot,
  recordYellowCard,
  recordInjury,
  recordPossession,
} from './events/event-recorder';
import { updateTeamFatigue, computeMeanFatigue } from './player/fatigue-updater';
import { getOnPitchPlayers } from './match-state';
import { clamp } from './probability/probability-utils';

// ─────────────────────────────────────────────────────────────────────────────
// MINUTE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/** Minutes per slot: 90 minutes / 30 slots = 3 minutes per slot */
const MINUTES_PER_SLOT = 3;

/**
 * Converts a slot index within a phase to the approximate game minute.
 */
export function slotToMinute(
  phase: MatchSimulationState['phase'],
  slotIndex: number
): number {
  switch (phase) {
    case 'FIRST_HALF':
    case 'STOPPAGE_FIRST': return 1 + slotIndex * MINUTES_PER_SLOT;
    case 'SECOND_HALF':    return 46 + slotIndex * MINUTES_PER_SLOT;
    case 'STOPPAGE_SECOND': return 90 + slotIndex * MINUTES_PER_SLOT;
    default: return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GOALKEEPER LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

function getGoalkeeper(
  players: PlayerSimulationProfile[]
): PlayerSimulationProfile | null {
  return (
    players.find((p) => p.isOnPitch && (p.assignedRole === 'GOALKEEPER' || p.assignedRole === 'SWEEPER_KEEPER')) ??
    null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOT SEQUENCE
//
// Runs the full shot → xG → save sequence for one team.
// Consumes 4 RNG calls for xG, then 2 for save.
// ─────────────────────────────────────────────────────────────────────────────

function runShotSequence(
  state: MatchSimulationState,
  context: SimulationContext,
  isHome: boolean,
  chanceTier: ChanceTier,
  config: SimulationConfig,
  erState: EventRecorderState,
  rng: SeededRNG,
  minute: number,
  addedTime: number,
  slot: number
): void {
  const attackingPlayers = isHome ? state.homePlayers : state.awayPlayers;
  const defendingPlayers = isHome ? state.awayPlayers : state.homePlayers;
  const defendingTeam = isHome ? context.awayTeam : context.homeTeam;
  const attackingTeam = isHome ? context.homeTeam : context.awayTeam;

  // Select shooter (RNG: one call for weighted selection)
  const shooter = selectShooter(attackingPlayers, rng);

  // Compute xG (RNG calls 6–9: base, angle, header, assist type + possible extra penalty check)
  const shot = computeXg(chanceTier, shooter, defendingTeam, config, rng);

  // Get defending GK
  const gk = getGoalkeeper(defendingPlayers);

  let shotOutcome: ShotOutcome;
  if (!gk) {
    // No goalkeeper (shouldn't happen) — treat as goal
    shotOutcome = 'GOAL';
    rng.nextFloat(); // Call 10: consume on-target check
    rng.nextFloat(); // Call 11: consume save check
  } else {
    shotOutcome = evaluateGoalkeeperSave(shot, gk, config, rng); // Calls 10 + 11
  }

  const isOnTarget = shotOutcome === 'GOAL' || shotOutcome === 'SAVE';

  if (shotOutcome === 'GOAL') {
    // Find assister (simplified: any creative on-pitch player)
    const assister = attackingPlayers.find(
      (p: PlayerSimulationProfile) => p.isOnPitch && p !== shooter && p.rawAttributes.mental.vision > 60
    ) ?? null;

    recordGoal(
      state,
      shooter,
      assister,
      shot.xgValue,
      minute,
      addedTime,
      shot.isPenalty,
      false, // not an own goal
      slot
    );
  } else {
    recordShot(state, shooter, shot.xgValue, isOnTarget, slot, minute);
  }

  // Update team stats
  const teamState = isHome ? state.home : state.away;
  teamState.passes++;
  teamState.passesCompleted++;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SLOT RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs a complete simulation slot.
 * Executes the full probability pipeline for both teams.
 * All RNG calls are consumed in the strict ordering documented above.
 */
export function runSlot(
  state: MatchSimulationState,
  context: Readonly<SimulationContext>,
  config: Readonly<SimulationConfig>,
  erState: EventRecorderState,
  rng: SeededRNG,
  slotIndex: number
): void {
  state.slotIndex = slotIndex;
  const minute = slotToMinute(state.phase, slotIndex);
  const addedTime = 0; // Stoppage time minutes handled by PhaseRunner

  // ── Momentum decay ──────────────────────────────────────────────────────────
  decayMomentum(state, config.momentumDecayRate);

  // ── RNG CALL 1: Possession ──────────────────────────────────────────────────
  const structuralExpected = computeExpectedPossession(
    context.homeTeam,
    context.awayTeam,
    config
  );
  const slotPossession = resolveSlotPossession(
    state,
    structuralExpected,
    config,
    rng  // Call 1
  );
  recordPossession(state, slotPossession);

  // ── Is heavy pressing active? ───────────────────────────────────────────────
  const homeHeavyPressing =
    state.home.effectivePressingIntensity === 'HIGH' ||
    state.home.effectivePressingIntensity === 'EXTREME';
  const awayHeavyPressing =
    state.away.effectivePressingIntensity === 'HIGH' ||
    state.away.effectivePressingIntensity === 'EXTREME';

  // ── RNG CALLS 2–3: Progression ──────────────────────────────────────────────
  const homeProgressed = evaluateProgression(
    slotPossession, true, context.homeTeam, config, state, rng  // Call 2
  );
  const awayProgressed = evaluateProgression(
    slotPossession, false, context.awayTeam, config, state, rng  // Call 3
  );

  // ── RNG CALLS 4–5: Chance creation ──────────────────────────────────────────
  const homeChance = homeProgressed
    ? evaluateChanceCreation(context.homeTeam, context.awayTeam, config, state, true, rng) // Call 4
    : (rng.nextFloat(), false); // Consume call 4 anyway
  const awayChance = awayProgressed
    ? evaluateChanceCreation(context.awayTeam, context.homeTeam, config, state, false, rng) // Call 5
    : (rng.nextFloat(), false); // Consume call 5 anyway

  // ── RNG CALLS 6–7: Chance tier selection ────────────────────────────────────
  const homeChanceTier = homeChance
    ? selectChanceTier(context.homeTeam, context.awayTeam, rng) // Call 6
    : (rng.nextFloat(), 'HALF_CHANCE' as ChanceTier); // Consume call 6
  const awayChanceTier = awayChance
    ? selectChanceTier(context.awayTeam, context.homeTeam, rng) // Call 7
    : (rng.nextFloat(), 'HALF_CHANCE' as ChanceTier); // Consume call 7

  // ── RNG CALLS 8–9: Shot evaluation ──────────────────────────────────────────
  const homeShot = homeChance
    ? evaluateShot(context.homeTeam, config, state, true, rng)  // Call 8
    : (rng.nextFloat(), false); // Consume call 8
  const awayShot = awayChance
    ? evaluateShot(context.awayTeam, config, state, false, rng) // Call 9
    : (rng.nextFloat(), false); // Consume call 9

  // ── Shot sequences (each consumes calls for xG + save) ─────────────────────
  if (homeShot) {
    runShotSequence(state, context, true, homeChanceTier, config, erState, rng, minute, addedTime, slotIndex);
  } else {
    // Consume the RNG calls that runShotSequence would have used
    // shooter select + 4 xG calls + 2 save calls = 7 calls
    for (let i = 0; i < 7; i++) rng.nextFloat();
  }

  if (awayShot) {
    runShotSequence(state, context, false, awayChanceTier, config, erState, rng, minute, addedTime, slotIndex);
  } else {
    for (let i = 0; i < 7; i++) rng.nextFloat();
  }

  // ── Cards ───────────────────────────────────────────────────────────────────
  const homeYellow = evaluateYellowCard(
    state.homePlayers, state.home, state.matchIntensity, config, rng // Calls A + B
  );
  if (homeYellow) {
    const sentOff = recordYellowCard(state, homeYellow, erState, minute, addedTime, slotIndex);
    if (sentOff) {
      homeYellow.isOnPitch = false;
      const idx = state.home.playersOnPitch.indexOf(homeYellow.playerId);
      if (idx !== -1) state.home.playersOnPitch.splice(idx, 1);
    }
  }

  const awayYellow = evaluateYellowCard(
    state.awayPlayers, state.away, state.matchIntensity, config, rng // Calls A + B
  );
  if (awayYellow) {
    const sentOff = recordYellowCard(state, awayYellow, erState, minute, addedTime, slotIndex);
    if (sentOff) {
      awayYellow.isOnPitch = false;
      const idx = state.away.playersOnPitch.indexOf(awayYellow.playerId);
      if (idx !== -1) state.away.playersOnPitch.splice(idx, 1);
    }
  }

  // ── Injuries ────────────────────────────────────────────────────────────────
  const homeInjury = evaluateInjury(
    state.homePlayers, state.matchIntensity, config, rng // Calls C + D + E
  );
  if (homeInjury) {
    recordInjury(state, homeInjury.player, homeInjury.severity, minute, addedTime, slotIndex);
  }

  const awayInjury = evaluateInjury(
    state.awayPlayers, state.matchIntensity, config, rng // Calls C + D + E
  );
  if (awayInjury) {
    recordInjury(state, awayInjury.player, awayInjury.severity, minute, addedTime, slotIndex);
  }

  // ── Fatigue updates ─────────────────────────────────────────────────────────
  updateTeamFatigue(
    state.homePlayers,
    state.matchIntensity,
    homeHeavyPressing,
    MINUTES_PER_SLOT,
    config,
    rng  // One call per player
  );
  updateTeamFatigue(
    state.awayPlayers,
    state.matchIntensity,
    awayHeavyPressing,
    MINUTES_PER_SLOT,
    config,
    rng  // One call per player
  );

  // Update team mean fatigue
  state.home.currentFatigueMean = computeMeanFatigue(state.homePlayers);
  state.away.currentFatigueMean = computeMeanFatigue(state.awayPlayers);

  // Update current minute
  state.currentMinute = minute + MINUTES_PER_SLOT;
}
