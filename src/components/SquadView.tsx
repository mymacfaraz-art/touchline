import React, { useState, useEffect } from 'react';
import { PlayerProfileModal } from './PlayerProfileModal';

interface SquadViewProps {
  clubId?: string;
  gameSeasonId?: string;
}

export const SquadView: React.FC<SquadViewProps> = ({ clubId, gameSeasonId }) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    fetchSquad();
  }, [clubId, gameSeasonId]);

  const fetchSquad = async () => {
    setIsLoading(true);
    try {
      let url = '/api/players?limit=40';
      if (clubId && gameSeasonId) {
        url = `/api/transfers?clubId=${clubId}&gameSeasonId=${gameSeasonId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPlayers(data.squad || data.players || []);
      }
    } catch (err) {
      console.error('Error fetching squad:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPlayers = players.filter((p) => {
    const name = p.shortName || `${p.firstName} ${p.lastName}`;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPos =
      selectedPosition === 'ALL' ||
      (selectedPosition === 'GK' && p.primaryPosition === 'GK') ||
      (selectedPosition === 'DEF' && ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.primaryPosition)) ||
      (selectedPosition === 'MID' && ['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(p.primaryPosition)) ||
      (selectedPosition === 'FWD' && ['ST', 'CF', 'LW', 'RW'].includes(p.primaryPosition));

    return matchesSearch && matchesPos;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>👥</span> Squad Roster Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active player registrations, condition, fitness, and contract overview.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search squad players..."
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 w-full md:w-48"
          />

          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedPosition === pos ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Squad Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading squad dataset...</div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No players match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-3">Pos</th>
                  <th className="py-3 px-3">Age</th>
                  <th className="py-3 px-3 text-center">OVR</th>
                  <th className="py-3 px-3">Fitness</th>
                  <th className="py-3 px-3">Fatigue</th>
                  <th className="py-3 px-3">Morale</th>
                  <th className="py-3 px-3">Wage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPlayers.map((p) => {
                  const name = p.shortName || `${p.firstName} ${p.lastName}`;
                  const fitness = p.condition?.fitness ?? 94;
                  const fatigue = p.condition?.fatigue ?? 6;
                  const morale = p.condition?.morale ?? 85;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-all"
                    >
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                          {p.primaryPosition}
                        </span>
                        <span>{name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-semibold">{p.primaryPosition}</td>
                      <td className="py-3 px-3 text-slate-400">{p.age || 24}</td>
                      <td className="py-3 px-3 text-center font-black">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {p.ovr || 78}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-20">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-400">{fitness}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fitness}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-16">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-400">{fatigue}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fatigue}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-purple-400">{morale}%</td>
                      <td className="py-3 px-3 text-slate-300">£{(p.contract?.weeklyWage || 25000).toLocaleString()}/wk</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-xs text-emerald-400 font-bold hover:underline">Profile →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Player Profile Modal */}
      {selectedPlayerId && (
        <PlayerProfileModal
          playerId={selectedPlayerId}
          gameSeasonId={gameSeasonId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
};
