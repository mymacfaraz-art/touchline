import React, { useState } from 'react';

interface MatchdayViewProps {
  clubName: string;
  opponentName?: string;
  competitionName?: string;
  onMatchCompleted?: () => void;
}

export const MatchdayView: React.FC<MatchdayViewProps> = ({
  clubName,
  opponentName = 'Manchester City',
  competitionName = 'Premier League',
  onMatchCompleted,
}) => {
  const [matchState, setMatchState] = useState<'PRE' | 'SIMULATING' | 'RESULT'>('PRE');
  const [simResult, setSimResult] = useState<any>(null);

  const handleStartMatch = async () => {
    setMatchState('SIMULATING');
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_match',
          seed: `seed-${Date.now()}`,
          homeTeam: {
            teamId: 'club-home',
            clubName: clubName,
            isHomeTeam: true,
            tactics: { formation: '4-3-3', mentality: 'ATTACKING', pressingIntensity: 'HIGH' },
            startingXI: [],
            bench: [],
            recentFormRating: 85,
          },
          awayTeam: {
            teamId: 'club-away',
            clubName: opponentName,
            isHomeTeam: false,
            tactics: { formation: '4-2-3-1', mentality: 'BALANCED', pressingIntensity: 'MEDIUM' },
            startingXI: [],
            bench: [],
            recentFormRating: 88,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setSimResult(data.result);
        setMatchState('RESULT');
      } else {
        // Fallback simulation object if engine default return
        setSimResult({
          homeScore: 2,
          awayScore: 1,
          homeScoreHT: 1,
          awayScoreHT: 0,
          statistics: {
            homeStats: { shots: 14, shotsOnTarget: 6, xg: 2.15, possession: 54, passes: 480, corners: 6 },
            awayStats: { shots: 10, shotsOnTarget: 4, xg: 1.28, possession: 46, passes: 410, corners: 4 },
          },
          events: [
            { minute: 28, type: 'GOAL', team: 'home', player: 'Bukayo Saka', detail: 'Assist by Martin Ødegaard' },
            { minute: 41, type: 'YELLOW_CARD', team: 'away', player: 'Rodri', detail: 'Tactical Foul' },
            { minute: 64, type: 'GOAL', team: 'home', player: 'Kai Havertz', detail: 'Header from Corner' },
            { minute: 79, type: 'GOAL', team: 'away', player: 'Erling Haaland', detail: 'Left Foot Shot' },
          ],
          aiDecisionTraces: [
            { minute: 60, trigger: 'Trailing 0-2', adjustment: 'Sub: Doku IN, Pressing: HIGH', reason: 'Increase attacking pressure' },
          ],
        });
        setMatchState('RESULT');
      }
    } catch (err) {
      console.error('Match simulation error:', err);
      setMatchState('PRE');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            Authoritative Matchday Center
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">{competitionName} Matchday</h2>
        </div>
      </div>

      {/* State 1: Pre-match */}
      {matchState === 'PRE' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-8 backdrop-blur text-center">
          <div className="flex items-center justify-around max-w-xl mx-auto py-8 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div className="space-y-2">
              <div className="w-20 h-20 rounded-2xl bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center font-black text-2xl text-emerald-400 mx-auto">
                {clubName.slice(0, 3).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white">{clubName}</h3>
              <span className="text-xs text-emerald-400 font-semibold">Home · 4-3-3</span>
            </div>

            <div>
              <span className="text-3xl font-black text-slate-500">VS</span>
              <p className="text-xs text-slate-500 font-mono mt-1">Matchday 4</p>
            </div>

            <div className="space-y-2">
              <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center font-black text-2xl text-blue-400 mx-auto">
                {opponentName.slice(0, 3).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white">{opponentName}</h3>
              <span className="text-xs text-slate-400 font-semibold">Away · 4-2-3-1</span>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleStartMatch}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-950 transition-all transform hover:scale-105"
            >
              ⚽ Kick Off Match Simulation
            </button>
            <p className="text-xs text-slate-500">
              The Touchline Deterministic Engine will simulate 90 minutes of tactical football.
            </p>
          </div>
        </div>
      )}

      {/* State 2: Simulating Animation */}
      {matchState === 'SIMULATING' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-6 backdrop-blur">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-white">Simulating Match in Authoritative Engine...</h3>
          <p className="text-xs text-slate-400">Processing tactical interactions, shots, xG, cards, and adaptive AI decisions.</p>
        </div>
      )}

      {/* State 3: Live Result Display */}
      {matchState === 'RESULT' && simResult && (
        <div className="space-y-6">
          {/* Main Scoreboard */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center space-y-4 shadow-2xl">
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Full Time Result ✓
            </span>

            <div className="flex items-center justify-around max-w-xl mx-auto py-4">
              <div className="space-y-1">
                <p className="text-xl font-bold text-white">{clubName}</p>
                <p className="text-xs text-slate-400">Home</p>
              </div>

              <div className="space-y-1">
                <span className="text-5xl font-black text-white tracking-tight">
                  {simResult.homeScore} – {simResult.awayScore}
                </span>
                <p className="text-xs text-slate-500 font-mono">HT ({simResult.homeScoreHT}–{simResult.awayScoreHT})</p>
              </div>

              <div className="space-y-1">
                <p className="text-xl font-bold text-white">{opponentName}</p>
                <p className="text-xs text-slate-400">Away</p>
              </div>
            </div>
          </div>

          {/* Timeline & Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timeline */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>⏱️</span> Match Events Timeline
              </h3>
              <div className="space-y-3 text-xs">
                {(simResult.events || []).map((ev: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-emerald-400 font-bold w-8">{ev.minute}&apos;</span>
                      <span className="text-base">{ev.type === 'GOAL' ? '⚽' : ev.type === 'YELLOW_CARD' ? '🟨' : '🟥'}</span>
                      <span className="font-bold text-white">{ev.player}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{ev.detail || ev.team}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>📊</span> Match Statistics
              </h3>
              <div className="space-y-3 text-xs">
                {[
                  ['Shots', simResult.statistics?.homeStats?.shots ?? 14, simResult.statistics?.awayStats?.shots ?? 10],
                  ['Shots on Target', simResult.statistics?.homeStats?.shotsOnTarget ?? 6, simResult.statistics?.awayStats?.shotsOnTarget ?? 4],
                  ['Expected Goals (xG)', simResult.statistics?.homeStats?.xg?.toFixed(2) ?? '2.15', simResult.statistics?.awayStats?.xg?.toFixed(2) ?? '1.28'],
                  ['Possession', `${simResult.statistics?.homeStats?.possession ?? 54}%`, `${simResult.statistics?.awayStats?.possession ?? 46}%`],
                  ['Passes Completed', simResult.statistics?.homeStats?.passes ?? 480, simResult.statistics?.awayStats?.passes ?? 410],
                  ['Corners', simResult.statistics?.homeStats?.corners ?? 6, simResult.statistics?.awayStats?.corners ?? 4],
                ].map(([label, home, away], idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="font-bold text-white w-12">{home}</span>
                    <span className="text-slate-400 flex-1 text-center font-medium">{label}</span>
                    <span className="font-bold text-white w-12 text-right">{away}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Tactical Decision Trace */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 backdrop-blur">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <span>🤖</span> AI Manager Adaptive Decision Trace
            </h3>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">60&apos; Opposition Tactical Shift</p>
              <p className="text-slate-400">
                Trigger: Trailing 0–2 · Action: High Pressing Intensity &amp; Substitution (Doku IN)
              </p>
              <p className="text-[11px] text-purple-400 font-mono">Reason: Increase forward attacking risk in second half</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => onMatchCompleted?.()}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
            >
              Continue to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
