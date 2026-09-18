import React from 'react';

export type NavTab =
  | 'dashboard'
  | 'squad'
  | 'tactics'
  | 'matches'
  | 'competitions'
  | 'transfers'
  | 'scouting'
  | 'training'
  | 'development'
  | 'news'
  | 'inbox'
  | 'board'
  | 'club'
  | 'manager';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  clubName?: string;
  managerName?: string;
  unreadInboxCount?: number;
  onNewCareerClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  clubName = 'Arsenal FC',
  managerName = 'Head Manager',
  unreadInboxCount = 2,
  onNewCareerClick,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: string; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: '⚽' },
    { id: 'squad', label: 'Squad', icon: '👥' },
    { id: 'tactics', label: 'Tactics', icon: '📋' },
    { id: 'matches', label: 'Matches', icon: '🏆' },
    { id: 'competitions', label: 'League Table', icon: '📊' },
    { id: 'transfers', label: 'Transfers', icon: '💸' },
    { id: 'scouting', label: 'Scouting', icon: '🔍' },
    { id: 'training', label: 'Training', icon: '🏃' },
    { id: 'development', label: 'Development', icon: '📈' },
    { id: 'news', label: 'News Feed', icon: '📰' },
    { id: 'inbox', label: 'Inbox', icon: '📬', badge: unreadInboxCount },
    { id: 'board', label: 'Board Objectives', icon: '🎯' },
    { id: 'club', label: 'Club Details', icon: '🏛️' },
    { id: 'manager', label: 'Manager Profile', icon: '👔' },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="text-emerald-500">TOUCHLINE</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Football Manager Engine</p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
            v1.0
          </span>
        </div>

        {/* Club & Manager Badge */}
        <div className="p-4 mx-3 my-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-lg font-bold text-emerald-400 shrink-0">
            {clubName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{clubName}</p>
            <p className="text-[11px] text-slate-400 truncate">{managerName}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-slate-950">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Career Control Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950">
        <button
          onClick={onNewCareerClick}
          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <span>➕</span> New Career Setup
        </button>
      </div>
    </aside>
  );
};
