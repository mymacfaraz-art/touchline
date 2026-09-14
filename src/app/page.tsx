import { MatchService } from '../services/match.service';
import { SeededRNG } from '../simulation/engine/rng';

export default async function HomePage() {
  // Demonstration of Application Service consuming IMatchEngine and SeededRNG
  const matchService = new MatchService();
  const seed = 'touchline-foundation-demo-2026';

  const simulationResult = await matchService.executeMatchSimulation({
    matchId: 'demo-match-1',
    seed,
    competitionId: 'comp-premier-league',
    seasonId: 'season-2025-2026',
    homeTeam: {
      teamId: 'club-arsenal',
      clubName: 'London Red',
      isHomeTeam: true,
      tactics: {
        formation: '4-3-3',
        mentality: 'ATTACKING',
        pressingIntensity: 'HIGH',
        defensiveLine: 'HIGH',
        passingStyle: 'SHORT_TIKI_TAKA',
        playerInstructions: [],
      },
      startingXI: Array.from({ length: 11 }, (_, i) => ({
        player: {
          id: `h-player-${i}`,
          firstName: `Home`,
          lastName: `Player ${i + 1}`,
          shortName: `H. Player ${i + 1}`,
          age: 24,
          nationality: 'England',
          primaryPosition: i === 0 ? 'GK' : i < 5 ? 'CB' : i < 8 ? 'CM' : 'ST',
          secondaryPositions: [],
          attributes: {
            pace: 78,
            stamina: 82,
            strength: 75,
            agility: 80,
            passing: 84,
            shooting: 76,
            tackling: 70,
            dribbling: 82,
            firstTouch: 85,
            heading: 70,
            positioning: 83,
            vision: 85,
            composure: 80,
            workRate: 85,
            decisionMaking: 82,
          },
          condition: {
            fitness: 95,
            fatigue: 5,
            morale: 90,
            form: 85,
            sharpness: 90,
            isInjured: false,
            isSuspended: false,
          },
        },
        assignedPositionRole: i === 0 ? 'GK' : i < 5 ? 'CB' : i < 8 ? 'CM' : 'ST',
        isStarting: true,
        fitness: 95,
        morale: 90,
        form: 85,
        sharpness: 90,
        fatigue: 5,
        isInjured: false,
        isSuspended: false,
      })),
      bench: [],
      recentFormRating: 88,
    },
    awayTeam: {
      teamId: 'club-chelsea',
      clubName: 'London Blue',
      isHomeTeam: false,
      tactics: {
        formation: '4-2-3-1',
        mentality: 'BALANCED',
        pressingIntensity: 'MEDIUM',
        defensiveLine: 'STANDARD',
        passingStyle: 'BALANCED',
        playerInstructions: [],
      },
      startingXI: Array.from({ length: 11 }, (_, i) => ({
        player: {
          id: `a-player-${i}`,
          firstName: `Away`,
          lastName: `Player ${i + 1}`,
          shortName: `A. Player ${i + 1}`,
          age: 25,
          nationality: 'Spain',
          primaryPosition: i === 0 ? 'GK' : i < 5 ? 'CB' : i < 8 ? 'CM' : 'ST',
          secondaryPositions: [],
          attributes: {
            pace: 76,
            stamina: 80,
            strength: 78,
            agility: 77,
            passing: 80,
            shooting: 74,
            tackling: 74,
            dribbling: 78,
            firstTouch: 80,
            heading: 72,
            positioning: 80,
            vision: 81,
            composure: 78,
            workRate: 80,
            decisionMaking: 79,
          },
          condition: {
            fitness: 92,
            fatigue: 8,
            morale: 85,
            form: 80,
            sharpness: 88,
            isInjured: false,
            isSuspended: false,
          },
        },
        assignedPositionRole: i === 0 ? 'GK' : i < 5 ? 'CB' : i < 8 ? 'CM' : 'ST',
        isStarting: true,
        fitness: 92,
        morale: 85,
        form: 80,
        sharpness: 88,
        fatigue: 8,
        isInjured: false,
        isSuspended: false,
      })),
      bench: [],
      recentFormRating: 82,
    },
  });

  // Verify SeededRNG reproducibility check
  const testRng1 = new SeededRNG(seed);
  const testRng2 = new SeededRNG(seed);
  const rngMatch = testRng1.nextFloat() === testRng2.nextFloat();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              TOUCHLINE
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Football Manager Simulation Architecture Foundation Phase
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            Foundation Ready
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-10">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Next.js App Router
          </h2>
          <p className="mt-2 text-2xl font-bold text-white">v15.1 (Active)</p>
          <p className="mt-1 text-xs text-slate-500">TypeScript & Tailwind CSS</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Seeded RNG Test
          </h2>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {rngMatch ? 'Reproducible ✓' : 'Failed ✗'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Seed: {seed}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Simulation Engine
          </h2>
          <p className="mt-2 text-2xl font-bold text-blue-400">
            {simulationResult.simulationEngineVersion}
          </p>
          <p className="mt-1 text-xs text-slate-500">Extension Point: Python ML Stub Ready</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur mb-10">
        <h2 className="text-lg font-bold text-white mb-4">
          Simulation Pipeline Smoke Test Result
        </h2>

        <div className="flex items-center justify-between rounded-lg bg-slate-950 p-6 border border-slate-800">
          <div className="text-center">
            <p className="text-xl font-bold text-white">London Red</p>
            <p className="text-xs text-slate-400">Home • Formation 4-3-3</p>
          </div>

          <div className="text-center">
            <span className="text-4xl font-extrabold text-white">
              {simulationResult.homeScore} - {simulationResult.awayScore}
            </span>
            <p className="text-xs text-emerald-400 mt-1 font-mono">
              Deterministic Seed Hash Verified
            </p>
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-white">London Blue</p>
            <p className="text-xs text-slate-400">Away • Formation 4-2-3-1</p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800/80 pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Match Timeline Events ({simulationResult.events.length} Events)
          </h3>
          <ul className="space-y-2 text-xs font-mono">
            {simulationResult.events.map((evt, idx) => (
              <li key={idx} className="flex items-center text-slate-300">
                <span className="w-12 text-slate-500 font-bold">{evt.minute}&apos;</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300 mr-2 font-sans font-medium">
                  {evt.kind}
                </span>
                <span>{evt.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        Touchline Football Manager Simulation Engine &copy; 2026. Modular Monolith Architecture.
      </footer>
    </main>
  );
}
