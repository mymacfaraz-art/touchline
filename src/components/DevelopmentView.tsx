import React from 'react';

export const DevelopmentView: React.FC = () => {
  const developments = [
    { name: 'Bukayo Saka', age: 22, pos: 'RW', ovr: 86, delta: '+1 ▲', note: 'Significant growth in Finishing & Composure' },
    { name: 'Ethan Nwaneri', age: 17, pos: 'CAM', ovr: 74, delta: '+2 ▲', note: 'High potential growth, rapid technical improvement' },
    { name: 'Gabriel Martinelli', age: 23, pos: 'LW', ovr: 84, delta: '0', note: 'Stable prime development, high physical fitness' },
    { name: 'Jorginho', age: 32, pos: 'CDM', ovr: 81, delta: '-1 ▼', note: 'Minor age-related physical decline' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📈</span> Player Development &amp; Attribute Progression
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Snapshot history tracking attribute deltas across youth, prime, and veteran players.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {developments.map((d, i) => (
          <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{d.name}</h3>
                <p className="text-xs text-slate-400">
                  {d.pos} · {d.age} yrs old
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-white">{d.ovr}</span>
                <span className={`ml-2 text-xs font-bold ${d.delta.includes('+') ? 'text-emerald-400' : d.delta.includes('-') ? 'text-red-400' : 'text-slate-500'}`}>
                  {d.delta}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 pt-2 border-t border-slate-800">{d.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
