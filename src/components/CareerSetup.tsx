import React, { useState, useEffect } from 'react';

interface ClubOption {
  id: string;
  name: string;
  code: string;
  reputation: number;
  country?: { name: string };
  squadSize?: number;
}

interface CareerSetupProps {
  onCareerCreated: (careerId: string, clubId: string) => void;
  onCancel?: () => void;
}

export const CareerSetup: React.FC<CareerSetupProps> = ({ onCareerCreated, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [managerName, setManagerName] = useState('Alex Ferguson');
  const [managerNationality, setManagerNationality] = useState('Scotland');
  const [tacticalIdentity, setTacticalIdentity] = useState('HIGH_PRESS_POSSESSION');

  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<ClubOption | null>(null);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async (query = '') => {
    setIsLoadingClubs(true);
    try {
      const res = await fetch(`/api/clubs?limit=40&search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.clubs)) {
        setClubs(data.clubs);
        if (!selectedClub && data.clubs.length > 0) {
          setSelectedClub(data.clubs[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load clubs:', err);
    } finally {
      setIsLoadingClubs(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchClubs(val);
  };

  const handleCreateCareer = async () => {
    if (!selectedClub) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: 'user-manager-001',
          name: `${managerName}'s ${selectedClub.name} Career`,
          selectedClubId: selectedClub.id,
          managerName,
          startYear: 2024,
        }),
      });

      const data = await res.json();
      if (data.success && data.career?.careerId) {
        onCareerCreated(data.career.careerId, selectedClub.id);
      } else {
        setErrorMsg(data.error || 'Failed to create career.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>⚽</span> TOUCHLINE CAREER CREATION
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Setup manager profile and select your club from real football databases.
            </p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1">
              ✕
            </button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1, label: 'Manager Profile' },
            { num: 2, label: 'Club Selection' },
            { num: 3, label: 'Confirmation' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                step === s.num
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                  : step > s.num
                  ? 'bg-slate-800/40 border-slate-800 text-slate-300'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider">Step {s.num}</div>
              <div className="text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Step 1: Manager Profile */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Manager Name</label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="Enter manager full name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nationality</label>
              <input
                type="text"
                value={managerNationality}
                onChange={(e) => setManagerNationality(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="e.g. England, Spain, Germany"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tactical Philosophy</label>
              <select
                value={tacticalIdentity}
                onChange={(e) => setTacticalIdentity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="HIGH_PRESS_POSSESSION">High Press &amp; Possession (4-3-3)</option>
                <option value="COUNTER_ATTACK">Fast Counter-Attack (4-2-3-1)</option>
                <option value="DIRECT_PLAY">Direct &amp; Wing Play (4-4-2)</option>
                <option value="DEFENSIVE_SOLIDITY">Defensive Solidity (5-3-2)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Club Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Search Real Football Clubs</label>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="Search Arsenal, Real Madrid, Bayern, Barcelona..."
              />
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl p-2 space-y-1 bg-slate-950">
              {isLoadingClubs ? (
                <div className="text-center py-6 text-xs text-slate-500 animate-pulse">Loading clubs...</div>
              ) : clubs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">No clubs found matching query.</div>
              ) : (
                clubs.map((c) => {
                  const isSelected = selectedClub?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClub(c)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                          : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                          {c.code.slice(0, 3)}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{c.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.country?.name || 'Top Division'} · Rep Rating: {c.reputation}/100
                          </div>
                        </div>
                      </div>
                      {isSelected && <span className="text-emerald-400 font-bold text-xs">Selected ✓</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && selectedClub && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Manager Identity</span>
                <span className="text-sm font-bold text-white">
                  {managerName} ({managerNationality})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Selected Club</span>
                <span className="text-sm font-bold text-emerald-400">{selectedClub.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Initial Season</span>
                <span className="text-sm font-bold text-white">2024/25 Season</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Initial Budget (Estimated)</span>
                <span className="text-sm font-bold text-amber-400">
                  £{(selectedClub.reputation * 1.2).toFixed(1)}M
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              disabled={step === 2 && !selectedClub}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-lg transition-all"
            >
              Next Step →
            </button>
          ) : (
            <button
              onClick={handleCreateCareer}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg shadow-lg transition-all"
            >
              {isSubmitting ? 'Initializing Career...' : '🚀 Start Career Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
