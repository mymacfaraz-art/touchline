// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: DATA QUALITY VALIDATOR
// Enforces strict data invariants on all raw and canonical football entities.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CanonicalClub,
  CanonicalCompetition,
  CanonicalFixtureResult,
  CanonicalPlayer,
  CanonicalPlayerStats,
} from '../types/data-foundation.types';

export interface ValidationErrorItem {
  entityType: string;
  sourceId: string;
  rule: string;
  message: string;
}

export class DataQualityValidator {
  private errors: ValidationErrorItem[] = [];
  private warnings: string[] = [];

  public clear(): void {
    this.errors = [];
    this.warnings = [];
  }

  public getErrors(): ValidationErrorItem[] {
    return [...this.errors];
  }

  public getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Validates a CanonicalPlayer entity.
   */
  public validatePlayer(p: CanonicalPlayer): boolean {
    let valid = true;

    if (!p.sourceId || p.sourceId.trim() === '') {
      this.addError('PLAYER', p.sourceId, 'MISSING_SOURCE_ID', 'Player must have a non-empty sourceId.');
      valid = false;
    }

    if (!p.firstName || !p.lastName) {
      this.addError('PLAYER', p.sourceId, 'MISSING_NAME', `Player name components missing: '${p.firstName} ${p.lastName}'.`);
      valid = false;
    }

    const now = new Date();
    if (!p.dateOfBirth || isNaN(p.dateOfBirth.getTime()) || p.dateOfBirth >= now) {
      this.addError('PLAYER', p.sourceId, 'INVALID_DOB', `Invalid date of birth: ${p.dateOfBirth}.`);
      valid = false;
    } else {
      const age = now.getFullYear() - p.dateOfBirth.getFullYear();
      if (age < 14 || age > 50) {
        this.addWarning(`Player ${p.firstName} ${p.lastName} (${p.sourceId}) has unusual age: ${age} years.`);
      }
    }

    if (p.height && (p.height < 150 || p.height > 220)) {
      this.addWarning(`Player ${p.firstName} ${p.lastName} (${p.sourceId}) has unusual height: ${p.height} cm.`);
    }

    return valid;
  }

  /**
   * Validates a CanonicalClub entity.
   */
  public validateClub(c: CanonicalClub): boolean {
    let valid = true;

    if (!c.sourceId || !c.name || !c.code) {
      this.addError('CLUB', c.sourceId, 'MISSING_FIELDS', 'Club must have sourceId, name, and 3-letter code.');
      valid = false;
    }

    if (c.code && c.code.length !== 3) {
      this.addWarning(`Club code '${c.code}' for ${c.name} is not standard 3-letter format.`);
    }

    if (c.reputation < 1 || c.reputation > 100) {
      this.addError('CLUB', c.sourceId, 'INVALID_REPUTATION', `Reputation ${c.reputation} out of bounds [1, 100].`);
      valid = false;
    }

    return valid;
  }

  /**
   * Validates a CanonicalCompetition entity.
   */
  public validateCompetition(comp: CanonicalCompetition): boolean {
    if (!comp.sourceId || !comp.name || !comp.code) {
      this.addError('COMPETITION', comp.sourceId, 'MISSING_FIELDS', 'Competition requires sourceId, name, and code.');
      return false;
    }
    return true;
  }

  /**
   * Validates a CanonicalPlayerStats entity.
   */
  public validatePlayerStats(s: CanonicalPlayerStats): boolean {
    let valid = true;

    if (s.appearances < 0 || s.starts < 0 || s.minutesPlayed < 0) {
      this.addError('PLAYER_STATS', s.sourceId, 'NEGATIVE_PLAYING_TIME', 'Appearances, starts, and minutes must be >= 0.');
      valid = false;
    }

    if (s.starts > s.appearances) {
      this.addError('PLAYER_STATS', s.sourceId, 'STARTS_EXCEED_APPS', `Starts (${s.starts}) exceed appearances (${s.appearances}).`);
      valid = false;
    }

    if (s.shotsOnTarget > s.shots) {
      this.addError('PLAYER_STATS', s.sourceId, 'SOT_EXCEED_SHOTS', `Shots on target (${s.shotsOnTarget}) exceed total shots (${s.shots}).`);
      valid = false;
    }

    return valid;
  }

  /**
   * Validates a CanonicalFixtureResult entity.
   */
  public validateFixtureResult(f: CanonicalFixtureResult): boolean {
    let valid = true;

    if (f.homeScore < 0 || f.awayScore < 0) {
      this.addError('FIXTURE', f.sourceId, 'NEGATIVE_SCORE', `Scores cannot be negative: ${f.homeScore}-${f.awayScore}.`);
      valid = false;
    }

    if (f.homeClubSourceId === f.awayClubSourceId) {
      this.addError('FIXTURE', f.sourceId, 'IDENTICAL_TEAMS', 'Home and away clubs cannot be identical.');
      valid = false;
    }

    if (f.homeScoreHT !== undefined && f.homeScoreHT > f.homeScore) {
      this.addError('FIXTURE', f.sourceId, 'HT_EXCEEDS_FT', `Home HT score (${f.homeScoreHT}) exceeds FT score (${f.homeScore}).`);
      valid = false;
    }

    if (f.awayScoreHT !== undefined && f.awayScoreHT > f.awayScore) {
      this.addError('FIXTURE', f.sourceId, 'HT_EXCEEDS_FT', `Away HT score (${f.awayScoreHT}) exceeds FT score (${f.awayScore}).`);
      valid = false;
    }

    return valid;
  }

  private addError(entityType: string, sourceId: string, rule: string, message: string): void {
    this.errors.push({ entityType, sourceId, rule, message });
  }

  private addWarning(message: string): void {
    this.warnings.push(message);
  }
}
