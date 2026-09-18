// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: MATCHDAY ORCHESTRATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

import { DomainPlayer, PlayerPosition, PlayerCondition } from '../../domain/types/player';
import { DomainTactics, PlayerRole, PlayerInstruction, TacticDocument } from '../../domain/types/tactics';
import { MatchSimulationResult } from '../../simulation/models/simulation-contracts';

/**
 * Player assignment in a matchday starting XI or bench.
 */
export interface LineupPlayerAssignment {
  playerId: string;
  position: PlayerPosition;
  role: PlayerRole;
  instructions?: PlayerInstruction[];
  isStarting: boolean;
}

/**
 * A manager's squad selection for a matchday.
 */
export interface SquadSelection {
  clubId: string;
  startingXI: LineupPlayerAssignment[];
  bench: LineupPlayerAssignment[];
  tactics?: DomainTactics;
}

/**
 * Detailed eligibility evaluation for a player on a matchday.
 */
export interface PlayerEligibilityResult {
  playerId: string;
  isEligible: boolean;
  isRegistered: boolean;
  isInjured: boolean;
  isSuspended: boolean;
  reasons: string[];
}

/**
 * Complete resolved squad context for one club on matchday.
 */
export interface ResolvedMatchdaySquad {
  clubId: string;
  clubName: string;
  tactics: DomainTactics;
  squadSelection: SquadSelection;
  eligiblePlayers: DomainPlayer[];
  playerConditions: Map<string, PlayerCondition>;
}

/**
 * Options passed to the MatchdayOrchestrator for match execution.
 */
export interface MatchdayOptions {
  fixtureId: string;
  homeSquadSelection?: SquadSelection;
  awaySquadSelection?: SquadSelection;
  seedOverride?: string | number;
  neutralVenue?: boolean;
}

/**
 * Authoritative summary of an orchestrated matchday run.
 */
export interface OrchestratedMatchResult {
  fixtureId: string;
  matchId: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  homeScoreHT: number;
  awayScoreHT: number;
  seed: string;
  simulatedAt: Date;
  simulationResult: MatchSimulationResult;
  persistenceSuccess: boolean;
}
