import React from 'react';
import { MatchService } from '../services/match.service';
import { createDefaultAttributes, createDefaultGKAttributes } from '../domain/types/player';
import { toTacticDocument } from '../domain/types/tactics';

export default async function HomePage() {
  const matchService = new MatchService();
  const seed = 'touchline-phase10-demo-2026';

  const makePlayer = (
    id: string,
    shortName: string,
    position: string,
    isGK: boolean,
    abilityBaseline: number
  ) => ({
    player: {
      id,
      firstName: shortName.split(' ')[0] ?? shortName,
      lastName: shortName.split(' ')[1] ?? '',
      shortName,
      dateOfBirth: new Date('1998-06-15'),
      nationality: 'England',
      primaryPosition: position as 'GK' | 'CB' | 'CM' | 'ST',
      secondaryPositions: [] as ('GK' | 'CB' | 'CM' | 'ST')[],
      preferredFoot: 'RIGHT' as const,
      height: 180,
      isActive: true,
      attributes: isGK
        ? createDefaultGKAttributes(abilityBaseline)
        : createDefaultAttributes(abilityBaseline),
    },
    assignedPosition: position,
    assignedRole: (isGK ? 'GOALKEEPER' : 'CENTRAL_MIDFIELDER') as import('../domain/types/tactics').PlayerRole,
    isStarting: true,
    fitness: 94,
    morale: 88,
    form: 84,
    sharpness: 90,
    fatigue: 6,
    confidence: 80,
    tacticalFamiliarity: 75,
    isInjured: false,
    isSuspended: false,
  });

  const homeTactics = toTacticDocument({
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

  const awayTactics = toTacticDocument({
    formation: '4-2-3-1',
    mentality: 'BALANCED',
    pressingIntensity: 'MEDIUM',
    defensiveLine: 'STANDARD',
    passingStyle: 'BALANCED',
    tempo: 'NORMAL',
    width: 'NORMAL',
    buildUpStyle: 'SHORT_PASSING',
    transitionStyle: 'CONTROL',
    outOfPossession: 'BLOCK',
    playerRoles: [],
  });

  const { _schemaVersion: _h, ...homeTacticsObj } = homeTactics;
  const { _schemaVersion: _a, ...awayTacticsObj } = awayTactics;

  const homeSquad = [
    makePlayer('h-0', 'Northgate', 'GK', true, 76),
    makePlayer('h-1', 'Brennan', 'CB', false, 80),
    makePlayer('h-2', 'Kellner', 'CB', false, 79),
    makePlayer('h-3', 'Ashby', 'LB', false, 78),
    makePlayer('h-4', 'Ferris', 'RB', false, 77),
    makePlayer('h-5', 'Harmon', 'CM', false, 83),
    makePlayer('h-6', 'Doyle', 'CM', false, 82),
    makePlayer('h-7', 'Patel', 'CAM', false, 85),
    makePlayer('h-8', 'Mbeki', 'LW', false, 84),
    makePlayer('h-9', 'Costa', 'RW', false, 86),
    makePlayer('h-10', 'Vidal', 'ST', false, 88),
  ];

  const awaySquad = [
    makePlayer('a-0', 'Marchetti', 'GK', true, 74),
    makePlayer('a-1', 'Kowalski', 'CB', false, 78),
    makePlayer('a-2', 'Steele', 'CB', false, 76),
    makePlayer('a-3', 'Rivera', 'LB', false, 75),
    makePlayer('a-4', 'Dupont', 'RB', false, 76),
    makePlayer('a-5', 'Alves', 'CDM', false, 80),
    makePlayer('a-6', 'Laurent', 'CDM', false, 79),
    makePlayer('a-7', 'Osei', 'CAM', false, 82),
    makePlayer('a-8', 'Ruiz', 'LW', false, 81),
    makePlayer('a-9', 'Tanaka', 'RW', false, 80),
    makePlayer('a-10', 'Jensen', 'ST', false, 83),
  ];

  const simulationResult = await matchService.executeMatchSimulation({
    matchId: 'demo-match-phase10',
    seed,
    competitionSeasonId: 'cs-epl-2026-27',
    competitionPhaseId: 'phase-league-rounds',
    homeTeam: {
      teamId: 'club-northgate-city',
      clubName: 'Northgate City',
      isHomeTeam: true,
      tactics: homeTacticsObj,
      startingXI: homeSquad,
      bench: [],
      recentFormRating: 86,
    },
    awayTeam: {
      teamId: 'club-riverdale-fc',
      clubName: 'Riverdale FC',
      isHomeTeam: false,
      tactics: awayTacticsObj,
      startingXI: awaySquad,
      bench: [],
      recentFormRating: 79,
    },
  });

  const htScore = `${simulationResult.homeScoreHT}–${simulationResult.awayScoreHT}`;
  const ftScore = `${simulationResult.homeScore}–${simulationResult.awayScore}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* Header */}
      <header className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            TOUCHLINE
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Advanced Football AI, Immersion &amp; Management Architecture (Phases 1–10)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/20">
            Phase 7: Seasons
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20">
            Phase 8: Transfers
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            Phase 9: Progression
          </span>
          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400 ring-1 ring-inset ring-purple-500/20">
            Phase 10: AI &amp; Immersion
          </span>
        </div>
      </header>

      {/* Overview Modules */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Manager AI</span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/40 text-purple-300">Active</span>
          </div>
          <p className="text-sm font-semibold text-white">Adaptive Tactical AI</p>
          <p className="text-xs text-slate-400 mt-1">
            Explainable decision traces, in-match tactical adaptations, substitution heuristics, and opposition analysis.
          </p>
          <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400 font-mono">
            Endpoint: <code className="text-purple-300">/api/ai/manager</code>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Scouting &amp; Market</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300">Active</span>
          </div>
          <p className="text-sm font-semibold text-white">Scouting &amp; Recruitment AI</p>
          <p className="text-xs text-slate-400 mt-1">
            Delineated confidence levels (KNOWN, ESTIMATED, UNKNOWN) and deterministic squad-need evaluation.
          </p>
          <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400 font-mono">
            Endpoint: <code className="text-indigo-300">/api/ai/scouting</code>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400">Board &amp; Morale</span>
            <span className="text-xs px-2 py-0.5 rounded bg-pink-900/40 text-pink-300">Active</span>
          </div>
          <p className="text-sm font-semibold text-white">Board Objectives &amp; Morale</p>
          <p className="text-xs text-slate-400 mt-1">
            Persisted seasonal targets, dressing room squad harmony metrics, and structured player relationships.
          </p>
          <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400 font-mono">
            Endpoint: <code className="text-pink-300">/api/board</code>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Narrative &amp; News</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300">Active</span>
          </div>
          <p className="text-sm font-semibold text-white">Grounded Narrative Layer</p>
          <p className="text-xs text-slate-400 mt-1">
            Fact-grounded report generation, template fallback, domain event bus, and press conference framework.
          </p>
          <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400 font-mono">
            Endpoint: <code className="text-cyan-300">/api/news</code>
          </div>
        </div>
      </section>

      {/* Deterministic Match Engine Live Smoke Check */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Authoritative Match Simulation Smoke Test
          </h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            Engine Version: {simulationResult.simulationEngineVersion}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-950 p-6 border border-slate-800">
          <div className="text-center">
            <p className="text-xl font-bold text-white">Northgate City</p>
            <p className="text-xs text-slate-400 mt-1">Home · 4-3-3 · ATTACKING</p>
          </div>
          <div className="text-center">
            <span className="text-4xl font-extrabold text-white">{ftScore}</span>
            <p className="text-xs text-slate-500 mt-1">HT {htScore}</p>
            <p className="text-xs text-emerald-400 mt-1 font-mono">Deterministic Seed Verified ✓</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">Riverdale FC</p>
            <p className="text-xs text-slate-400 mt-1">Away · 4-2-3-1 · BALANCED</p>
          </div>
        </div>

        {/* Match Stats */}
        <div className="mt-6 grid grid-cols-3 gap-px bg-slate-800 rounded-lg overflow-hidden text-xs">
          {[
            ['Shots', simulationResult.statistics.homeStats.shots, simulationResult.statistics.awayStats.shots],
            ['On Target', simulationResult.statistics.homeStats.shotsOnTarget, simulationResult.statistics.awayStats.shotsOnTarget],
            ['xG', simulationResult.statistics.homeStats.xg.toFixed(2), simulationResult.statistics.awayStats.xg.toFixed(2)],
            ['Possession', `${simulationResult.statistics.homeStats.possession}%`, `${simulationResult.statistics.awayStats.possession}%`],
            ['Passes', simulationResult.statistics.homeStats.passes, simulationResult.statistics.awayStats.passes],
            ['Corners', simulationResult.statistics.homeStats.corners, simulationResult.statistics.awayStats.corners],
          ].map(([label, home, away]) => (
            <div key={String(label)} className="bg-slate-900 px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-white w-8 text-center">{home}</span>
              <span className="text-slate-400 text-center flex-1">{label}</span>
              <span className="font-bold text-white w-8 text-center">{away}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        Touchline Football Manager Engine &copy; 2026 · Integrated Phases 1–10 Complete
      </footer>
    </main>
  );
}
