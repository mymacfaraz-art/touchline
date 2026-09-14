import { 
  IMatchEngine, 
  MatchSimulationInput, 
  MatchSimulationResult 
} from '../models/simulation-contracts';

/**
 * Extension Point Adapter for future Python ML / Microservice simulation engines.
 * Satisfies the IMatchEngine contract so the rest of the application can seamlessly
 * switch engines without modifying application services or UI components.
 */
export class PythonMLMatchEngine implements IMatchEngine {
  public readonly engineId = 'python-ml-v1';
  public readonly version = '0.0.0-placeholder';

  private readonly endpointUrl?: string;

  constructor(endpointUrl?: string) {
    this.endpointUrl = endpointUrl;
  }

  public async simulateMatch(input: MatchSimulationInput): Promise<MatchSimulationResult> {
    if (!this.endpointUrl) {
      throw new Error(
        'PythonMLMatchEngine adapter initialized without endpoint URL. ' +
        'This extension point requires a configured Python ML service URL.'
      );
    }

    // Future implementation will delegate to external Python ML service HTTP/gRPC client
    throw new Error(`Python ML Service at ${this.endpointUrl} is not connected in this foundation phase.`);
  }
}
