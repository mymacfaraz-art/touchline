import React, { useState } from 'react';

export const ScoutingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'OPPOSITION'>('REPORTS');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [oppAnalysisResult, setOppAnalysisResult] = useState<any>(null);

  const reports = [
    {
      player: 'Viktor Gyökeres',
      club: 'Sporting CP',
      pos: 'ST',
      age: 26,
      ovrRange: '84–87',
      confidence: 'KNOWN',
      tacticalFit: '92% (High Target Fit)',
      recommendation: 'Must Sign',
    },
    {
      player: 'Florian Wirtz',
      club: 'Bayer Leverkusen',
      pos: 'CAM',
      age: 21,
      ovrRange: '87–89',
      confidence: 'ESTIMATED',
      tacticalFit: '88% (Advanced Playmaker Fit)',
      recommendation: 'Top Target',
    },
    {
      player: 'Jorrel Hato',
      club: 'Ajax',
      pos: 'CB / LB',
      age: 18,
      ovrRange: '76–82',
      confidence: 'UNKNOWN',
      tacticalFit: '74% (Youth Prospect)',
      recommendation: 'Further Scouting Required',
    },
  ];

  const handleGenerateAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    try {
      const res = await fetch('/api/ai/scouting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'opposition_analysis',
          opponentTeamId: 'club-mancity',
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setOppAnalysisResult(data.analysis);
      } else {
        setOppAnalysisResult({
          opponentName: 'Manchester City',
          expectedFormation: '4-2-3-1',
          keyThreats: ['Erling Haaland (High Aerial & Finishing Threat)', 'Kevin De Bruyne (Key Passing Channels)'],
          weaknessAreas: ['High Line Vulnerability to Counter-Attack'],
          recommendedTactic: 'Exploit Wide Areas with Inside Forwards',
        });
      }
    } catch (err) {
      console.error('Opposition analysis error:', err);
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🔍</span> Scouting Network &amp; Opposition Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Delineated confidence scouting reports and opposition tactical analysis.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'REPORTS' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Scouting Reports
          </button>
          <button
            onClick={() => setActiveTab('OPPOSITION')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'OPPOSITION' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Opposition Analysis
          </button>
        </div>
      </div>

      {activeTab === 'REPORTS' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((r, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">{r.club}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    r.confidence === 'KNOWN'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : r.confidence === 'ESTIMATED'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {r.confidence}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{r.player}</h3>
                <p className="text-xs text-slate-400">
                  {r.pos} · {r.age} yrs · Est OVR {r.ovrRange}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tactical Fit:</span>
                  <span className="text-emerald-400 font-bold">{r.tacticalFit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scout Verdict:</span>
                  <span className="text-white font-bold">{r.recommendation}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Upcoming Opposition Analysis</h3>
              <p className="text-xs text-slate-400">Next Opponent: Manchester City</p>
            </div>
            <button
              onClick={handleGenerateAnalysis}
              disabled={isGeneratingAnalysis}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
            >
              {isGeneratingAnalysis ? 'Analyzing...' : '⚡ Generate Deep Report'}
            </button>
          </div>

          {oppAnalysisResult && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-emerald-400">Tactical Profile: {oppAnalysisResult.opponentName}</p>
                <p className="text-slate-300">Expected Formation: {oppAnalysisResult.expectedFormation}</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-amber-400">Key Opposition Threats:</p>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {(oppAnalysisResult.keyThreats || []).map((t: string, idx: number) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-blue-400">Tactical Recommendation:</p>
                <p className="text-slate-300">{oppAnalysisResult.recommendedTactic}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
