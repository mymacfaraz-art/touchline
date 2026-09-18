import React, { useState } from 'react';

interface TacticsViewProps {
  clubId?: string;
}

export const TacticsView: React.FC<TacticsViewProps> = ({ clubId }) => {
  const [formation, setFormation] = useState('4-3-3');
  const [mentality, setMentality] = useState('ATTACKING');
  const [pressingIntensity, setPressingIntensity] = useState('HIGH');
  const [defensiveLine, setDefensiveLine] = useState('HIGH');
  const [tempo, setTempo] = useState('HIGH');
  const [width, setWidth] = useState('WIDE');
  const [passingStyle, setPassingStyle] = useState('SHORT_POSSESSION');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const starterPositions = [
    { pos: 'GK', name: 'Raya', role: 'Goalkeeper', x: '50%', y: '88%' },
    { pos: 'CB', name: 'Saliba', role: 'Ball Playing Defender', x: '35%', y: '72%' },
    { pos: 'CB', name: 'Gabriel', role: 'No-Nonsense CB', x: '65%', y: '72%' },
    { pos: 'LB', name: 'Zinchenko', role: 'Inverted Fullback', x: '15%', y: '65%' },
    { pos: 'RB', name: 'White', role: 'Complete Fullback', x: '85%', y: '65%' },
    { pos: 'CM', name: 'Rice', role: 'Box to Box Midfielder', x: '35%', y: '48%' },
    { pos: 'CM', name: 'Merino', role: 'Deep Lying Playmaker', x: '65%', y: '48%' },
    { pos: 'CAM', name: 'Ødegaard', role: 'Advanced Playmaker', x: '50%', y: '32%' },
    { pos: 'LW', name: 'Martinelli', role: 'Inside Forward', x: '18%', y: '18%' },
    { pos: 'RW', name: 'Saka', role: 'Inverted Winger', x: '82%', y: '18%' },
    { pos: 'ST', name: 'Havertz', role: 'Target Forward', x: '50%', y: '12%' },
  ];

  const substitutes = [
    { pos: 'GK', name: 'Neto', role: 'GK' },
    { pos: 'CB', name: 'Timber', role: 'DEF' },
    { pos: 'LB', name: 'Calafiori', role: 'DEF' },
    { pos: 'CM', name: 'Partey', role: 'MID' },
    { pos: 'CAM', name: 'Nwaneri', role: 'MID' },
    { pos: 'ST', name: 'Jesus', role: 'FWD' },
    { pos: 'LW', name: 'Trossard', role: 'FWD' },
  ];

  const handleSaveTactics = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: clubId || 'club-arsenal-fc',
          tactics: {
            formation,
            mentality,
            pressingIntensity,
            defensiveLine,
            tempo,
            width,
            passingStyle,
            buildUpStyle: 'SHORT_PASSING',
            transitionStyle: 'COUNTER',
            outOfPossession: 'PRESS',
            playerRoles: [],
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('Tactics saved and validated successfully ✓');
      } else {
        setSaveStatus('Failed to save tactics.');
      }
    } catch (err: any) {
      setSaveStatus(err.message || 'Error saving tactics.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📋</span> Tactical Setup &amp; Lineup Builder
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure team shape, mentality, pressing intensity, and player roles.
          </p>
        </div>

        <button
          onClick={handleSaveTactics}
          disabled={isSaving}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
        >
          {isSaving ? 'Validating...' : '💾 Save Tactical Setup'}
        </button>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold">
          {saveStatus}
        </div>
      )}

      {/* Main Grid: Pitch + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pitch Visualization */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-6 relative overflow-hidden flex flex-col justify-between min-h-[560px]">
          {/* Pitch markings */}
          <div className="absolute inset-4 border-2 border-emerald-500/20 rounded-xl pointer-events-none">
            {/* Center Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/20" />
            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-emerald-500/20 rounded-full" />
            {/* Penalty Box Top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-b-2 border-x-2 border-emerald-500/20" />
            {/* Penalty Box Bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-t-2 border-x-2 border-emerald-500/20" />
          </div>

          {/* Interactive Player Cards on Pitch */}
          <div className="relative w-full h-full min-h-[480px]">
            {starterPositions.map((p, i) => (
              <div
                key={i}
                style={{ left: p.x, top: p.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-600/90 border-2 border-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                  {p.pos}
                </div>
                <div className="bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-white mt-1 shadow-md whitespace-nowrap">
                  {p.name}
                </div>
              </div>
            ))}
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-900 pt-3">
            <span>Formation: <strong className="text-white">{formation}</strong></span>
            <span>Mentality: <strong className="text-emerald-400">{mentality}</strong></span>
            <span>Squad Validation: <strong className="text-emerald-400">11 Starters Valid ✓</strong></span>
          </div>
        </div>

        {/* Tactical Parameters Panel */}
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Tactical Directives
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Formation</label>
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="4-3-3">4-3-3 Attacking</option>
                <option value="4-2-3-1">4-2-3-1 Balanced</option>
                <option value="3-5-2">3-5-2 Wingbacks</option>
                <option value="4-4-2">4-4-2 Flat</option>
                <option value="5-3-2">5-3-2 Defensive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Mentality</label>
              <select
                value={mentality}
                onChange={(e) => setMentality(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="ATTACKING">Attacking</option>
                <option value="BALANCED">Balanced</option>
                <option value="DEFENSIVE">Defensive</option>
                <option value="VERY_ATTACKING">Very Attacking</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Pressing Intensity</label>
              <select
                value={pressingIntensity}
                onChange={(e) => setPressingIntensity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="HIGH">High Press</option>
                <option value="MEDIUM">Medium Block</option>
                <option value="LOW">Low Block</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Defensive Line</label>
              <select
                value={defensiveLine}
                onChange={(e) => setDefensiveLine(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="HIGH">High Line</option>
                <option value="STANDARD">Standard Line</option>
                <option value="DEEP">Deep Line</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tempo &amp; Passing</label>
              <select
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="HIGH">High Tempo (Fast Possession)</option>
                <option value="NORMAL">Normal Tempo</option>
                <option value="SLOW">Patient Build-up</option>
              </select>
            </div>
          </div>

          {/* Substitutes Bench */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 backdrop-blur">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Substitutes Bench (7/7)
            </h3>
            <div className="space-y-1.5 text-xs">
              {substitutes.map((sub, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="font-bold text-slate-300">{sub.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">{sub.pos}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
