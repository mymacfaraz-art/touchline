// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: MATCHDAY ORCHESTRATOR SERVICE
// Central application use-case entry point connecting Phase 2 persistent world
// state to Phase 3 match simulation engine.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { IMatchEngine } from '../simulation/models/simulation-contracts';
import { TypeScriptMatchEngine } from '../simulation/adapters/typescript-engine.adapter';
import { validateSimulationResult, SimulationValidationError } from '../simulation/result-validator';
import { SquadResolver } from './resolvers/squad-resolver';
import { TacticsResolver } from './resolvers/tactics-resolver';
import { SquadValidator } from './validation/squad-validator';
import { SimulationInputBuilder } from './input-builder/simulation-input-builder';
import { MatchResultPersister } from './persistence/match-result-persister';
import { generateMatchSeed } from './seed/seed-generator';
import {
  MatchdayOptions,
  OrchestratedMatchResult,
  SquadSelection,
} from './types/orchestration.types';
import {
  FixtureAlreadyCompletedError,
  FixtureNotFoundError,
  FixtureNotPlayableError,
  MatchSimulationFailedError,
} from './errors/orchestration.errors';

export class MatchdayOrchestrator {
  private squadResolver: SquadResolver;
  private tacticsResolver: TacticsResolver;
  private squadValidator: SquadValidator;
  private inputBuilder: SimulationInputBuilder;
  private persister: MatchResultPersister;
  private matchEngine: IMatchEngine;

  constructor(engine?: IMatchEngine) {
    this.squadResolver = new SquadResolver();
    this.tacticsResolver = new TacticsResolver();
    this.squadValidator = new SquadValidator();
    this.inputBuilder = new SimulationInputBuilder();
    this.persister = new MatchResultPersister();
    this.matchEngine = engine || new TypeScriptMatchEngine();
  }

  /**
   * Sets or swaps the active match simulation engine (e.g. for testing or ML engines).
   */
  public setEngine(engine: IMatchEngine): void {
    this.matchEngine = engine;
  }

  /**
   * Primary entry point: Executes end-to-end matchday orchestration for a given fixture.
   */
  public async orchestrateMatchday(
    options: MatchdayOptions
  ): Promise<OrchestratedMatchResult> {
    const { fixtureId, seedOverride, neutralVenue } = options;

    // 1. Load Fixture & Context
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        competitionPhase: {
          include: {
            competitionSeason: {
              include: {
                gameSeason: true,
              },
            },
          },
        },
        homeClub: true,
        awayClub: true,
        match: true,
      },
    });

    if (!fixture) {
      throw new FixtureNotFoundError(fixtureId);
    }

    if (fixture.status === 'COMPLETED' || fixture.match) {
      throw new FixtureAlreadyCompletedError(fixtureId);
    }

    if (fixture.status !== 'SCHEDULED') {
      throw new FixtureNotPlayableError(fixtureId, `Status is '${fixture.status}'.`);
    }

    const gameSeasonId = fixture.competitionPhase.competitionSeason.gameSeasonId;
    const competitionSeasonId = fixture.competitionPhase.competitionSeasonId;
    const phaseType = fixture.competitionPhase.phaseType;
    const matchDate = fixture.matchDate;

    // 2. Resolve Home & Away Squads
    const homeSquadData = await this.squadResolver.resolveClubSquad(
      fixture.homeClubId,
      gameSeasonId,
      competitionSeasonId,
      matchDate
    );

    const awaySquadData = await this.squadResolver.resolveClubSquad(
      fixture.awayClubId,
      gameSeasonId,
      competitionSeasonId,
      matchDate
    );

    // 3. Resolve Home & Away Tactics
    const homeTactics =
      options.homeSquadSelection?.tactics ||
      (await this.tacticsResolver.resolveClubTactics(fixture.homeClubId));

    const awayTactics =
      options.awaySquadSelection?.tactics ||
      (await this.tacticsResolver.resolveClubTactics(fixture.awayClubId));

    // 4. Resolve & Validate Squad Selections
    let homeSquadSelection: SquadSelection;
    if (options.homeSquadSelection) {
      this.squadValidator.validateSquadSelection(
        fixture.homeClubId,
        options.homeSquadSelection,
        homeSquadData.eligibilityMap
      );
      homeSquadSelection = options.homeSquadSelection;
    } else {
      homeSquadSelection = this.squadValidator.autoSelectSquad(
        fixture.homeClubId,
        homeSquadData.players.filter(
          (p) => homeSquadData.eligibilityMap.get(p.id)?.isEligible
        ),
        homeTactics
      );
    }

    let awaySquadSelection: SquadSelection;
    if (options.awaySquadSelection) {
      this.squadValidator.validateSquadSelection(
        fixture.awayClubId,
        options.awaySquadSelection,
        awaySquadData.eligibilityMap
      );
      awaySquadSelection = options.awaySquadSelection;
    } else {
      awaySquadSelection = this.squadValidator.autoSelectSquad(
        fixture.awayClubId,
        awaySquadData.players.filter(
          (p) => awaySquadData.eligibilityMap.get(p.id)?.isEligible
        ),
        awayTactics
      );
    }

    // 5. Generate Deterministic Seed
    const seed = generateMatchSeed(fixtureId, gameSeasonId, seedOverride);

    // 6. Build MatchSimulationInput
    const homePlayersMap = new Map(homeSquadData.players.map((p) => [p.id, p]));
    const awayPlayersMap = new Map(awaySquadData.players.map((p) => [p.id, p]));

    const simulationInput = this.inputBuilder.buildSimulationInput({
      matchId: fixtureId,
      seed,
      competitionSeasonId,
      competitionPhaseId: fixture.competitionPhaseId,
      homeClubName: fixture.homeClub.name,
      awayClubName: fixture.awayClub.name,
      homeSquadSelection,
      awaySquadSelection,
      homePlayersMap,
      awayPlayersMap,
      homeConditionsMap: homeSquadData.playerConditions,
      awayConditionsMap: awaySquadData.playerConditions,
      homeTactics,
      awayTactics,
      neutralVenue: neutralVenue ?? fixture.isNeutralVenue,
    });

    // 7. Invoke Phase 3 Engine
    let simulationResult;
    try {
      simulationResult = await this.matchEngine.simulateMatch(simulationInput);
    } catch (err: any) {
      throw new MatchSimulationFailedError(fixtureId, err.message || String(err));
    }

    // 8. Validate Simulation Output Invariants
    try {
      validateSimulationResult(simulationResult);
    } catch (err) {
      if (err instanceof SimulationValidationError) {
        throw new MatchSimulationFailedError(
          fixtureId,
          `Result validation failed (${err.rule}): ${err.detail}`
        );
      }
      throw err;
    }

    // 9. Persist Authoritative Result Atomically
    const persisted = await this.persister.persistMatchResult({
      fixtureId,
      gameSeasonId,
      competitionSeasonId,
      phaseType,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeTactics,
      awayTactics,
      homeSquad: homeSquadSelection,
      awaySquad: awaySquadSelection,
      simulationResult,
    });

    return {
      fixtureId,
      matchId: persisted.matchId,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeScore: simulationResult.homeScore,
      awayScore: simulationResult.awayScore,
      homeScoreHT: simulationResult.homeScoreHT,
      awayScoreHT: simulationResult.awayScoreHT,
      seed: String(seed),
      simulatedAt: new Date(simulationResult.executedAt),
      simulationResult,
      persistenceSuccess: true,
    };
  }
}
