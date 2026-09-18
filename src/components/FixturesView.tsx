import React from 'react';

interface FixturesViewProps {
  userClubName?: string;
  onPlayMatch?: () => void;
}

export const FixturesView: React.FC<FixturesViewProps> = ({ userClubName = 'Arsenal FC', onPlayMatch }) => {
  const fixtures = [
    { matchday: 1, opponent: 'Wolverhampton Wanderers', location: 'Home', result: 'W 2–0', date: '17 Aug 2024', isCompleted: true },
    { matchday: 2, opponent: 'Aston Villa', location: 'Away', result: 'W 2–0', date: '24 Aug 2024', isCompleted: true },
    { matchday: 3, opponent: 'Brighton & Hove Albion', location: 'Home', result: 'D 1–1', date: '31 Aug 2024', isCompleted: true },
    { matchday: 4, opponent: 'Tottenham Hotspur', location: 'Away', result: 'Upcoming', date: '15 Sep 2024', isCompleted: false },
    { matchday: 5, opponent: 'Manchester City', location: 'Away', result: 'Upcoming', date: '22 Sep 2024', isCompleted: false },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🏆</span> Season Fixtures &amp; Matchday Results
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full competition calendar, past results, and upcoming matchdays.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {fixtures.map((f) => (
          <div
            key={f.matchday}
            className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-slate-500 font-bold">MD {f.matchday}</span>
              <div>
                <p className="font-bold text-white">
                  {userClubName} vs {f.opponent}
                </p>
                <p className="text-[11px] text-slate-400">
                  {f.location} · {f.date}
                </p>
              </div>
            </div>

            <div>
              {f.isCompleted ? (
                <span className="font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                  {f.result}
                </span>
              ) : (
                <button
                  onClick={onPlayMatch}
                  className="font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-lg transition-all"
                >
                  Kick Off →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
