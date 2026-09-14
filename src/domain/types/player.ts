// ─────────────────────────────────────────────────────────────────────────────
// PLAYER DOMAIN TYPES
// Pure TypeScript. Zero framework or database dependencies.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Position & Physical Enums ───────────────────────────────────────────────

export type PlayerPosition =
  | 'GK'
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'CF' | 'ST';

export type PreferredFoot = 'LEFT' | 'RIGHT' | 'BOTH';

// ─── Injury & Suspension Enums ───────────────────────────────────────────────

export type InjuryType =
  | 'KNOCK'
  | 'MUSCLE_STRAIN'
  | 'LIGAMENT'
  | 'FRACTURE'
  | 'HEAD'
  | 'FATIGUE_RELATED';

export type InjurySeverity =
  | 'MINOR'              // Days
  | 'MODERATE'           // Weeks
  | 'SEVERE'             // Months
  | 'CAREER_THREATENING';

export type SuspensionReason =
  | 'YELLOW_CARD_ACCUMULATION'
  | 'RED_CARD'
  | 'MISCONDUCT';

// ─── Personality Enums ───────────────────────────────────────────────────────

export type PersonalityTrait =
  | 'PROFESSIONAL'
  | 'DETERMINED'
  | 'MODEL_CITIZEN'
  | 'TEMPERAMENTAL'
  | 'UNAMBITIOUS'
  | 'MERCENARY'
  | 'LOYAL'
  | 'MAVERICK';

// ─── Development Enums ───────────────────────────────────────────────────────

export type AttributeChangeReason =
  | 'TRAINING'
  | 'MATCH_PERFORMANCE'
  | 'AGE_PROGRESSION'
  | 'AGE_DECLINE'
  | 'INJURY_RECOVERY'
  | 'COACHING_EFFECT'
  | 'FACILITY_UPGRADE';

// ─── Club Registration Enums ─────────────────────────────────────────────────

export type RegistrationType =
  | 'PERMANENT'
  | 'LOAN'
  | 'FREE_AGENT_SIGNING'
  | 'YOUTH_PROMOTION';

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTE TAXONOMY — All values 1–99 integer scale
// ─────────────────────────────────────────────────────────────────────────────

/** Quality of actions performed on the ball */
export interface TechnicalAttributes {
  /** Short and medium pass quality */
  passing: number;
  /** Long ball distribution quality and range */
  longPassing: number;
  /** Accuracy of wide deliveries into the box */
  crossing: number;
  /** Shot accuracy and technique in goal-scoring situations */
  finishing: number;
  /** Ball control receiving passes, especially under pressure */
  firstTouch: number;
  /** Ability to beat opponents while carrying the ball */
  dribbling: number;
  /** General in-play ball retention and close control */
  ballControl: number;
  /** Power and direction of headed contacts */
  heading: number;
  /** Quality and timing of slide and standing tackles */
  tackling: number;
  /** Tracking runners and maintaining goal-side position */
  marking: number;
  /** Dead ball delivery — free kicks and corner quality */
  freeKick: number;
  /** Composure and technique from the penalty spot */
  penaltyTaking: number;
}

/** Raw athletic capacity */
export interface PhysicalAttributes {
  /** Short burst speed from a standing start */
  acceleration: number;
  /** Top running speed in open space */
  pace: number;
  /** Ability to maintain effort across 90+ minutes */
  stamina: number;
  /** Power in physical duels and shielding the ball */
  strength: number;
  /** Speed of directional change and footwork */
  agility: number;
  /** Stability when challenged, turning, or under physical pressure */
  balance: number;
  /** Leap height for aerial duels */
  jumping: number;
  /** Natural recovery speed between matches — affects fatigue model */
  naturalFitness: number;
}

/** Cognitive and psychological football intelligence */
export interface MentalAttributes {
  /** Performance quality under high-pressure situations */
  composure: number;
  /** Speed and quality of in-game decision making */
  decisions: number;
  /** Ability to read space, anticipate play, and thread passes */
  vision: number;
  /** Reading opponent movement before it happens */
  anticipation: number;
  /** Intelligent movement into dangerous positions off the ball */
  positioning: number;
  /** Sustained mental focus and engagement across a full match */
  concentration: number;
  /** Off-ball pressing effort, defensive tracking, and recovery runs */
  workRate: number;
  /**
   * Intensity in physical duels. High value = more successful challenges
   * but also higher disciplinary risk.
   */
  aggression: number;
  /** Positive influence on teammates; amplified as captain */
  leadership: number;
  /** Effectiveness within a collective tactical system */
  teamwork: number;
  /** Speed of adjustment to new roles, clubs, and tactical systems */
  adaptability: number;
}

/**
 * Goalkeeping-specific attributes.
 * These are null for outfield players.
 */
export interface GoalkeepingAttributes {
  /** Shot-stopping reflex speed and agility */
  gkReflexes: number;
  /** Clean catch quality under crosses and high balls */
  gkHandling: number;
  /** Angle management and starting position selection */
  gkPositioning: number;
  /** Distribution quality — short and long kicks */
  gkKicking: number;
  /** Organising the defensive line and reading set pieces */
  gkCommunication: number;
}

/**
 * A player's current trained ability — what they can do right now.
 * Modified by the development engine at season boundaries.
 * NEVER modified directly during match simulation.
 *
 * DB storage: flat columns in PlayerAttributes table.
 * Domain representation: nested groups here for clarity.
 */
export interface PlayerAttributes {
  technical: TechnicalAttributes;
  physical: PhysicalAttributes;
  mental: MentalAttributes;
  /** null for outfield players; populated only when primaryPosition === 'GK' */
  goalkeeping: GoalkeepingAttributes | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER POTENTIAL & DEVELOPMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hidden development profile. Accessible ONLY to the simulation engine and
 * scouting service. Never surfaced as a raw number to the UI.
 *
 * Ability scale: 1–200 (internal engine range).
 * `currentAbility` is intentionally NOT stored — it is computed at runtime.
 */
export interface PlayerPotential {
  /** Internal engine scale 1–200. The ceiling this player can reach. */
  potentialAbility: number;
  /**
   * Multiplier on development speed.
   * Range: 0.5 (very slow) to 2.0 (rapid).
   */
  developmentRate: number;
  /** Age this player is expected to enter their peak window. */
  peakAgeStart: number;
  /** Age this player is expected to begin declining. */
  peakAgeEnd: number;
}

/**
 * Tracks a single attribute change event.
 * These records form the complete development audit trail.
 * The development algorithm writes these; it does NOT modify PlayerAttributes directly.
 */
export interface PlayerAttributeSnapshot {
  id: string;
  playerId: string;
  gameSeasonId: string;
  /** Dot-notation path e.g. "technical.passing", "physical.pace" */
  attributeKey: string;
  previousValue: number;
  newValue: number;
  delta: number;
  changeReason: AttributeChangeReason;
  occurredAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER PERSONALITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Six purposeful personality dimensions. Scale: 1–20.
 * Each dimension directly influences simulation mechanics.
 */
export interface PlayerPersonality {
  /** Desire for bigger challenges. High = more likely to request transfers. */
  ambition: number;
  /** Training effort quality. High = better development rate multiplier. */
  professionalism: number;
  /** Club attachment. High = accepts below-market wage. */
  loyalty: number;
  /**
   * Emotional control. Low = more disciplinary incidents, tunnel
   * confrontations, and unpredictable behaviour.
   */
  temperament: number;
  /** Performance under high-stakes situations. Low = composure drops in finals. */
  pressureHandling: number;
  /** Media relations quality. Low = generates negative press events. */
  mediaHandling: number;
  /** Single dominant summary trait used by the narrative system. */
  dominantTrait?: PersonalityTrait;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER DYNAMIC STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Player's live condition for a game season.
 * One record per player per GameSeason.
 * Scoped to career year (NOT per competition) because fatigue and morale
 * carry across all competitions the player participates in.
 */
export interface PlayerCondition {
  playerId: string;
  gameSeasonId: string;

  /** Available energy for the next match (0–100) */
  fitness: number;
  /** Accumulated tiredness from recent matches (0–100) */
  fatigue: number;
  /** Psychological wellbeing (0–100) */
  morale: number;
  /** Belief in own performance ability (0–100) */
  confidence: number;
  /** Match practice sharpness — rises with play, falls with absence (0–100) */
  sharpness: number;
  /** Rolling average of recent match ratings (0–100) */
  form: number;
  /** Knowledge of the current tactical system (0–100) */
  tacticalFamiliarity: number;
}

/**
 * Player statistics for one registration in one competition season.
 * One record per (PlayerClubRegistration × CompetitionSeason).
 *
 * Mid-season transfers produce two separate records for the same competition
 * that year (one per registration). Season totals are SUM queries.
 */
export interface PlayerCompetitionStats {
  id: string;
  playerId: string;
  registrationId: string;
  competitionSeasonId: string;
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  averageRating: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUB REGISTRATION HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a player's membership at a club.
 * Created for every transfer, loan, or signing — preserves complete history.
 * Player.clubId is NOT used; current club = WHERE isActive = true.
 */
export interface PlayerClubRegistration {
  id: string;
  playerId: string;
  clubId: string;
  gameSeasonId: string;
  registrationType: RegistrationType;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  loanEndDate?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// INJURY & SUSPENSION
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerInjury {
  id: string;
  playerId: string;
  injuryType: InjuryType;
  severity: InjurySeverity;
  description: string;
  startDate: Date;
  expectedReturn: Date;
  actualReturn?: Date;
  matchId?: string;
}

export interface PlayerSuspension {
  id: string;
  playerId: string;
  reason: SuspensionReason;
  matchesMissed: number;
  matchesMissedRemaining: number;
  competitionSeasonId: string;
  startedAtFixtureId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER IDENTITY (STATIC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core player record. Static identity data that changes infrequently.
 * Age is computed at runtime from dateOfBirth — never stored in the DB.
 */
export interface DomainPlayer {
  id: string;
  firstName: string;
  lastName: string;
  shortName: string;
  /** Use computeAge(dateOfBirth) — never access age from a stored column. */
  dateOfBirth: Date;
  nationality: string;
  secondNationality?: string;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  preferredFoot: PreferredFoot;
  /** Height in centimetres */
  height: number;
  /** Weight in kilograms (optional) */
  weight?: number;
  /** false = retired or removed from the game world */
  isActive: boolean;

  // Joined relations — populated on demand, not always present
  attributes?: PlayerAttributes;
  /** Engine-only: must be stripped before any UI-facing responses */
  potential?: PlayerPotential;
  personality?: PlayerPersonality;
  currentCondition?: PlayerCondition;
  currentRegistration?: PlayerClubRegistration;
  /**
   * A player's full contract history.
   * Current contract = first entry with status === 'ACTIVE'.
   * Use the service layer to query: WHERE status = 'ACTIVE' LIMIT 1.
   */
  contracts?: import('./contract').DomainContract[];
  activeInjury?: PlayerInjury;
  activeSuspension?: PlayerSuspension;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a player's age at a given reference date.
 * Always use this — never store age as a column.
 */
export function computeAge(dateOfBirth: Date, referenceDate: Date = new Date()): number {
  const yearDiff = referenceDate.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    referenceDate.getMonth() > dateOfBirth.getMonth() ||
    (referenceDate.getMonth() === dateOfBirth.getMonth() &&
      referenceDate.getDate() >= dateOfBirth.getDate());
  return hasHadBirthdayThisYear ? yearDiff : yearDiff - 1;
}

/** Creates a default set of attributes at the given baseline value (1–99). */
export function createDefaultAttributes(baseline = 50): PlayerAttributes {
  return {
    technical: {
      passing: baseline, longPassing: baseline, crossing: baseline,
      finishing: baseline, firstTouch: baseline, dribbling: baseline,
      ballControl: baseline, heading: baseline, tackling: baseline,
      marking: baseline, freeKick: baseline, penaltyTaking: baseline,
    },
    physical: {
      acceleration: baseline, pace: baseline, stamina: baseline,
      strength: baseline, agility: baseline, balance: baseline,
      jumping: baseline, naturalFitness: baseline,
    },
    mental: {
      composure: baseline, decisions: baseline, vision: baseline,
      anticipation: baseline, positioning: baseline, concentration: baseline,
      workRate: baseline, aggression: baseline, leadership: baseline,
      teamwork: baseline, adaptability: baseline,
    },
    goalkeeping: null,
  };
}

/** Creates default GK attributes at the given baseline value (1–99). */
export function createDefaultGKAttributes(baseline = 50): PlayerAttributes {
  return {
    ...createDefaultAttributes(baseline),
    goalkeeping: {
      gkReflexes: baseline, gkHandling: baseline, gkPositioning: baseline,
      gkKicking: baseline, gkCommunication: baseline,
    },
  };
}
