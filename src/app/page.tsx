'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { CareerSetup } from '@/components/CareerSetup';
import { DashboardView } from '@/components/DashboardView';
import { SquadView } from '@/components/SquadView';
import { TacticsView } from '@/components/TacticsView';
import { MatchdayView } from '@/components/MatchdayView';
import { CompetitionsView } from '@/components/CompetitionsView';
import { FixturesView } from '@/components/FixturesView';
import { TransfersView } from '@/components/TransfersView';
import { ScoutingView } from '@/components/ScoutingView';
import { TrainingView } from '@/components/TrainingView';
import { DevelopmentView } from '@/components/DevelopmentView';
import { NewsView } from '@/components/NewsView';
import { InboxView } from '@/components/InboxView';
import { BoardView } from '@/components/BoardView';
import { ClubView } from '@/components/ClubView';
import { ManagerView } from '@/components/ManagerView';

export default function TouchlineApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [careerId, setCareerId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('Arsenal FC');
  const [managerName, setManagerName] = useState('Alex Ferguson');
  const [currentDate, setCurrentDate] = useState('15 Aug 2024');
  const [seasonName, setSeasonName] = useState('2024/25 Season');
  const [transferBudget, setTransferBudget] = useState(45000000);
  const [wageBudget, setWageBudget] = useState(250000);

  const [showSetup, setShowSetup] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(2);

  // Load existing career if available
  useEffect(() => {
    if (careerId) {
      loadCareerData(careerId);
    }
  }, [careerId]);

  const loadCareerData = async (cId: string) => {
    try {
      const res = await fetch(`/api/career?careerId=${cId}`);
      const data = await res.json();
      if (data.success && data.career) {
        const car = data.career;
        if (car.name) {
          const clubMatch = car.name.split("'s ")[1]?.replace(" Career", "");
          if (clubMatch) setClubName(clubMatch);
        }
      }
    } catch (err) {
      console.error("Error loading career data:", err);
    }
  };

  const handleCareerCreated = (newCareerId: string, newClubId: string) => {
    setCareerId(newCareerId);
    setClubId(newClubId);
    setShowSetup(false);
    setActiveTab('dashboard');
  };

  const handleAdvanceMatchday = async () => {
    setIsAdvancing(true);
    try {
      const res = await fetch('/api/career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance_matchday',
          competitionSeasonId: 'cs-default',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Advance current date string
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
      }
    } catch (err) {
      console.error('Error advancing matchday:', err);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clubName={clubName}
        managerName={managerName}
        unreadInboxCount={unreadInboxCount}
        onNewCareerClick={() => setShowSetup(true)}
      />

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentDate={currentDate}
          seasonName={seasonName}
          transferBudget={transferBudget}
          wageBudget={wageBudget}
          isAdvancing={isAdvancing}
          onAdvanceMatchday={handleAdvanceMatchday}
          onQuickMatch={() => setActiveTab('matches')}
        />

        <main className="p-6 md:p-8 flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              clubName={clubName}
              onNavigate={setActiveTab}
              onPlayMatch={() => setActiveTab('matches')}
            />
          )}

          {activeTab === 'squad' && <SquadView clubId={clubId || undefined} />}

          {activeTab === 'tactics' && <TacticsView clubId={clubId || undefined} />}

          {activeTab === 'matches' && (
            <MatchdayView
              clubName={clubName}
              onMatchCompleted={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'competitions' && <CompetitionsView userClubName={clubName} />}

          {activeTab === 'transfers' && <TransfersView userClubId={clubId || undefined} />}

          {activeTab === 'scouting' && <ScoutingView />}

          {activeTab === 'training' && <TrainingView userClubId={clubId || undefined} />}

          {activeTab === 'development' && <DevelopmentView />}

          {activeTab === 'news' && <NewsView careerId={careerId || undefined} />}

          {activeTab === 'inbox' && <InboxView careerId={careerId || undefined} />}

          {activeTab === 'board' && <BoardView />}

          {activeTab === 'club' && <ClubView clubName={clubName} />}

          {activeTab === 'manager' && <ManagerView managerName={managerName} clubName={clubName} />}
        </main>

        <footer className="px-8 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
          Touchline Football Manager Engine &copy; 2026 · Integrated Production Architecture
        </footer>
      </div>

      {/* Career Setup Modal */}
      {showSetup && (
        <CareerSetup
          onCareerCreated={handleCareerCreated}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
