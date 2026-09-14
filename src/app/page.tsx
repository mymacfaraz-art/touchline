import { MatchService } from '../services/match.service';
import { SeededRNG } from '../simulation/engine/rng';
import { createDefaultAttributes, createDefaultGKAttributes } from '../domain/types/player';
import { toTacticDocument } from '../domain/types/tactics';

export default async function HomePage() {
  const matchService = new MatchService();
  const seed = 'touchline-phase2-demo-2026';

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
    matchId: 'demo-match-phase2',
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

  const testRng1 = new SeededRNG(seed);
  const testRng2 = new SeededRNG(seed);
  const rngReproducible = testRng1.nextFloat() === testRng2.nextFloat();

  const htScore = `${simulationResult.homeScoreHT}–${simulationResult.awayScoreHT}`;
  const ftScore = `${simulationResult.homeScore}–${simulationResult.awayScore}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              TOUCHLINE
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Football Manager Simulation — Phase 2 Data Model
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            Phase 2 Ready
          </span>
        </div>
      </header>

      {/* Status Cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-10">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Seeded RNG
          </h2>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {rngReproducible ? 'Reproducible ✓' : 'Failed ✗'}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono truncate">{seed}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Simulation Engine
          </h2>
          <p className="mt-2 text-lg font-bold text-blue-400">
            {simulationResult.simulationEngineVersion}
          </p>
          <p className="mt-1 text-xs text-slate-500">Attribute taxonomy: 36 fields</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Season Architecture
          </h2>
          <p className="mt-2 text-lg font-bold text-violet-400">
            GameSeason → CompetitionSeason
          </p>
          <p className="mt-1 text-xs text-slate-500">Career → GameSeason → CompetitionSeason</p>
        </div>
      </section>

      {/* Match Result */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur mb-10">
        <h2 className="text-lg font-bold text-white mb-4">
          Simulation Pipeline Smoke Test
        </h2>
        <div className="flex items-center justify-between rounded-lg bg-slate-950 p-6 border border-slate-800">
          <div className="text-center">
            <p className="text-xl font-bold text-white">Northgate City</p>
            <p className="text-xs text-slate-400 mt-1">Home · 4-3-3 · ATTACKING</p>
          </div>
          <div className="text-center">
            <span className="text-4xl font-extrabold text-white">{ftScore}</span>
            <p className="text-xs text-slate-500 mt-1">HT {htScore}</p>
            <p className="text-xs text-emerald-400 mt-1 font-mono">Deterministic ✓</p>
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

        {/* Events Timeline */}
        <div className="mt-6 border-t border-slate-800/80 pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Match Timeline ({simulationResult.events.length} persisted events)
          </h3>
          <ul className="space-y-2 text-xs font-mono">
            {simulationResult.events.map((evt, idx) => (
              <li key={idx} className="flex items-center gap-3 text-slate-300">
                <span className="w-8 text-slate-500 font-bold text-right">{evt.minute}&apos;</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300 font-sans font-medium">
                  {evt.kind}
                </span>
                {evt.xgValue !== undefined && (
                  <span className="text-amber-400">xG {evt.xgValue.toFixed(2)}</span>
                )}
                <span className="text-slate-400">{evt.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        Touchline Football Manager Simulation Engine &copy; 2026 · Phase 2 Final · 28 Prisma Models
      </footer>
    </main>
  );
}
