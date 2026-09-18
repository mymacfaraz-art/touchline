import React from 'react';

interface ClubViewProps {
  clubName?: string;
}

export const ClubView: React.FC<ClubViewProps> = ({ clubName = 'Arsenal FC' }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🏛️</span> Club Profile &amp; Infrastructure
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Identity, facilities, squad size, reputation, and historical achievements.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center font-black text-2xl text-emerald-400">
            {clubName.slice(0, 3).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{clubName}</h3>
            <p className="text-xs text-slate-400">Premier League · England · Founded 1886</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Reputation</span>
            <p className="text-sm font-bold text-white">88/100</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Stadium</span>
            <p className="text-sm font-bold text-white">Emirates Stadium (60,704)</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Training Facility</span>
            <p className="text-sm font-bold text-emerald-400">State of the Art</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Youth Academy</span>
            <p className="text-sm font-bold text-emerald-400">Category 1 Elite</p>
          </div>
        </div>
      </div>
    </div>
  );
};
