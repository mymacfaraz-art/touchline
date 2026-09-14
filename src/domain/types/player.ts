export type PositionRole = 
  | 'GK' 
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' 
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' 
  | 'LW' | 'RW' | 'CF' | 'ST';

export interface PlayerAttributes {
  // Physical
  pace: number;         // 1-99
  stamina: number;      // 1-99
  strength: number;     // 1-99
  agility: number;      // 1-99

  // Technical
  passing: number;      // 1-99
  shooting: number;     // 1-99
  tackling: number;     // 1-99
  dribbling: number;    // 1-99
  firstTouch: number;   // 1-99
  heading: number;      // 1-99

  // Mental / Tactical
  positioning: number;  // 1-99
  vision: number;       // 1-99
  composure: number;    // 1-99
  workRate: number;     // 1-99
  decisionMaking: number; // 1-99
}

export interface PlayerCondition {
  fitness: number;      // 0-100 (stamina available)
  fatigue: number;      // 0-100 (cumulative fatigue)
  morale: number;       // 0-100 (psychological state)
  form: number;         // 0-100 (recent performance rating)
  sharpness: number;    // 0-100 (match practice level)
  isInjured: boolean;
  isSuspended: boolean;
}

export interface DomainPlayer {
  id: string;
  firstName: string;
  lastName: string;
  shortName: string;
  age: number;
  nationality: string;
  primaryPosition: PositionRole;
  secondaryPositions: PositionRole[];
  attributes: PlayerAttributes;
  condition: PlayerCondition;
  clubId?: string;
}
