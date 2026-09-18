import React from 'react';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  clubName: string;
  nextMatchOpponent?: string;
  nextMatchDate?: string;
  standingsRank?: number;
  totalTeams?: number;
  recentForm?: string[]; // e.g. ['W', 'W', 'D', 'L', 'W']
  onNavigate: (tab: NavTab) => void;
  onPlayMatch: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clubName,
  nextMatchOpponent = 'Manchester City',
  nextMatchDate = '18 Aug 2024',
  standingsRank = 3,
  totalTeams = 20,
  recentForm = ['W', 'W', 'D', 'L', 'W'],
  onNavigate,
  onPlayMatch,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            Management Control Center
          </span>
          <h2 className="text-2xl font-black text-white mt-2 tracking-tight">{clubName} Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">
            Season 2024/25 · Premier League · Target: UEFA Champions League Qualification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('tactics')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
          >
            📋 Set Tactics
          </button>
          <button
            onClick={onPlayMatch}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <span>⚽</span> Kick Off Next Match
          </button>
        </div>
      </div>

      {/* Main Grid Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Match Card */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>📅</span> Next Match fixture
            </h3>
            <span className="text-xs font-mono text-slate-400">{nextMatchDate}</span>
          </div>

          <div className="flex items-center justify-around py-6 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center font-bold text-lg text-emerald-400 mx-auto">
                {clubName.slice(0, 3).toUpperCase()}
              </div>
              <p className="text-sm font-bold text-white">{clubName}</p>
              <p className="text-[11px] text-emerald-400 font-semibold">(Home)</p>
            </div>

            <div className="text-center">
              <span className="text-2xl font-black text-slate-400">VS</span>
              <p className="text-xs text-slate-500 font-mono mt-1">Matchday 4</p>
            </div>

            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-lg text-blue-400 mx-auto">
                {nextMatchOpponent.slice(0, 3).toUpperCase()}
              </div>
              <p className="text-sm font-bold text-white">{nextMatchOpponent}</p>
              <p className="text-[11px] text-slate-400">(Away)</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
            <span>Expectation: High-intensity Match</span>
            <button
              onClick={onPlayMatch}
              className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              Enter Matchday Center →
            </button>
          </div>
        </div>

        {/* League Standing Summary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🏆</span> Premier League Position
            </h3>
            <button onClick={() => onNavigate('competitions')} className="text-xs text-emerald-400 font-bold hover:underline">
              Full Table
            </button>
          </div>

          <div className="text-center py-4 space-y-1">
            <div className="text-4xl font-black text-white">
              {standingsRank}
              <span className="text-lg text-slate-500 font-medium">/{totalTeams}</span>
            </div>
            <p className="text-xs text-emerald-400 font-semibold">Champions League Qualification Zone</p>
          </div>

          {/* Form Badges */}
          <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Recent Form (Last 5)</span>
            <div className="flex gap-1.5">
              {recentForm.map((f, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${
                    f === 'W'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : f === 'D'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Squad Status */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Squad Availability</h4>
            <button onClick={() => onNavigate('squad')} className="text-xs text-emerald-400 font-bold hover:underline">
              View Squad
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
              <span className="text-lg font-bold text-emerald-400">24</span>
              <p className="text-[10px] text-slate-500 font-medium">Fully Fit</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
              <span className="text-lg font-bold text-amber-400">2</span>
              <p className="text-[10px] text-slate-500 font-medium">Tired/Fatigued</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
              <span className="text-lg font-bold text-red-400">1</span>
              <p className="text-[10px] text-slate-500 font-medium">Injured</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
              <span className="text-lg font-bold text-purple-400">0</span>
              <p className="text-[10px] text-slate-500 font-medium">Suspended</p>
            </div>
          </div>
        </div>

        {/* Board Confidence */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Board Confidence</h4>
            <button onClick={() => onNavigate('board')} className="text-xs text-emerald-400 font-bold hover:underline">
              Objectives
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Overall Approval</span>
              <span className="text-emerald-400 font-bold">78% (Secure)</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-emerald-500 rounded-full w-[78%]" />
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              The board is pleased with recent tactical performances and overall squad harmony.
            </p>
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 backdrop-blur">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Shortcuts</h4>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('transfers')}
              className="w-full p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-left text-xs font-bold text-white flex items-center justify-between transition-all"
            >
              <span>💸 Search Transfer Market</span>
              <span className="text-slate-500">→</span>
            </button>
            <button
              onClick={() => onNavigate('training')}
              className="w-full p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-left text-xs font-bold text-white flex items-center justify-between transition-all"
            >
              <span>🏃 Run Team Training</span>
              <span className="text-slate-500">→</span>
            </button>
            <button
              onClick={() => onNavigate('scouting')}
              className="w-full p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-left text-xs font-bold text-white flex items-center justify-between transition-all"
            >
              <span>🔍 View Scouting Reports</span>
              <span className="text-slate-500">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
