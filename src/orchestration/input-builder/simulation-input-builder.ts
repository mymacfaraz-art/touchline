// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: SIMULATION INPUT BUILDER
// Translates domain entities and squad selections into MatchSimulationInput.
// ─────────────────────────────────────────────────────────────────────────────

import { DomainPlayer, PlayerCondition } from '../../domain/types/player';
import { DomainTactics } from '../../domain/types/tactics';
import {
  MatchSimulationInput,
  PlayerSimulationState,
  TeamSimulationState,
} from '../../simulation/models/simulation-contracts';
import { SquadSelection } from '../types/orchestration.types';

export class SimulationInputBuilder {
  /**
   * Assembles a complete, strictly-typed MatchSimulationInput struct for Phase 3 engine.
   */
  public buildSimulationInput(params: {
    matchId: string;
    seed: string | number;
    competitionSeasonId: string;
    competitionPhaseId: string;
    homeClubName: string;
    awayClubName: string;
    homeSquadSelection: SquadSelection;
    awaySquadSelection: SquadSelection;
    homePlayersMap: Map<string, DomainPlayer>;
    awayPlayersMap: Map<string, DomainPlayer>;
    homeConditionsMap: Map<string, PlayerCondition>;
    awayConditionsMap: Map<string, PlayerCondition>;
    homeTactics: DomainTactics;
    awayTactics: DomainTactics;
    neutralVenue?: boolean;
  }): MatchSimulationInput {
    const homeTeam = this.buildTeamSimulationState({
      teamId: params.homeSquadSelection.clubId,
      clubName: params.homeClubName,
      isHomeTeam: true,
      tactics: params.homeTactics,
      squadSelection: params.homeSquadSelection,
      playersMap: params.homePlayersMap,
      conditionsMap: params.homeConditionsMap,
    });

    const awayTeam = this.buildTeamSimulationState({
      teamId: params.awaySquadSelection.clubId,
      clubName: params.awayClubName,
      isHomeTeam: false,
      tactics: params.awayTactics,
      squadSelection: params.awaySquadSelection,
      playersMap: params.awayPlayersMap,
      conditionsMap: params.awayConditionsMap,
    });

    return {
      matchId: params.matchId,
      seed: params.seed,
      competitionSeasonId: params.competitionSeasonId,
      competitionPhaseId: params.competitionPhaseId,
      homeTeam,
      awayTeam,
      neutralVenue: params.neutralVenue ?? false,
    };
  }

  private buildTeamSimulationState(params: {
    teamId: string;
    clubName: string;
    isHomeTeam: boolean;
    tactics: DomainTactics;
    squadSelection: SquadSelection;
    playersMap: Map<string, DomainPlayer>;
    conditionsMap: Map<string, PlayerCondition>;
  }): TeamSimulationState {
    const startingXI: PlayerSimulationState[] = params.squadSelection.startingXI.map(
      (assignment) => {
        const player = params.playersMap.get(assignment.playerId);
        if (!player) {
          throw new Error(`Player '${assignment.playerId}' not found in team pool.`);
        }
        const condition = params.conditionsMap.get(assignment.playerId) || this.getDefaultCondition(assignment.playerId);

        return {
          player,
          assignedPosition: assignment.position,
          assignedRole: assignment.role,
          isStarting: true,
          fitness: condition.fitness,
          morale: condition.morale,
          form: condition.form,
          sharpness: condition.sharpness,
          fatigue: condition.fatigue,
          confidence: condition.confidence,
          tacticalFamiliarity: condition.tacticalFamiliarity,
          isInjured: false,
          isSuspended: false,
        };
      }
    );

    const bench: PlayerSimulationState[] = (params.squadSelection.bench || []).map(
      (assignment) => {
        const player = params.playersMap.get(assignment.playerId);
        if (!player) {
          throw new Error(`Player '${assignment.playerId}' not found in team pool.`);
        }
        const condition = params.conditionsMap.get(assignment.playerId) || this.getDefaultCondition(assignment.playerId);

        return {
          player,
          assignedPosition: assignment.position,
          assignedRole: assignment.role,
          isStarting: false,
          fitness: condition.fitness,
          morale: condition.morale,
          form: condition.form,
          sharpness: condition.sharpness,
          fatigue: condition.fatigue,
          confidence: condition.confidence,
          tacticalFamiliarity: condition.tacticalFamiliarity,
          isInjured: false,
          isSuspended: false,
        };
      }
    );

    // Calculate team form rating average
    const allConditions = Array.from(params.conditionsMap.values());
    const recentFormRating =
      allConditions.length > 0
        ? Math.round(
            allConditions.reduce((acc, c) => acc + c.form, 0) / allConditions.length
          )
        : 50;

    return {
      teamId: params.teamId,
      clubName: params.clubName,
      isHomeTeam: params.isHomeTeam,
      tactics: params.tactics,
      startingXI,
      bench,
      teamCohesion: 70,
      recentFormRating,
    };
  }

  private getDefaultCondition(playerId: string): PlayerCondition {
    return {
      playerId,
      gameSeasonId: '',
      fitness: 100,
      fatigue: 0,
      morale: 75,
      confidence: 75,
      sharpness: 75,
      form: 50,
      tacticalFamiliarity: 50,
    };
  }
}
