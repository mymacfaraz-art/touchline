import { PositionRole } from './player';

export type FormationShape = 
  | '4-3-3' 
  | '4-2-3-1' 
  | '4-4-2' 
  | '3-5-2' 
  | '5-3-2' 
  | '3-4-3';

export type TeamMentality = 
  | 'VERY_DEFENSIVE' 
  | 'DEFENSIVE' 
  | 'BALANCED' 
  | 'ATTACKING' 
  | 'VERY_ATTACKING';

export type PressingIntensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type DefensiveLineHeight = 'DEEP' | 'STANDARD' | 'HIGH';
export type PassingStyle = 'DIRECT' | 'BALANCED' | 'SHORT_TIKI_TAKA';

export interface PlayerTacticalInstruction {
  playerId: string;
  assignedPosition: PositionRole;
  individualInstructions?: string[];
}

export interface DomainTactics {
  formation: FormationShape;
  mentality: TeamMentality;
  pressingIntensity: PressingIntensity;
  defensiveLine: DefensiveLineHeight;
  passingStyle: PassingStyle;
  playerInstructions: PlayerTacticalInstruction[];
}
