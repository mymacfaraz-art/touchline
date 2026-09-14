// ─────────────────────────────────────────────────────────────────────────────
// COMPETITION & SEASON DOMAIN TYPES
// Pure TypeScript. Zero framework or database dependencies.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums ───────────────────────────────────────────────────────────────────

export type CompetitionType =
  | 'LEAGUE'
  | 'DOMESTIC_CUP'
  | 'CONTINENTAL_CUP'
  | 'SUPER_CUP'
  | 'FRIENDLY';

/**
 * The structural format of a competition.
 * Determines what phase types are valid and how scheduling works.
 */
export type CompetitionFormat =
  | 'ROUND_ROBIN'          // League: every team plays every other team
  | 'KNOCKOUT'             // Domestic cup: lose and you're out
  | 'GROUP_THEN_KNOCKOUT'; // UCL-style: group stage then knockout rounds

export type CompetitionPhaseType =
  | 'LEAGUE_ROUNDS'     // Standard league matchday cycle
  | 'GROUP'             // Group stage within a larger competition
  | 'KNOCKOUT_ROUND'    // A specific knockout round (R16, QF, SF)
  | 'FINAL';            // The final match of a competition

// ─────────────────────────────────────────────────────────────────────────────
// COMPETITION IDENTITY & RULES (STATIC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persistent competition identity and ruleset.
 * This record describes what the competition IS and how it works.
 * It does not change between seasons.
 */
export interface DomainCompetition {
  id: string;
  name: string;
  /** Short identifier e.g. "EPL", "UCL", "FA_CUP" */
  code: string;
  type: CompetitionType;
  format: CompetitionFormat;
  /** null for continental competitions */
  countryId?: string;
  /** "Europe", "South America" etc. for continental competitions */
  continent?: string;
  /** 1 = top flight, 2 = second division, etc. */
  tier: number;
  teamsCount: number;
  hasPromotion: boolean;
  hasRelegation: boolean;
  promotionSpots: number;
  relegationSpots: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAREER / GAME SAVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A Career (game save) is the root of an independent playthrough.
 *
 * One user can have many Careers — each is completely isolated:
 *   - its own GameSeasons
 *   - its own player development
 *   - its own club states
 *   - its own match results
 *
 * Career A and Career B can both have a 2026/27 season without conflict.
 */
export interface DomainCareer {
  id: string;
  userId: string;
  name: string;
  /** The ID of the season currently active in this career. Nullable until first season is created. */
  currentGameSeasonId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME SEASON (CAREER YEAR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The career-level football year container.
 * All events in the game world (transfers, matches, development) happen
 * within a GameSeason.
 *
 * A single GameSeason (e.g. 2026/27) contains multiple CompetitionSeason
 * records — one per competition the game world is running that year.
 *
 * GameSeasons are scoped to a Career — two different careers can both have
 * a 2026/27 season without any uniqueness conflict.
 */
export interface DomainGameSeason {
  id: string;
  careerId: string;
  yearStart: number;
  yearEnd: number;
  isCurrent: boolean;
  isComplete: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPETITION SEASON (ONE EDITION OF ONE COMPETITION)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A specific edition of a competition within a game season.
 *
 * Example: GameSeason "2026/27" contains:
 *   → CompetitionSeason { competitionId: "epl",   gameSeasonId: "2026/27" }
 *   → CompetitionSeason { competitionId: "fa-cup", gameSeasonId: "2026/27" }
 *   → CompetitionSeason { competitionId: "ucl",   gameSeasonId: "2026/27" }
 */
export interface DomainCompetitionSeason {
  id: string;
  competitionId: string;
  gameSeasonId: string;
  isComplete: boolean;
  /** FK → Club — set at season end when a winner is determined */
  winnerClubId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPETITION PHASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A structural sub-division of a CompetitionSeason.
 * Provides the scaffolding for future scheduling and rules logic.
 *
 * The phase model is configurable — it does NOT assume any specific
 * real-world competition structure. Example configurations:
 *
 *   EPL 2026/27    → 1 phase:  { type: LEAGUE_ROUNDS, order: 1 }
 *   FA Cup 2026/27 → N phases: R3(1), R4(2), R5(3), QF(4), SF(5), Final(6)
 *   UCL 2026/27    → 2 phases: { type: GROUP, order: 1 },
 *                               { type: KNOCKOUT_ROUND, order: 2 }
 *
 * The number of phases and their names are configurable at runtime.
 * The FINAL phase type is a marker — not a structural constraint.
 */
export interface DomainCompetitionPhase {
  id: string;
  competitionSeasonId: string;
  name: string;
  phaseType: CompetitionPhaseType;
  /** Sequence number — lower = earlier in the competition */
  order: number;
  startDate?: Date;
  endDate?: Date;
  isComplete: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASON CLUB PARTICIPATION (LEAGUE TABLE ROW)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a club's participation in a CompetitionSeason.
 *
 * For league and group-stage competitions, this record also accumulates
 * standings statistics (played/won/drawn/lost/goals/points).
 *
 * SOURCE OF TRUTH FOR STANDINGS:
 *   These counters are derived from completed Match results (homeScore/awayScore).
 *   The service layer updates these values after each match is simulated.
 *   A rebuild query can always recompute standings from scratch:
 *     SELECT all Matches in CompetitionSeason → tally results per club.
 *
 * For KNOCKOUT competition participations:
 *   played/won/drawn/lost/points are not meaningful for round-by-round progression.
 *   They remain at 0. Use CompetitionPhase + Fixture + Match to track knockout progress.
 *
 * goalDifference is always computed at read time (goalsFor - goalsAgainst).
 */
export interface SeasonClubParticipation {
  id: string;
  competitionSeasonId: string;
  clubId: string;
  /**
   * Accumulated from match results.
   * Meaningful for LEAGUE and GROUP phase competitions.
   * Zero for pure KNOCKOUT participations.
   */
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Computed at read time: goalsFor - goalsAgainst */
  readonly goalDifference: number;
  points: number;
  /** For UCL-style group stages — identifies which group the club is in */
  groupId?: string;
  /** Set at season end: "PROMOTED" | "RELEGATED" | "PLAYOFF" | null */
  promotionStatus?: string;
}
