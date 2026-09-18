// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: ADVANCED AI & IMMERSION DOMAIN TYPES
// ─────────────────────────────────────────────────────────────────────────────

import { TacticDocument } from './tactics';

export interface ManagerTacticalIdentity {
  preferredFormation: string; // e.g. '4-3-3', '4-2-3-1', '3-5-2'
  mentality: 'DEFENSIVE' | 'BALANCED' | 'ATTACKING';
  pressingIntensity: 'LOW' | 'MEDIUM' | 'HIGH';
  defensiveLineDepth: 'DEEP' | 'STANDARD' | 'HIGH';
  width: 'NARROW' | 'NORMAL' | 'WIDE';
  tempo: 'SLOW' | 'NORMAL' | 'HIGH';
  riskTolerance: number; // 0.0 (extreme caution) to 1.0 (all-out attack)
  youthPreference: number; // 0.0 to 1.0
}

export interface AdaptiveMatchState {
  matchId: string;
  minute: number;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  isHomeTeam: boolean;
  homeRedCards: number;
  awayRedCards: number;
  homeFatigueAvg: number;
  awayFatigueAvg: number;
  currentTactics: TacticDocument;
  remainingSubstitutions: number;
}

export interface ManagerDecisionTraceOutput {
  minute: number;
  trigger: string;
  gameState: Record<string, any>;
  availableOptions: string[];
  selectedAction: string;
  confidence: number;
  rationale: string;
  adaptedTactics?: TacticDocument;
  substitutionRequest?: {
    playerOutId: string;
    playerInId: string;
    reason: string;
  };
}

export interface IManagerDecisionProvider {
  evaluateMatchAdaptation(
    matchState: AdaptiveMatchState,
    managerProfile: ManagerTacticalIdentity
  ): Promise<ManagerDecisionTraceOutput | null>;
}

export interface OppositionAnalysis {
  opponentClubId: string;
  opponentName: string;
  dataQuality: 'SUFFICIENT_DATA' | 'INSUFFICIENT_DATA';
  sampleMatchesCount: number;
  preferredFormation?: string;
  winRate?: number;
  averageGoalsScored?: number;
  averageGoalsConceded?: number;
  pressingTendency?: string;
  vulnerabilityNote?: string;
}

export interface ScoutingReportResult {
  playerId: string;
  shortName: string;
  position: string;
  age: number;
  currentClubName?: string;
  confidence: 'KNOWN' | 'ESTIMATED' | 'UNKNOWN';
  estimatedOverall: number;
  estimatedPotential?: number;
  tacticalFitScore: number; // 0-100
  summary: string;
  knownAttributes: Record<string, number | 'ESTIMATED' | 'UNKNOWN'>;
  dataFreshness: Date;
}

export interface RecruitmentEvaluation {
  playerId: string;
  shortName: string;
  currentOVR: number;
  potential: number;
  askingFee: number;
  weeklyWage: number;
  suitabilityScore: number; // 0-100
  tacticalFit: number; // 0-100
  recommendedAction: 'MUST_BUY' | 'CONSIDER' | 'PASS';
  rationale: string;
}

export interface IRecruitmentDecisionProvider {
  evaluatePlayerTarget(
    targetPlayerId: string,
    buyerClubId: string,
    gameSeasonId: string
  ): Promise<RecruitmentEvaluation>;
}

export interface NarrativeContext {
  matchId?: string;
  careerId: string;
  gameSeasonId: string;
  headlineFacts: {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    competitionName?: string;
    keyEvents: Array<{
      minute: number;
      kind: string;
      playerShortName?: string;
    }>;
    homeXg?: number;
    awayXg?: number;
    homePossession?: number;
    awayPossession?: number;
  };
}

export interface INarrativeProvider {
  generateMatchReport(context: NarrativeContext): Promise<{
    headline: string;
    summary: string;
    managerQuote: string;
    sourceType: string;
  }>;
}
