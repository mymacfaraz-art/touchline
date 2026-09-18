import React, { useState } from 'react';

interface TrainingViewProps {
  userClubId?: string;
  gameSeasonId?: string;
}

export const TrainingView: React.FC<TrainingViewProps> = ({ userClubId, gameSeasonId }) => {
  const [intensity, setIntensity] = useState<'LIGHT' | 'NORMAL' | 'HEAVY'>('NORMAL');
  const [focus, setFocus] = useState('ATTACKING');
  const [isExecuting, setIsExecuting] = useState(false);
  const [sessionReport, setSessionReport] = useState<string | null>(null);

  const handleRunTraining = async () => {
    setIsExecuting(true);
    setSessionReport(null);
    try {
      const res = await fetch('/api/development', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_team_training',
          clubId: userClubId || 'club-arsenal-fc',
          gameSeasonId: gameSeasonId || 'gs-default',
          intensity,
          focus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionReport(`Team training session complete! Squad sharpness improved, fatigue adjusted. ✓`);
      } else {
        setSessionReport(data.error || 'Failed to complete training session.');
      }
    } catch (err: any) {
      setSessionReport(err.message || 'Error running training.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🏃</span> Team Training &amp; Workload Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage weekly training schedules, sharpness recovery, and fatigue control.
          </p>
        </div>

        <button
          onClick={handleRunTraining}
          disabled={isExecuting}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
        >
          {isExecuting ? 'Running Session...' : '⚡ Run Weekly Training Session'}
        </button>
      </div>

      {sessionReport && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold">
          {sessionReport}
        </div>
      )}

      {/* Main Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workload Intensity */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Training Workload Intensity
          </h3>

          <div className="space-y-3">
            {[
              { id: 'LIGHT', label: 'Light Workload', desc: 'Focus on recovery, reduces fatigue, slower attribute growth' },
              { id: 'NORMAL', label: 'Normal Workload', desc: 'Balanced development and sharpness maintenance' },
              { id: 'HEAVY', label: 'Heavy Workload', desc: 'Accelerates attribute development, increases fatigue & injury risk' },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => setIntensity(item.id as any)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  intensity === item.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{item.label}</span>
                  {intensity === item.id && <span className="text-emerald-400 text-xs font-bold">Active ✓</span>}
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tactical Focus Area */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Weekly Tactical Focus
          </h3>

          <div className="space-y-3">
            {[
              { id: 'ATTACKING', label: 'Attacking & Possession', desc: 'Passing, Vision, Finishing, Dribbling' },
              { id: 'DEFENSIVE', label: 'Defensive Shape & Pressing', desc: 'Tackling, Defensive Awareness, Positioning' },
              { id: 'PHYSICAL', label: 'Physical Conditioning', desc: 'Stamina, Acceleration, Strength' },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => setFocus(item.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  focus === item.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{item.label}</span>
                  {focus === item.id && <span className="text-emerald-400 text-xs font-bold">Active ✓</span>}
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
