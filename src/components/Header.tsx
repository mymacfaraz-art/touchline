import React from 'react';

interface HeaderProps {
  currentDate?: string;
  seasonName?: string;
  transferBudget?: number;
  wageBudget?: number;
  isAdvancing?: boolean;
  onAdvanceMatchday?: () => void;
  onQuickMatch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate = '15 Aug 2024',
  seasonName = '2024/25 Season',
  transferBudget = 45000000,
  wageBudget = 250000,
  isAdvancing = false,
  onAdvanceMatchday,
  onQuickMatch,
}) => {
  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) {
      return `£${(val / 1_000_000).toFixed(1)}M`;
    }
    if (val >= 1_000) {
      return `£${(val / 1_000).toFixed(0)}k/wk`;
    }
    return `£${val}`;
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Date & Season */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span className="text-slate-500">📅</span>
          <span>{currentDate}</span>
        </div>
        <span className="text-slate-800">|</span>
        <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          {seasonName}
        </span>
      </div>

      {/* Center/Right: Financials & Action Buttons */}
      <div className="flex items-center gap-6">
        {/* Financial Badges */}
        <div className="hidden md:flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>💰 Budget:</span>
            <span className="text-white font-bold">{formatCurrency(transferBudget)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>💼 Wage Cap:</span>
            <span className="text-white font-bold">{formatCurrency(wageBudget)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {onQuickMatch && (
            <button
              onClick={onQuickMatch}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>⚡</span> Quick Match
            </button>
          )}

          {onAdvanceMatchday && (
            <button
              onClick={onAdvanceMatchday}
              disabled={isAdvancing}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 ${
                isAdvancing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold shadow-emerald-950'
              }`}
            >
              {isAdvancing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Simulating Matchday...
                </>
              ) : (
                <>
                  <span>▶</span> Advance Matchday
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
