// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: MANAGER AI & SUBSTITUTION TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManagerAIService } from '../src/ai/manager/manager-ai.service';
import { SubstitutionAIService } from '../src/ai/manager/substitution-ai';
import { prisma } from '../src/lib/prisma';
import { AdaptiveMatchState, ManagerTacticalIdentity } from '../src/domain/types/advanced-ai';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    managerDecisionTrace: {
      create: vi.fn(),
    },
    domainEventLog: {
      create: vi.fn(),
    },
  },
}));

describe('Phase 10: Manager AI & Substitution Engine', () => {
  let managerService: ManagerAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    managerService = new ManagerAIService();
  });

  const defaultProfile: ManagerTacticalIdentity = {
    preferredFormation: '4-3-3',
    mentality: 'ATTACKING',
    pressingIntensity: 'HIGH',
    defensiveLineDepth: 'HIGH',
    width: 'WIDE',
    tempo: 'HIGH',
    riskTolerance: 0.8,
    youthPreference: 0.7,
  };

  const baseTactics: import('../src/domain/types/tactics').TacticDocument = {
    _schemaVersion: '1',
    formation: '4-3-3',
    mentality: 'BALANCED' as const,
    pressingIntensity: 'MEDIUM' as const,
    defensiveLine: 'STANDARD' as const,
    passingStyle: 'BALANCED' as const,
    tempo: 'NORMAL' as const,
    width: 'NORMAL' as const,
    buildUpStyle: 'SHORT_PASSING' as const,
    transitionStyle: 'CONTROL' as const,
    outOfPossession: 'BLOCK' as const,
    playerRoles: [],
  };

  describe('Adaptive Match AI', () => {
    it('adapts tactics to all-out attacking when trailing in late match (Min 75+)', async () => {
      const matchState: AdaptiveMatchState = {
        matchId: 'match-demo-1',
        minute: 78,
        homeClubId: 'club-mancity',
        awayClubId: 'club-liverpool',
        homeScore: 0,
        awayScore: 1,
        isHomeTeam: true,
        homeRedCards: 0,
        awayRedCards: 0,
        homeFatigueAvg: 40,
        awayFatigueAvg: 45,
        currentTactics: baseTactics,
        remainingSubstitutions: 3,
      };

      const trace = await managerService.evaluateMatchAdaptation(matchState, defaultProfile);

      expect(trace).not.toBeNull();
      expect(trace?.selectedAction).toBe('SWITCH_TO_ATTACKING_PUSH');
      expect(trace?.adaptedTactics?.mentality).toBe('ATTACKING');
      expect(trace?.adaptedTactics?.tempo).toBe('HIGH');
      expect(trace?.rationale).toContain('Increasing attacking urgency');
    });

    it('adapts to deep defensive structure when receiving a red card', async () => {
      const matchState: AdaptiveMatchState = {
        matchId: 'match-demo-2',
        minute: 50,
        homeClubId: 'club-mancity',
        awayClubId: 'club-liverpool',
        homeScore: 1,
        awayScore: 1,
        isHomeTeam: true,
        homeRedCards: 1,
        awayRedCards: 0,
        homeFatigueAvg: 30,
        awayFatigueAvg: 30,
        currentTactics: baseTactics,
        remainingSubstitutions: 3,
      };

      const trace = await managerService.evaluateMatchAdaptation(matchState, defaultProfile);

      expect(trace).not.toBeNull();
      expect(trace?.selectedAction).toBe('DROP_DEFENSIVE_LINE_FOR_SAFETY');
      expect(trace?.adaptedTactics?.mentality).toBe('DEFENSIVE');
      expect(trace?.adaptedTactics?.defensiveLine).toBe('DEEP');
    });
  });

  describe('AI Substitution System', () => {
    it('selects forced substitution for an injured player on the pitch', () => {
      const playersOnPitch = [
        {
          playerId: 'p-injured',
          position: 'ST',
          fitness: 20,
          fatigue: 80,
          yellowCards: 0,
          rating: 6.0,
          isInjured: true,
        },
        {
          playerId: 'p-ok',
          position: 'CM',
          fitness: 90,
          fatigue: 10,
          yellowCards: 0,
          rating: 7.2,
          isInjured: false,
        },
      ];

      const benchPlayers = [
        {
          playerId: 'bench-st',
          position: 'ST',
          fitness: 100,
          overallRating: 82,
          isAvailable: true,
        },
      ];

      const sub = SubstitutionAIService.selectBestSubstitution({
        playersOnPitch,
        benchPlayers,
        remainingSubs: 3,
        minute: 35,
      });

      expect(sub).not.toBeNull();
      expect(sub?.playerOutId).toBe('p-injured');
      expect(sub?.playerInId).toBe('bench-st');
      expect(sub?.reason).toContain('Forced sub');
    });

    it('returns null when no substitutions remain', () => {
      const sub = SubstitutionAIService.selectBestSubstitution({
        playersOnPitch: [],
        benchPlayers: [],
        remainingSubs: 0,
        minute: 70,
      });

      expect(sub).toBeNull();
    });
  });
});
