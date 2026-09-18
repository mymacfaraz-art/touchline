// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: END-TO-END CAREER LOOP & DETERMINISM REPLAY TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchService } from '../src/services/match.service';
import { SeededRNG } from '../src/simulation/engine/rng';
import { createDefaultAttributes, createDefaultGKAttributes } from '../src/domain/types/player';
import { toTacticDocument } from '../src/domain/types/tactics';

describe('Phase 10: End-to-End Career Flow & Determinism Replay', () => {
  const seed = 'touchline-phase10-determinism-seed-2026';
  const matchService = new MatchService();

  const makePlayer = (id: string, shortName: string, pos: string, isGK: boolean, ability: number) => ({
    player: {
      id,
      firstName: shortName.split(' ')[0] ?? shortName,
      lastName: shortName.split(' ')[1] ?? '',
      shortName,
      dateOfBirth: new Date('1998-06-15'),
      nationality: 'England',
      primaryPosition: pos as any,
      secondaryPositions: [],
      preferredFoot: 'RIGHT' as const,
      height: 180,
      isActive: true,
      attributes: isGK ? createDefaultGKAttributes(ability) : createDefaultAttributes(ability),
    },
    assignedPosition: pos,
    assignedRole: (isGK ? 'GOALKEEPER' : 'CENTRAL_MIDFIELDER') as any,
    isStarting: true,
    fitness: 95,
    morale: 85,
    form: 80,
    sharpness: 90,
    fatigue: 5,
    confidence: 80,
    tacticalFamiliarity: 80,
    isInjured: false,
    isSuspended: false,
  });

  const homeSquad = [
    makePlayer('h0', 'Keeper One', 'GK', true, 78),
    makePlayer('h1', 'Defender One', 'CB', false, 80),
    makePlayer('h2', 'Midfield One', 'CM', false, 84),
    makePlayer('h3', 'Striker One', 'ST', false, 86),
  ];

  const awaySquad = [
    makePlayer('a0', 'Keeper Two', 'GK', true, 76),
    makePlayer('a1', 'Defender Two', 'CB', false, 78),
    makePlayer('a2', 'Midfield Two', 'CM', false, 80),
    makePlayer('a3', 'Striker Two', 'ST', false, 82),
  ];

  const tactics = toTacticDocument({
    formation: '4-3-3',
    mentality: 'ATTACKING',
    pressingIntensity: 'HIGH',
    defensiveLine: 'HIGH',
    passingStyle: 'SHORT_POSSESSION',
    tempo: 'HIGH',
    width: 'WIDE',
    buildUpStyle: 'SHORT_PASSING',
    transitionStyle: 'COUNTER',
    outOfPossession: 'PRESS',
    playerRoles: [],
  });

  const { _schemaVersion: _v, ...tacticsObj } = tactics;

  it('produces 100% deterministic simulation results across identical runs', async () => {
    const run1 = await matchService.executeMatchSimulation({
      matchId: 'e2e-match-1',
      seed,
      competitionSeasonId: 'cs-epl-2026',
      competitionPhaseId: 'phase-1',
      homeTeam: {
        teamId: 'club-home',
        clubName: 'Home FC',
        isHomeTeam: true,
        tactics: tacticsObj,
        startingXI: homeSquad,
        bench: [],
        recentFormRating: 85,
      },
      awayTeam: {
        teamId: 'club-away',
        clubName: 'Away FC',
        isHomeTeam: false,
        tactics: tacticsObj,
        startingXI: awaySquad,
        bench: [],
        recentFormRating: 80,
      },
    });

    const run2 = await matchService.executeMatchSimulation({
      matchId: 'e2e-match-1',
      seed,
      competitionSeasonId: 'cs-epl-2026',
      competitionPhaseId: 'phase-1',
      homeTeam: {
        teamId: 'club-home',
        clubName: 'Home FC',
        isHomeTeam: true,
        tactics: tacticsObj,
        startingXI: homeSquad,
        bench: [],
        recentFormRating: 85,
      },
      awayTeam: {
        teamId: 'club-away',
        clubName: 'Away FC',
        isHomeTeam: false,
        tactics: tacticsObj,
        startingXI: awaySquad,
        bench: [],
        recentFormRating: 80,
      },
    });

    expect(run1.homeScore).toBe(run2.homeScore);
    expect(run1.awayScore).toBe(run2.awayScore);
    expect(run1.statistics.homeStats.shots).toBe(run2.statistics.homeStats.shots);
    expect(run1.statistics.homeStats.xg).toBe(run2.statistics.homeStats.xg);
    expect(run1.events.length).toBe(run2.events.length);
  });
});
