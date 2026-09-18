// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: MATCHDAY ORCHESTRATION ERRORS
// Strongly-typed application domain errors for matchday execution.
// ─────────────────────────────────────────────────────────────────────────────

export class MatchdayOrchestrationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MatchdayOrchestrationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FixtureNotFoundError extends MatchdayOrchestrationError {
  constructor(fixtureId: string) {
    super(`Fixture with ID '${fixtureId}' was not found.`, 'FIXTURE_NOT_FOUND');
    this.name = 'FixtureNotFoundError';
  }
}

export class FixtureAlreadyCompletedError extends MatchdayOrchestrationError {
  constructor(fixtureId: string) {
    super(`Fixture '${fixtureId}' has already been completed and cannot be re-simulated.`, 'FIXTURE_ALREADY_COMPLETED');
    this.name = 'FixtureAlreadyCompletedError';
  }
}

export class FixtureNotPlayableError extends MatchdayOrchestrationError {
  constructor(fixtureId: string, reason: string) {
    super(`Fixture '${fixtureId}' is not in a playable state: ${reason}`, 'FIXTURE_NOT_PLAYABLE');
    this.name = 'FixtureNotPlayableError';
  }
}

export class InvalidSquadError extends MatchdayOrchestrationError {
  constructor(clubId: string, reason: string) {
    super(`Invalid squad selection for club '${clubId}': ${reason}`, 'INVALID_SQUAD');
    this.name = 'InvalidSquadError';
  }
}

export class PlayerIneligibleError extends MatchdayOrchestrationError {
  constructor(playerId: string, clubId: string, reasons: string[]) {
    super(`Player '${playerId}' is ineligible for club '${clubId}': ${reasons.join(', ')}`, 'PLAYER_INELIGIBLE');
    this.name = 'PlayerIneligibleError';
  }
}

export class MatchSimulationFailedError extends MatchdayOrchestrationError {
  constructor(fixtureId: string, cause: string) {
    super(`Match simulation failed for fixture '${fixtureId}': ${cause}`, 'SIMULATION_FAILED');
    this.name = 'MatchSimulationFailedError';
  }
}

export class MatchPersistenceError extends MatchdayOrchestrationError {
  constructor(fixtureId: string, cause: string) {
    super(`Failed to persist match result for fixture '${fixtureId}': ${cause}`, 'PERSISTENCE_FAILED');
    this.name = 'MatchPersistenceError';
  }
}
