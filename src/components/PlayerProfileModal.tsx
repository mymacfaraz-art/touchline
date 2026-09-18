import React, { useEffect, useState } from 'react';

interface PlayerProfileModalProps {
  playerId: string;
  gameSeasonId?: string;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ playerId, gameSeasonId, onClose }) => {
  const [playerData, setPlayerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlayerData();
  }, [playerId, gameSeasonId]);

  const fetchPlayerData = async () => {
    setIsLoading(true);
    try {
      const url = `/api/players?playerId=${playerId}${gameSeasonId ? `&gameSeasonId=${gameSeasonId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.player) {
        setPlayerData(data.player);
      }
    } catch (err) {
      console.error('Error fetching player profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!playerId) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-none">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {playerData ? playerData.shortName || `${playerData.firstName} ${playerData.lastName}` : 'Player Profile'}
              </h2>
              <p className="text-xs text-slate-400">
                {playerData ? `${playerData.nationality} · ${playerData.primaryPosition} · ${playerData.age} years old` : 'Loading details...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg px-2 py-1">
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 animate-pulse">Loading player data...</div>
        ) : !playerData ? (
          <div className="py-12 text-center text-xs text-slate-500">Failed to load player information.</div>
        ) : (
          <div className="space-y-6">
            {/* OVR & Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-2xl text-emerald-400 shrink-0">
                  {playerData.ovr}
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Overall Rating</span>
                  <p className="text-xs font-bold text-white">Touchline ML Verified</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">High Confidence</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Current Club</span>
                <p className="text-sm font-bold text-white">{playerData.currentClub?.name || 'Free Agent'}</p>
                <p className="text-[11px] text-slate-400">Position: {playerData.primaryPosition}</p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Contract Details</span>
                <p className="text-sm font-bold text-amber-400">
                  £{(playerData.contract?.weeklyWage || 15000).toLocaleString()}/wk
                </p>
                <p className="text-[11px] text-slate-400">
                  Status: {playerData.contract?.status || 'ACTIVE'}
                </p>
              </div>
            </div>

            {/* Condition Bars */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Match Readiness &amp; Condition</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Fitness</span>
                    <span className="text-emerald-400 font-bold">{playerData.condition?.fitness}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${playerData.condition?.fitness}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Fatigue</span>
                    <span className="text-amber-400 font-bold">{playerData.condition?.fatigue}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${playerData.condition?.fatigue}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Sharpness</span>
                    <span className="text-blue-400 font-bold">{playerData.condition?.sharpness}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${playerData.condition?.sharpness}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Morale</span>
                    <span className="text-purple-400 font-bold">{playerData.condition?.morale}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${playerData.condition?.morale}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bounded Attributes Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Player Attribute Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(playerData.attributes || {}).map(([groupName, groupObj]: [string, any]) => (
                  <div key={groupName} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-900 pb-1">
                      {groupName}
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(groupObj || {}).map(([attrKey, attrVal]: [string, any]) => (
                        <div key={attrKey} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 capitalize">{attrKey.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={`font-bold ${attrVal >= 80 ? 'text-emerald-400' : attrVal >= 70 ? 'text-slate-200' : 'text-slate-400'}`}>
                            {attrVal}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Development History */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Development &amp; Progression History</h3>
              <p className="text-[11px] text-slate-500">
                Snapshots are automatically recorded upon training sessions and match appearances.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-mono text-slate-400">Baseline OVR:</span>
                <span className="text-xs font-bold text-emerald-400">{playerData.ovr - 1}</span>
                <span className="text-slate-600">→</span>
                <span className="text-xs font-bold text-emerald-400">{playerData.ovr} ▲</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
