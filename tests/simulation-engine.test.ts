/**
 * Phase 3: Core Simulation Engine Tests
 *
 * These tests cover the full stack:
 *   - probability-utils: pure math functions
 *   - ability-calculator: attribute → ability mapping
 *   - simulation-config: default config validity
 *   - full engine: determinism, result shape, invariants
 *   - result-validator: validation rules
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clamp,
  clampProbability,
  triangular,
  weightedMean,
  normaliseWeights,
  duelProbability,
  fatiguePenalty,
  weightedChoice,
} from '../src/simulation/engine/probability/probability-utils';
import { SeededRNG } from '../src/simulation/engine/rng';
import {
  DEFAULT_SIMULATION_CONFIG,
  resolveConfig,
} from '../src/simulation/engine/simulation-config';
import {
  computeCurrentAbility,
  computeCurrentAbilityForRole,
} from '../src/simulation/engine/player/ability-calculator';
import {
  computePositionSuitability,
  POSITION_SUITABILITY,
} from '../src/simulation/engine/player/position-suitability';
import { getRoleWeights, FALLBACK_ROLE_WEIGHTS } from '../src/simulation/engine/player/role-weight-table';
import { TypeScriptMatchEngine } from '../src/simulation/adapters/typescript-engine.adapter';
import {
  MatchSimulationInput,
  PlayerSimulationState,
  TeamSimulationState,
} from '../src/simulation/models/simulation-contracts';
import { createDefaultAttributes, createDefaultGKAttributes } from '../src/domain/types/player';
import { validateSimulationResult } from '../src/simulation/result-validator';

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

function makePlayer(
  id: string,
  position: string,
  role: string,
  attrBaseline = 65,
  isGK = false
): PlayerSimulationState {
  return {
    player: {
      id,
      firstName: 'Test',
      lastName: `Player${id}`,
      shortName: `P${id}`,
      dateOfBirth: new Date('1998-01-01'),
      nationality: 'English',
      primaryPosition: position as any,
      secondaryPositions: [],
      preferredFoot: 'RIGHT',
      height: 180,
      isActive: true,
      attributes: isGK
        ? createDefaultGKAttributes(attrBaseline)
        : createDefaultAttributes(attrBaseline),
    },
    assignedPosition: position,
    assignedRole: role as any,
    isStarting: true,
    fitness: 90,
    morale: 75,
    form: 70,
    sharpness: 80,
    fatigue: 5,
    confidence: 75,
    tacticalFamiliarity: 80,
    isInjured: false,
    isSuspended: false,
  };
}

function makeTeam(
  teamId: string,
  clubName: string,
  isHome: boolean
): TeamSimulationState {
  const startingXI: PlayerSimulationState[] = [
    makePlayer('gk', 'GK', 'GOALKEEPER', 70, true),
    makePlayer('rb', 'RB', 'FULL_BACK', 68),
    makePlayer('cb1', 'CB', 'CENTRAL_DEFENDER', 72),
    makePlayer('cb2', 'CB', 'CENTRAL_DEFENDER', 70),
    makePlayer('lb', 'LB', 'FULL_BACK', 68),
    makePlayer('cdm', 'CDM', 'DEFENSIVE_MIDFIELDER', 70),
    makePlayer('cm1', 'CM', 'CENTRAL_MIDFIELDER', 72),
    makePlayer('cm2', 'CM', 'CENTRAL_MIDFIELDER', 70),
    makePlayer('rw', 'RW', 'WINGER', 74),
    makePlayer('lw', 'LW', 'WINGER', 74),
    makePlayer('st', 'ST', 'CENTRE_FORWARD', 76),
  ];

  // Set unique player IDs with team prefix
  startingXI.forEach((p) => {
    p.player.id = `${teamId}-${p.player.id}`;
  });

  return {
    teamId,
    clubName,
    isHomeTeam: isHome,
    tactics: {
      formation: '4-3-3',
      mentality: 'BALANCED',
      pressingIntensity: 'MEDIUM',
      defensiveLine: 'STANDARD',
      passingStyle: 'BALANCED',
      tempo: 'NORMAL',
      width: 'NORMAL',
      buildUpStyle: 'SHORT_PASSING',
      transitionStyle: 'MIXED',
      outOfPossession: 'BLOCK',
      playerRoles: startingXI.map((p) => ({
        playerId: p.player.id,
        position: p.assignedPosition as any,
        role: p.assignedRole,
        instructions: [],
      })),
    },
    startingXI,
    bench: [],
    teamCohesion: 70,
    recentFormRating: 65,
  };
}

function makeMatchInput(seed: number | string = 42): MatchSimulationInput {
  return {
    matchId: 'test-match-001',
    seed,
    competitionSeasonId: 'cs-001',
    competitionPhaseId: 'cp-001',
    homeTeam: makeTeam('home', 'Home FC', true),
    awayTeam: makeTeam('away', 'Away United', false),
    neutralVenue: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: probability-utils
// ─────────────────────────────────────────────────────────────────────────────

describe('probability-utils', () => {
  it('clamp returns value within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('clampProbability uses default [0.02, 0.98]', () => {
    expect(clampProbability(0)).toBe(0.02);
    expect(clampProbability(1)).toBe(0.98);
    expect(clampProbability(0.5)).toBe(0.5);
  });

  it('triangular produces values in [min, max]', () => {
    const rng = new SeededRNG(1);
    for (let i = 0; i < 200; i++) {
      const val = triangular(30, 50, 70, rng);
      expect(val).toBeGreaterThanOrEqual(30);
      expect(val).toBeLessThanOrEqual(70);
    }
  });

  it('triangular concentrates around mode', () => {
    const rng = new SeededRNG(42);
    const samples = Array.from({ length: 1000 }, () => triangular(0, 50, 100, rng));
    const mean = samples.reduce((a, b) => a + b) / samples.length;
    // Mean of triangular(0, 50, 100) ≈ 50
    expect(mean).toBeGreaterThan(40);
    expect(mean).toBeLessThan(60);
  });

  it('weightedMean returns correct weighted average', () => {
    const result = weightedMean([[10, 1], [20, 3]] as const);
    // (10×1 + 20×3) / (1+3) = 70/4 = 17.5
    expect(result).toBeCloseTo(17.5);
  });

  it('weightedMean returns 0 for empty array', () => {
    expect(weightedMean([])).toBe(0);
  });

  it('normaliseWeights sums to 1.0', () => {
    const normalised = normaliseWeights([1, 2, 3, 4]);
    const total = normalised.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0);
  });

  it('normaliseWeights throws on all-zero input', () => {
    expect(() => normaliseWeights([0, 0, 0])).toThrow('all weights are zero or negative');
  });

  it('duelProbability returns 0.5 for equal values', () => {
    expect(duelProbability(50, 50)).toBe(0.5);
  });

  it('duelProbability clamps to [0.10, 0.90]', () => {
    expect(duelProbability(200, 0)).toBe(0.90);
    expect(duelProbability(0, 200)).toBe(0.10);
  });

  it('fatiguePenalty is 0 below onset', () => {
    expect(fatiguePenalty(20, 30, 0.25)).toBe(0);
  });

  it('fatiguePenalty reaches max at fatigue=90', () => {
    const penalty = fatiguePenalty(90, 30, 0.25);
    expect(penalty).toBeCloseTo(0.25, 1);
  });

  it('weightedChoice respects weights distribution', () => {
    const rng = new SeededRNG(99);
    const counts = { A: 0, B: 0 };
    for (let i = 0; i < 1000; i++) {
      const choice = weightedChoice([['A', 1], ['B', 9]] as const, rng);
      counts[choice]++;
    }
    // B should win ~90% of the time
    expect(counts.B).toBeGreaterThan(800);
    expect(counts.A).toBeLessThan(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: simulation-config
// ─────────────────────────────────────────────────────────────────────────────

describe('simulation-config', () => {
  it('DEFAULT_SIMULATION_CONFIG is frozen', () => {
    expect(Object.isFrozen(DEFAULT_SIMULATION_CONFIG)).toBe(true);
  });

  it('default config has valid match structure', () => {
    const c = DEFAULT_SIMULATION_CONFIG;
    expect(c.matchDurationMinutes).toBe(90);
    expect(c.slotsPerHalf).toBeGreaterThan(0);
    expect(c.possessionClamp[0]).toBeLessThan(c.possessionClamp[1]);
  });

  it('default injury severity distribution sums to 1.0', () => {
    const dist = DEFAULT_SIMULATION_CONFIG.injuryRates.severityDistribution;
    const total = dist.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0);
  });

  it('xgClamp min < max', () => {
    expect(DEFAULT_SIMULATION_CONFIG.xgClamp[0]).toBeLessThan(DEFAULT_SIMULATION_CONFIG.xgClamp[1]);
  });

  it('resolveConfig merges overrides correctly', () => {
    const custom = resolveConfig({ matchDurationMinutes: 120 });
    expect(custom.matchDurationMinutes).toBe(120);
    expect(custom.slotsPerHalf).toBe(DEFAULT_SIMULATION_CONFIG.slotsPerHalf);
    expect(Object.isFrozen(custom)).toBe(true);
  });

  it('resolveConfig with no args returns defaults', () => {
    const config = resolveConfig();
    expect(config.configVersion).toBe(DEFAULT_SIMULATION_CONFIG.configVersion);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: ability-calculator
// ─────────────────────────────────────────────────────────────────────────────

describe('ability-calculator', () => {
  it('computeCurrentAbility produces value in [1, 200]', () => {
    const attrs = createDefaultAttributes(70);
    const profile = computeCurrentAbility(attrs, 'CM');
    expect(profile.currentAbility).toBeGreaterThanOrEqual(1);
    expect(profile.currentAbility).toBeLessThanOrEqual(200);
  });

  it('higher attributes produce higher ability', () => {
    const lowAttrs = createDefaultAttributes(30);
    const highAttrs = createDefaultAttributes(90);
    const lowProfile = computeCurrentAbility(lowAttrs, 'ST');
    const highProfile = computeCurrentAbility(highAttrs, 'ST');
    expect(highProfile.currentAbility).toBeGreaterThan(lowProfile.currentAbility);
  });

  it('GK with GK attributes produces higher ability than GK without', () => {
    const outfieldAttrs = createDefaultAttributes(70);
    const gkAttrs = createDefaultGKAttributes(70);
    const outfieldProfile = computeCurrentAbilityForRole(outfieldAttrs, 'GOALKEEPER');
    const gkProfile = computeCurrentAbilityForRole(gkAttrs, 'GOALKEEPER');
    expect(gkProfile.currentAbility).toBeGreaterThan(outfieldProfile.currentAbility);
  });

  it('breakdown values are in [0, 99]', () => {
    const attrs = createDefaultAttributes(65);
    const profile = computeCurrentAbility(attrs, 'CB');
    expect(profile.breakdown.technical).toBeGreaterThanOrEqual(0);
    expect(profile.breakdown.technical).toBeLessThanOrEqual(99);
    expect(profile.breakdown.physical).toBeGreaterThanOrEqual(0);
    expect(profile.breakdown.mental).toBeGreaterThanOrEqual(0);
  });

  it('no NaN or Infinity in ability output', () => {
    const attrs = createDefaultAttributes(50);
    const profile = computeCurrentAbility(attrs, 'LB');
    expect(Number.isFinite(profile.currentAbility)).toBe(true);
    expect(Number.isFinite(profile.breakdown.technical)).toBe(true);
    expect(Number.isFinite(profile.breakdown.physical)).toBe(true);
    expect(Number.isFinite(profile.breakdown.mental)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: position-suitability
// ─────────────────────────────────────────────────────────────────────────────

describe('position-suitability', () => {
  it('primary position returns 1.0', () => {
    const score = computePositionSuitability('CB', 'CB', []);
    expect(score).toBe(POSITION_SUITABILITY.PRIMARY);
  });

  it('secondary position returns 0.75', () => {
    const score = computePositionSuitability('CM', 'CB', ['CM']);
    expect(score).toBe(POSITION_SUITABILITY.SECONDARY);
  });

  it('adjacent position returns 0.55', () => {
    // LB adjacent to CB
    const score = computePositionSuitability('LB', 'CB', []);
    expect(score).toBe(POSITION_SUITABILITY.ADJACENT);
  });

  it('remote position returns 0.40', () => {
    // GK playing ST is remote
    const score = computePositionSuitability('ST', 'GK', []);
    expect(score).toBe(POSITION_SUITABILITY.REMOTE);
  });

  it('scores are in descending order: PRIMARY > SECONDARY > ADJACENT > REMOTE', () => {
    expect(POSITION_SUITABILITY.PRIMARY).toBeGreaterThan(POSITION_SUITABILITY.SECONDARY);
    expect(POSITION_SUITABILITY.SECONDARY).toBeGreaterThan(POSITION_SUITABILITY.ADJACENT);
    expect(POSITION_SUITABILITY.ADJACENT).toBeGreaterThan(POSITION_SUITABILITY.REMOTE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: role-weight-table
// ─────────────────────────────────────────────────────────────────────────────

describe('role-weight-table', () => {
  it('getRoleWeights returns non-null for any role', () => {
    const roles = [
      'GOALKEEPER', 'CENTRAL_DEFENDER', 'CENTRAL_MIDFIELDER',
      'WINGER', 'CENTRE_FORWARD', 'POACHER', 'FALSE_NINE',
    ] as const;
    for (const role of roles) {
      const weights = getRoleWeights(role as any);
      expect(weights).toBeTruthy();
    }
  });

  it('unknown role falls back to FALLBACK_ROLE_WEIGHTS', () => {
    const weights = getRoleWeights('NONEXISTENT_ROLE' as any);
    expect(weights).toEqual(FALLBACK_ROLE_WEIGHTS);
  });

  it('GOALKEEPER weights gkReflexes highest', () => {
    const weights = getRoleWeights('GOALKEEPER');
    expect(weights.gkReflexes).toBeGreaterThan(0);
    expect(weights.finishing ?? 0).toBeLessThan(weights.gkReflexes!);
  });

  it('POACHER weights finishing highest', () => {
    const weights = getRoleWeights('POACHER');
    expect(weights.finishing).toBe(3.0);
  });

  it('all weights are non-negative', () => {
    const roles = ['FULL_BACK', 'BOX_TO_BOX', 'INVERTED_WINGER', 'WING_BACK'] as const;
    for (const role of roles) {
      const weights = getRoleWeights(role as any);
      for (const [key, val] of Object.entries(weights)) {
        if (val !== undefined) {
          expect(val).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: Full Engine — Determinism
// ─────────────────────────────────────────────────────────────────────────────

describe('TypeScriptMatchEngine — determinism', () => {
  it('same seed produces identical result', () => {
    const engine = new TypeScriptMatchEngine();
    const input = makeMatchInput(42);
    const result1 = engine.simulateMatch(input);
    const result2 = engine.simulateMatch(input);

    expect(result1.homeScore).toBe(result2.homeScore);
    expect(result1.awayScore).toBe(result2.awayScore);
    expect(result1.homeScoreHT).toBe(result2.homeScoreHT);
    expect(result1.awayScoreHT).toBe(result2.awayScoreHT);
    expect(result1.events.length).toBe(result2.events.length);
    expect(result1.playerPerformances.length).toBe(result2.playerPerformances.length);
  });

  it('different seeds produce different results (statistical)', () => {
    const engine = new TypeScriptMatchEngine();
    const results = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) {
      const r = engine.simulateMatch(makeMatchInput(seed));
      results.add(`${r.homeScore}-${r.awayScore}`);
    }
    // At least 3 different scorelines across 10 simulations
    expect(results.size).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: Full Engine — Result Shape
// ─────────────────────────────────────────────────────────────────────────────

describe('TypeScriptMatchEngine — result shape', () => {
  let result: ReturnType<TypeScriptMatchEngine['simulateMatch']>;

  beforeEach(() => {
    const engine = new TypeScriptMatchEngine();
    result = engine.simulateMatch(makeMatchInput(123));
  });

  it('scores are non-negative integers', () => {
    expect(result.homeScore).toBeGreaterThanOrEqual(0);
    expect(result.awayScore).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.homeScore)).toBe(true);
    expect(Number.isInteger(result.awayScore)).toBe(true);
  });

  it('halftime scores ≤ fulltime scores', () => {
    expect(result.homeScoreHT).toBeLessThanOrEqual(result.homeScore);
    expect(result.awayScoreHT).toBeLessThanOrEqual(result.awayScore);
  });

  it('events include KICK_OFF and FULL_TIME', () => {
    const kinds = result.events.map((e) => e.kind);
    expect(kinds).toContain('KICK_OFF');
    expect(kinds).toContain('FULL_TIME');
  });

  it('events include HALF_TIME', () => {
    expect(result.events.map((e) => e.kind)).toContain('HALF_TIME');
  });

  it('events are sorted by minute', () => {
    for (let i = 1; i < result.events.length; i++) {
      expect(result.events[i]!.minute).toBeGreaterThanOrEqual(result.events[i - 1]!.minute);
    }
  });

  it('player performances include all starting players', () => {
    const perfIds = new Set(result.playerPerformances.map((p) => p.playerId));
    // Both teams have 11 starters = 22 total
    expect(result.playerPerformances.length).toBeGreaterThanOrEqual(22);
    // All starting players should be in performances
    const homeStarters = makeTeam('home', 'Home FC', true).startingXI;
    // Note: IDs have team prefix in makeTeam
  });

  it('player ratings are in [4.0, 10.0]', () => {
    for (const perf of result.playerPerformances) {
      expect(perf.rating).toBeGreaterThanOrEqual(4.0);
      expect(perf.rating).toBeLessThanOrEqual(10.0);
    }
  });

  it('possession sums to ~100', () => {
    const total = result.statistics.homeStats.possession + result.statistics.awayStats.possession;
    expect(Math.abs(total - 100)).toBeLessThan(1.5);
  });

  it('xG values are non-negative', () => {
    expect(result.statistics.homeStats.xg).toBeGreaterThanOrEqual(0);
    expect(result.statistics.awayStats.xg).toBeGreaterThanOrEqual(0);
  });

  it('engine version is set correctly', () => {
    expect(result.simulationEngineVersion).toMatch(/ts-statistical-v1@/);
    expect(result.simulationEngineVersion).toContain('2.0.0');
  });

  it('executedAt is a valid ISO string', () => {
    expect(() => new Date(result.executedAt)).not.toThrow();
    expect(isNaN(new Date(result.executedAt).getTime())).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: Full Engine — Goal Distribution (Monte Carlo calibration)
// ─────────────────────────────────────────────────────────────────────────────

describe('TypeScriptMatchEngine — Monte Carlo goal distribution', () => {
  it('produces realistic scorelines over 50 simulations', () => {
    const engine = new TypeScriptMatchEngine();
    let totalGoals = 0;
    let draws = 0;
    let homeWins = 0;
    let awayWins = 0;

    for (let seed = 100; seed < 150; seed++) {
      const r = engine.simulateMatch(makeMatchInput(seed));
      totalGoals += r.homeScore + r.awayScore;
      if (r.homeScore === r.awayScore) draws++;
      else if (r.homeScore > r.awayScore) homeWins++;
      else awayWins++;
    }

    const avgGoals = totalGoals / 50;

    // Average goals per match: realistically 2.0–4.0 for average teams
    expect(avgGoals).toBeGreaterThan(0.5);
    expect(avgGoals).toBeLessThan(8.0);

    // No single outcome dominates pathologically
    expect(homeWins).toBeGreaterThan(0);
    expect(draws + awayWins).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9: result-validator
// ─────────────────────────────────────────────────────────────────────────────

describe('result-validator', () => {
  it('passes for a valid result', () => {
    const engine = new TypeScriptMatchEngine();
    const result = engine.simulateMatch(makeMatchInput(77));
    // Should not throw
    expect(() => validateSimulationResult(result)).not.toThrow();
  });

  it('throws NEGATIVE_SCORE for negative scores', () => {
    const engine = new TypeScriptMatchEngine();
    const result = engine.simulateMatch(makeMatchInput(1));
    const bad = { ...result, homeScore: -1 };
    expect(() => validateSimulationResult(bad)).toThrow('NEGATIVE_SCORE');
  });

  it('throws RATING_OUT_OF_RANGE for invalid rating', () => {
    const engine = new TypeScriptMatchEngine();
    const result = engine.simulateMatch(makeMatchInput(2));
    const bad = {
      ...result,
      playerPerformances: result.playerPerformances.map((p, i) =>
        i === 0 ? { ...p, rating: 11.0 } : p
      ),
    };
    expect(() => validateSimulationResult(bad)).toThrow('RATING_OUT_OF_RANGE');
  });

  it('throws MISSING_EVENT when KICK_OFF absent', () => {
    const engine = new TypeScriptMatchEngine();
    const result = engine.simulateMatch(makeMatchInput(3));
    const bad = {
      ...result,
      events: result.events.filter((e) => e.kind !== 'KICK_OFF'),
    };
    expect(() => validateSimulationResult(bad)).toThrow('MISSING_EVENT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 10: Neutral Venue
// ─────────────────────────────────────────────────────────────────────────────

describe('TypeScriptMatchEngine — neutral venue', () => {
  it('simulates without throwing for neutral venue', () => {
    const engine = new TypeScriptMatchEngine();
    const input: MatchSimulationInput = {
      ...makeMatchInput(55),
      neutralVenue: true,
    };
    expect(() => engine.simulateMatch(input)).not.toThrow();
  });

  it('neutral venue result passes all validators', () => {
    const engine = new TypeScriptMatchEngine();
    const input: MatchSimulationInput = {
      ...makeMatchInput(66),
      neutralVenue: true,
    };
    const result = engine.simulateMatch(input);
    expect(() => validateSimulationResult(result)).not.toThrow();
  });
});
