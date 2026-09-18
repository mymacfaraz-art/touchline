import React, { useState, useEffect } from 'react';

interface TransfersViewProps {
  userClubId?: string;
  gameSeasonId?: string;
}

export const TransfersView: React.FC<TransfersViewProps> = ({ userClubId, gameSeasonId }) => {
  const [marketPlayers, setMarketPlayers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPos, setSelectedPos] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [targetPlayer, setTargetPlayer] = useState<any | null>(null);
  const [offerFee, setOfferFee] = useState<number>(25000000);
  const [offerWage, setOfferWage] = useState<number>(65000);
  const [offerYears, setOfferYears] = useState<number>(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketPlayers();
  }, [searchQuery, selectedPos]);

  const fetchMarketPlayers = async () => {
    setIsLoading(true);
    try {
      const posParam = selectedPos !== 'ALL' ? `&position=${selectedPos}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/players?limit=30${posParam}${searchParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.players)) {
        setMarketPlayers(data.players);
      }
    } catch (err) {
      console.error('Error fetching transfer market:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!targetPlayer) return;
    setIsSubmitting(true);
    setTransferMessage(null);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_transfer',
          playerId: targetPlayer.id,
          sourceClubId: targetPlayer.club?.id || 'club-source',
          destinationClubId: userClubId || 'club-arsenal-fc',
          gameSeasonId: gameSeasonId || 'gs-default',
          transferFee: offerFee,
          weeklyWage: offerWage,
          contractYears: offerYears,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTransferMessage(`Transfer of ${targetPlayer.shortName || targetPlayer.lastName} completed successfully! ✓`);
        setTargetPlayer(null);
      } else {
        setTransferMessage(data.error || 'Transfer negotiation rejected.');
      }
    } catch (err: any) {
      setTransferMessage(err.message || 'Error executing transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>💸</span> Transfer Market &amp; Contract Negotiations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Search real database players, submit transfer bids, and renew player contracts.
          </p>
        </div>

        {/* Search & Position Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transfer market..."
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 w-full md:w-48"
          />

          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            {['ALL', 'GK', 'CB', 'CM', 'ST'].map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPos(pos)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedPos === pos ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {transferMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold">
          {transferMessage}
        </div>
      )}

      {/* Main Grid: Market Table + Negotiate Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading market players...</div>
          ) : marketPlayers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No players match the market search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-3">Club</th>
                    <th className="py-3 px-3">Pos</th>
                    <th className="py-3 px-3 text-center">OVR</th>
                    <th className="py-3 px-3">Est. Value</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {marketPlayers.map((p) => {
                    const name = p.shortName || `${p.firstName} ${p.lastName}`;
                    const estValue = p.ovr * 450000;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-3 px-4 font-bold text-white">{name}</td>
                        <td className="py-3 px-3 text-slate-400">{p.club?.name || 'Free Agent'}</td>
                        <td className="py-3 px-3 text-slate-300 font-semibold">{p.primaryPosition}</td>
                        <td className="py-3 px-3 text-center font-black">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {p.ovr}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-amber-400 font-semibold">£{(estValue / 1000000).toFixed(1)}M</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setTargetPlayer(p);
                              setOfferFee(Math.round(estValue));
                            }}
                            className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-lg border border-emerald-500/30 transition-all"
                          >
                            Submit Bid
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transfer Negotiation Drawer */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Contract &amp; Transfer Bid Panel
          </h3>

          {!targetPlayer ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Select a player from the market list to initiate transfer negotiations.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <p className="text-sm font-bold text-white">
                  {targetPlayer.shortName || `${targetPlayer.firstName} ${targetPlayer.lastName}`}
                </p>
                <p className="text-xs text-slate-400">
                  {targetPlayer.primaryPosition} · OVR {targetPlayer.ovr} · Current: {targetPlayer.club?.name || 'Free Agent'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Transfer Fee Offer (£)</label>
                <input
                  type="number"
                  value={offerFee}
                  onChange={(e) => setOfferFee(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Weekly Wage (£/wk)</label>
                <input
                  type="number"
                  value={offerWage}
                  onChange={(e) => setOfferWage(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contract Duration (Years)</label>
                <select
                  value={offerYears}
                  onChange={(e) => setOfferYears(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value={2}>2 Years</option>
                  <option value={3}>3 Years</option>
                  <option value={4}>4 Years</option>
                  <option value={5}>5 Years</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setTargetPlayer(null)}
                  className="w-1/3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteTransfer}
                  disabled={isSubmitting}
                  className="w-2/3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Official Offer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
