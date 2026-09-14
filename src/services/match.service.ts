import { IMatchEngine, MatchSimulationInput, MatchSimulationResult } from '../simulation/models/simulation-contracts';
import { TypeScriptMatchEngine } from '../simulation/adapters/typescript-engine.adapter';

/**
 * Application Service for managing match simulation execution.
 * Decouples the UI and API endpoints from the specific IMatchEngine implementation.
 */
export class MatchService {
  private matchEngine: IMatchEngine;

  constructor(engine?: IMatchEngine) {
    // Default to TypeScriptMatchEngine, configurable via Dependency Injection
    this.matchEngine = engine || new TypeScriptMatchEngine();
  }

  /**
   * Sets or swaps the active simulation engine implementation (e.g. TypeScript vs Python ML).
   */
  public setEngine(engine: IMatchEngine): void {
    this.matchEngine = engine;
  }

  /**
   * Executes match simulation and returns the authoritative match result.
   */
  public async executeMatchSimulation(input: MatchSimulationInput): Promise<MatchSimulationResult> {
    return await this.matchEngine.simulateMatch(input);
  }
}
