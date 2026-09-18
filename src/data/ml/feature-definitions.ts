// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: ML FEATURE DEFINITIONS
// Canonical feature taxonomy designed for Phase 6 Python ML attribute model training.
// Strictly defines position-specific groups, source lineage, and marks unavailable metrics.
// ─────────────────────────────────────────────────────────────────────────────

export const UNAVAILABLE_FROM_CURRENT_SOURCES = 'UNAVAILABLE_FROM_CURRENT_SOURCES' as const;

export interface SourceLineageRecord {
  sourceCode: string;
  sourceEntityId: string;
  datasetVersion: string;
  importedAt: string;
  rawMetricsPresent: string[];
}

export interface MLFeatureVector {
  // Metadata & Identification
  playerId: string;
  seasonKey: string; // e.g. "2023-2024"
  competitionCode: string;
  splitRole: 'TRAIN' | 'VALIDATION' | 'TEST';
  sourceLineage?: SourceLineageRecord;

  // 1. Identity & Physical Features
  age: number;
  height: number;
  weight?: number;
  positionCategory: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'ATTACKER';
  primaryPosition: string;
  preferredFoot: 'LEFT' | 'RIGHT' | 'BOTH';

  // 2. Playing Time
  appearances: number;
  starts: number;
  minutesPlayed: number;
  startsRatio: number; // starts / appearances

  // 3. Attacking & Finishing
  goals: number;
  shots: number;
  shotsOnTarget: number;
  goalsPer90: number;
  shotsPer90: number;
  shotAccuracy: number; // shotsOnTarget / shots
  conversionRate: number; // goals / shots
  expectedGoals?: number; // xG when provided by source

  // 4. Creation & Passing
  assists: number;
  keyPasses: number;
  passesCompleted: number;
  passAccuracy: number;
  assistsPer90: number;
  keyPassesPer90: number;
  expectedAssists?: number; // xA when provided by source

  // 5. Defending & Duels
  tackles: number;
  interceptions: number;
  clearances: number;
  aerialDuelsWon: number;
  tacklesPer90: number;
  interceptionsPer90: number;
  aerialDuelsPer90: number;
  groundDuelsWon?: number;
  dribblesSuccess?: number;

  // 6. Goalkeeping
  saves: number;
  goalsConceded: number;
  cleanSheets: number;
  savePercentage: number; // saves / (saves + goalsConceded)
  cleanSheetRate: number; // cleanSheets / appearances
  expectedGoalsConceded?: number; // xGC when provided by source

  // 7. Discipline
  yellowCards: number;
  redCards: number;
  foulsPer90: number;

  // 8. Explicitly Unavailable Advanced Metrics (Truthful Accounting)
  progressiveCarries?: typeof UNAVAILABLE_FROM_CURRENT_SOURCES;
  sprintCount?: typeof UNAVAILABLE_FROM_CURRENT_SOURCES;
  distanceCoveredKm?: typeof UNAVAILABLE_FROM_CURRENT_SOURCES;
  highClaimPercentage?: typeof UNAVAILABLE_FROM_CURRENT_SOURCES;
}

/**
 * Position-Specific Feature Groupings for Phase 6 Model Architectures.
 */
export const POSITION_FEATURE_GROUPS = {
  ATTACKER: {
    shooting: ['goalsPer90', 'shotsPer90', 'shotAccuracy', 'conversionRate', 'expectedGoals'],
    dribbling: ['dribblesSuccess'],
    chanceCreation: ['assistsPer90', 'keyPassesPer90', 'expectedAssists'],
    physical: ['height', 'age', 'startsRatio'],
  },
  MIDFIELDER: {
    passing: ['passesCompleted', 'passAccuracy', 'keyPassesPer90'],
    possession: ['passesCompleted', 'dribblesSuccess', 'groundDuelsWon'],
    chanceCreation: ['assistsPer90', 'keyPassesPer90', 'expectedAssists'],
    defending: ['tacklesPer90', 'interceptionsPer90'],
    physical: ['height', 'age', 'startsRatio'],
  },
  DEFENDER: {
    defending: ['tacklesPer90', 'interceptionsPer90', 'clearances'],
    passing: ['passesCompleted', 'passAccuracy'],
    physical: ['height', 'age', 'startsRatio'],
    aerial: ['aerialDuelsWon', 'aerialDuelsPer90'],
  },
  GOALKEEPER: {
    shotStopping: ['saves', 'savePercentage', 'goalsConceded'],
    distribution: ['passesCompleted', 'passAccuracy'],
    command: ['cleanSheets', 'cleanSheetRate'],
    cleanSheets: ['cleanSheets', 'cleanSheetRate', 'expectedGoalsConceded'],
  },
};

/**
 * Expected Phase 6 Output Contract:
 * - Individual Attributes: 1–99 integer scale
 * - Overall (OVR): 1–91 integer scale (never exceeds 91)
 */
export const PHASE_6_RATING_CONTRACT = {
  ATTRIBUTE_MIN: 1,
  ATTRIBUTE_MAX: 99,
  OVERALL_MIN: 1,
  OVERALL_MAX: 91, // Touchline ceiling
  CALIBRATION_METHOD: 'POSITION_WEIGHTED_POLYNOMIAL',
};
