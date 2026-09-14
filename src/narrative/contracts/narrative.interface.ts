import { MatchSimulationResult } from '../../simulation/models/simulation-contracts';

export type NarrativeKind = 
  | 'MATCH_REPORT' 
  | 'DYNAMIC_NEWS' 
  | 'PRESS_CONFERENCE' 
  | 'BOARD_MESSAGE' 
  | 'PLAYER_DIALOGUE';

export interface NarrativeContextFact {
  key: string;
  value: string | number | boolean;
}

export interface NarrativeRequest {
  kind: NarrativeKind;
  matchResult?: MatchSimulationResult;
  clubName?: string;
  managerName?: string;
  contextFacts: NarrativeContextFact[];
}

export interface NarrativeOutput {
  headline: string;
  bodyText: string;
  tone: 'NEUTRAL' | 'POSITIVE' | 'NEGATIVE' | 'DRAMATIC';
  author: string;
  generatedAt: string;
}

/**
 * Authoritative contract for AI Narrative Generation.
 * 
 * CRITICAL RULE:
 * The AI Narrative system accepts structured facts produced by the simulation engine or game state.
 * It strictly outputs human-readable storytelling (news, quotes, reports).
 * It is NEVER allowed to modify or determine authoritative game state or match outcomes.
 * 
 * Flow: Simulation -> MatchResult -> INarrativeGenerator -> NarrativeOutput
 */
export interface INarrativeGenerator {
  readonly generatorId: string;
  generateNarrative(request: NarrativeRequest): Promise<NarrativeOutput>;
}
