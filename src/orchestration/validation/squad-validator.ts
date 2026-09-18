// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: SQUAD VALIDATOR & AUTO-SELECTION
// Enforces matchday squad invariants and generates automatic squad selections.
// ─────────────────────────────────────────────────────────────────────────────

import { DomainPlayer, PlayerPosition } from '../../domain/types/player';
import { DomainTactics, PlayerRole, PlayerRoleAssignment } from '../../domain/types/tactics';
import { LineupPlayerAssignment, PlayerEligibilityResult, SquadSelection } from '../types/orchestration.types';
import { InvalidSquadError, PlayerIneligibleError } from '../errors/orchestration.errors';
import { computePositionSuitability } from '../../simulation/engine/player/position-suitability';
import { computeCurrentAbility } from '../../simulation/engine/player/ability-calculator';

export class SquadValidator {
  /**
   * Validates a provided squad selection against all matchday invariants.
   * Throws an InvalidSquadError or PlayerIneligibleError if validation fails.
   */
  public validateSquadSelection(
    clubId: string,
    squad: SquadSelection,
    eligibilityMap: Map<string, PlayerEligibilityResult>
  ): void {
    // 1. Exactly 11 starters
    if (!squad.startingXI || squad.startingXI.length !== 11) {
      throw new InvalidSquadError(
        clubId,
        `Starting XI must contain exactly 11 players. Found: ${squad.startingXI?.length ?? 0}`
      );
    }

    // 2. No duplicate players across starters and bench
    const seenIds = new Set<string>();
    for (const starter of squad.startingXI) {
      if (seenIds.has(starter.playerId)) {
        throw new InvalidSquadError(
          clubId,
          `Duplicate player '${starter.playerId}' in starting XI.`
        );
      }
      seenIds.add(starter.playerId);
    }

    for (const sub of squad.bench || []) {
      if (seenIds.has(sub.playerId)) {
        throw new InvalidSquadError(
          clubId,
          `Player '${sub.playerId}' appears on both starting XI and bench or twice on bench.`
        );
      }
      seenIds.add(sub.playerId);
    }

    // 3. Exactly 1 goalkeeper starting (position 'GK' or role 'GOALKEEPER' / 'SWEEPER_KEEPER')
    const gkCount = squad.startingXI.filter(
      (p) => p.position === 'GK' || p.role === 'GOALKEEPER' || p.role === 'SWEEPER_KEEPER'
    ).length;

    if (gkCount !== 1) {
      throw new InvalidSquadError(
        clubId,
        `Starting XI must contain exactly 1 goalkeeper. Found: ${gkCount}`
      );
    }

    // 4. Eligibility check for every player in the squad selection
    const allAssignments = [...squad.startingXI, ...(squad.bench || [])];
    for (const assignment of allAssignments) {
      const eligibility = eligibilityMap.get(assignment.playerId);
      if (!eligibility) {
        throw new InvalidSquadError(
          clubId,
          `Player '${assignment.playerId}' is not registered to this club.`
        );
      }
      if (!eligibility.isEligible) {
        throw new PlayerIneligibleError(
          assignment.playerId,
          clubId,
          eligibility.reasons
        );
      }
    }
  }

  /**
   * Automatically builds an optimal squad selection for a club when no explicit selection is provided.
   * Matches eligible players to tactical positions using suitability & current ability.
   */
  public autoSelectSquad(
    clubId: string,
    eligiblePlayers: DomainPlayer[],
    tactics: DomainTactics
  ): SquadSelection {
    if (eligiblePlayers.length < 11) {
      throw new InvalidSquadError(
        clubId,
        `Club has fewer than 11 eligible players (${eligiblePlayers.length}). Cannot field a matchday squad.`
      );
    }

    const availablePool = [...eligiblePlayers];
    const startingXI: LineupPlayerAssignment[] = [];
    const usedPlayerIds = new Set<string>();

    // Required roles/positions from tactics (or default 11 if tactics list is non-11)
    const tacticalAssignments: PlayerRoleAssignment[] =
      tactics.playerRoles.length === 11
        ? tactics.playerRoles
        : this.getFallbackAssignments();

    // 1. Assign Goalkeeper first
    const gks = availablePool.filter(
      (p) => p.primaryPosition === 'GK' && !usedPlayerIds.has(p.id)
    );
    
    gks.sort((a, b) => this.getAbility(b) - this.getAbility(a));

    const gkAssignment = tacticalAssignments.find((a) => a.position === 'GK') || {
      position: 'GK' as PlayerPosition,
      role: 'GOALKEEPER' as PlayerRole,
      instructions: [],
      playerId: '',
    };

    let selectedGk: DomainPlayer;
    if (gks.length > 0) {
      selectedGk = gks[0];
    } else {
      // Emergency: pick the highest overall player as GK
      availablePool.sort((a, b) => this.getAbility(b) - this.getAbility(a));
      selectedGk = availablePool[0];
    }

    startingXI.push({
      playerId: selectedGk.id,
      position: 'GK',
      role: gkAssignment.role || 'GOALKEEPER',
      instructions: gkAssignment.instructions || [],
      isStarting: true,
    });
    usedPlayerIds.add(selectedGk.id);

    // 2. Assign outfield positions
    const outfieldAssignments = tacticalAssignments.filter(
      (a) => a.position !== 'GK'
    );

    for (const reqAssignment of outfieldAssignments) {
      const candidates = availablePool.filter((p) => !usedPlayerIds.has(p.id));
      
      let bestPlayer: DomainPlayer | null = null;
      let bestScore = -1;

      for (const p of candidates) {
        const suitability = computePositionSuitability(
          reqAssignment.position,
          p.primaryPosition,
          p.secondaryPositions || []
        );
        const ability = this.getAbility(p);
        const score = suitability * ability;

        if (score > bestScore) {
          bestScore = score;
          bestPlayer = p;
        }
      }

      if (bestPlayer) {
        startingXI.push({
          playerId: bestPlayer.id,
          position: reqAssignment.position,
          role: reqAssignment.role,
          instructions: reqAssignment.instructions || [],
          isStarting: true,
        });
        usedPlayerIds.add(bestPlayer.id);
      }
    }

    // 3. Fill bench with up to 9 remaining eligible players
    const remaining = availablePool.filter((p) => !usedPlayerIds.has(p.id));
    remaining.sort((a, b) => this.getAbility(b) - this.getAbility(a));

    const bench: LineupPlayerAssignment[] = remaining.slice(0, 9).map((p) => ({
      playerId: p.id,
      position: p.primaryPosition,
      role: this.getDefaultRoleForPosition(p.primaryPosition),
      instructions: [],
      isStarting: false,
    }));

    return {
      clubId,
      startingXI,
      bench,
      tactics,
    };
  }

  private getAbility(p: DomainPlayer): number {
    if (!p.attributes) return 50;
    return computeCurrentAbility(p.attributes, p.primaryPosition).currentAbility;
  }

  private getDefaultRoleForPosition(pos: PlayerPosition): PlayerRole {
    switch (pos) {
      case 'GK': return 'GOALKEEPER';
      case 'CB': return 'CENTRAL_DEFENDER';
      case 'LB':
      case 'RB': return 'FULL_BACK';
      case 'LWB':
      case 'RWB': return 'WING_BACK';
      case 'CDM': return 'DEFENSIVE_MIDFIELDER';
      case 'CM': return 'CENTRAL_MIDFIELDER';
      case 'CAM': return 'ATTACKING_MIDFIELDER';
      case 'LM':
      case 'RM': return 'WIDE_MIDFIELDER';
      case 'LW':
      case 'RW': return 'WINGER';
      case 'CF':
      case 'ST': return 'CENTRE_FORWARD';
    }
  }

  private getFallbackAssignments(): PlayerRoleAssignment[] {
    return [
      { playerId: '', position: 'GK', role: 'GOALKEEPER', instructions: [] },
      { playerId: '', position: 'LB', role: 'FULL_BACK', instructions: [] },
      { playerId: '', position: 'CB', role: 'CENTRAL_DEFENDER', instructions: [] },
      { playerId: '', position: 'CB', role: 'CENTRAL_DEFENDER', instructions: [] },
      { playerId: '', position: 'RB', role: 'FULL_BACK', instructions: [] },
      { playerId: '', position: 'CDM', role: 'DEFENSIVE_MIDFIELDER', instructions: [] },
      { playerId: '', position: 'CM', role: 'CENTRAL_MIDFIELDER', instructions: [] },
      { playerId: '', position: 'CM', role: 'BOX_TO_BOX', instructions: [] },
      { playerId: '', position: 'LW', role: 'WINGER', instructions: [] },
      { playerId: '', position: 'ST', role: 'CENTRE_FORWARD', instructions: [] },
      { playerId: '', position: 'RW', role: 'WINGER', instructions: [] },
    ];
  }
}
