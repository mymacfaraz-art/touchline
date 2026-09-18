import React from 'react';

export const BoardView: React.FC = () => {
  const objectives = [
    { title: 'Qualify for UEFA Champions League', type: 'DOMESTIC', target: 'Top 4 Finish', progress: '3rd Place (On Track)', status: 'ON_TRACK' },
    { title: 'Maintain Squad Morale Above 70%', type: 'DRESSING_ROOM', target: '70% Morale', progress: '78% Morale', status: 'COMPLETED' },
    { title: 'Control Wage Bill Headroom', type: 'FINANCIAL', target: 'Within Wage Cap', progress: '£250k/wk Cap Preserved', status: 'ON_TRACK' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🎯</span> Board Objectives &amp; Confidence Track
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Persisted board targets, approval rating, and seasonal expectations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2 backdrop-blur">
          <span className="text-xs text-slate-400 uppercase font-mono">Overall Approval</span>
          <p className="text-3xl font-black text-emerald-400">78%</p>
          <p className="text-[11px] text-slate-500">Board Status: Secure</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2 backdrop-blur">
          <span className="text-xs text-slate-400 uppercase font-mono">Fan Happiness</span>
          <p className="text-3xl font-black text-blue-400">82%</p>
          <p className="text-[11px] text-slate-500">Supporters Status: Delighted</p>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2 backdrop-blur">
          <span className="text-xs text-slate-400 uppercase font-mono">Financial Stability</span>
          <p className="text-3xl font-black text-amber-400">A+</p>
          <p className="text-[11px] text-slate-500">Solvent &amp; Headroom Available</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Seasonal Objectives</h3>
        {objectives.map((obj, i) => (
          <div key={i} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1 backdrop-blur flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">{obj.type}</span>
              <h4 className="text-sm font-bold text-white">{obj.title}</h4>
              <p className="text-xs text-slate-400">Target: {obj.target}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">{obj.progress}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
