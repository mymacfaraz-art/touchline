// ─────────────────────────────────────────────────────────────────────────────
// TYPESCRIPT MATCH ENGINE — Phase 3 Implementation
//
// Pure TypeScript statistical simulation engine.
// Implements the IMatchEngine boundary contract.
//
// This engine replaces the Phase 2 foundation stub.
// Version: ts-statistical-v1@2.0.0
//
// All simulation logic lives in the engine/ directory.
// This adapter is a thin wrapper that:
//   1. Delegates to runMatch()
//   2. Validates the result via validateSimulationResult()
//   3. Returns the frozen, immutable MatchSimulationResult
// ─────────────────────────────────────────────────────────────────────────────

import {
  IMatchEngine,
  MatchSimulationInput,
  MatchSimulationResult,
} from '../models/simulation-contracts';
import { runMatch, MATCH_ENGINE_ID, MATCH_ENGINE_VERSION } from '../engine/match-runner';
import { validateSimulationResult } from '../result-validator';

/**
 * Phase 3 TypeScript Match Engine.
 *
 * Produces fully deterministic, attribute-driven simulation results.
 * Seeded RNG ensures reproducibility. Validates all results before returning.
 *
 * Usage:
 *   const engine = new TypeScriptMatchEngine();
 *   const result = engine.simulateMatch(input);
 *
 * The same input + seed always produces the same result.
 */
export class TypeScriptMatchEngine implements IMatchEngine {
  public readonly engineId = MATCH_ENGINE_ID;
  public readonly version = MATCH_ENGINE_VERSION;

  /**
   * Simulates a football match and returns a validated result.
   *
   * @throws {SimulationValidationError} if the result fails any invariant check
   */
  public simulateMatch(input: MatchSimulationInput): MatchSimulationResult {
    // Run the full simulation
    const result = runMatch(input);

    // Validate the result before returning to the caller
    validateSimulationResult(result);

    return result;
  }
}
