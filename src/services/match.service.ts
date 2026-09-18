import { IMatchEngine, MatchSimulationInput, MatchSimulationResult } from '../simulation/models/simulation-contracts';
import { TypeScriptMatchEngine } from '../simulation/adapters/typescript-engine.adapter';
import { MatchdayOrchestrator } from '../orchestration/matchday-orchestrator';
import { MatchdayOptions, OrchestratedMatchResult } from '../orchestration/types/orchestration.types';

/**
 * Application Service for managing match simulation execution and matchday orchestration.
 * Decouples the UI and API endpoints from the specific IMatchEngine implementation.
 */
export class MatchService {
  private matchEngine: IMatchEngine;
  private orchestrator: MatchdayOrchestrator;

  constructor(engine?: IMatchEngine) {
    // Default to TypeScriptMatchEngine, configurable via Dependency Injection
    this.matchEngine = engine || new TypeScriptMatchEngine();
    this.orchestrator = new MatchdayOrchestrator(this.matchEngine);
  }

  /**
   * Sets or swaps the active simulation engine implementation (e.g. TypeScript vs Python ML).
   */
  public setEngine(engine: IMatchEngine): void {
    this.matchEngine = engine;
    this.orchestrator.setEngine(engine);
  }

  /**
   * Executes pure match simulation without persistence (low-level engine boundary).
   */
  public async executeMatchSimulation(input: MatchSimulationInput): Promise<MatchSimulationResult> {
    return await this.matchEngine.simulateMatch(input);
  }

  /**
   * Orchestrates a complete matchday flow for a fixture (high-level application use case).
   * Resolves squads, validates eligibility, executes simulation, and persists results atomically.
   */
  public async orchestrateMatchday(options: MatchdayOptions): Promise<OrchestratedMatchResult> {
    return await this.orchestrator.orchestrateMatchday(options);
  }
}
