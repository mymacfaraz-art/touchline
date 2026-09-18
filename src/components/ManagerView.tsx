import React from 'react';

interface ManagerViewProps {
  managerName?: string;
  clubName?: string;
}

export const ManagerView: React.FC<ManagerViewProps> = ({ managerName = 'Head Manager', clubName = 'Arsenal FC' }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>👔</span> Manager Profile &amp; Managerial Career
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Managerial stats, tactical philosophy, win ratio, and career progression.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border-2 border-purple-500/40 flex items-center justify-center font-black text-2xl text-purple-400">
            👔
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{managerName}</h3>
            <p className="text-xs text-slate-400">Head Manager · {clubName} · Tactical Identity: High Press &amp; Possession</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Matches Managed</span>
            <p className="text-xl font-bold text-white">4</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Win Ratio</span>
            <p className="text-xl font-bold text-emerald-400">75%</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Goals Scored</span>
            <p className="text-xl font-bold text-white">8</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
            <span className="text-slate-500 text-[10px] uppercase font-mono">Reputation</span>
            <p className="text-xl font-bold text-purple-400">Continental</p>
          </div>
        </div>
      </div>
    </div>
  );
};
