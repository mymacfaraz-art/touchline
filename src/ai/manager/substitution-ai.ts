// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: AI SUBSTITUTION ENGINE
// Intelligent, rules-based substitution selection based on fatigue, cards & performance
// ─────────────────────────────────────────────────────────────────────────────

export interface SubstitutionCandidate {
  playerOutId: string;
  playerInId: string;
  reason: string;
  score: number;
}

export interface PlayerOnPitchState {
  playerId: string;
  position: string;
  fitness: number;
  fatigue: number;
  yellowCards: number;
  rating: number;
  isInjured: boolean;
}

export interface BenchPlayerState {
  playerId: string;
  position: string;
  fitness: number;
  overallRating: number;
  isAvailable: boolean;
}

export class SubstitutionAIService {
  /**
   * Evaluates the best substitution option for a team during a match.
   * Respects remaining substitutions, player availability, and position compatibility.
   */
  public static selectBestSubstitution(params: {
    playersOnPitch: PlayerOnPitchState[];
    benchPlayers: BenchPlayerState[];
    remainingSubs: number;
    minute: number;
  }): SubstitutionCandidate | null {
    const { playersOnPitch, benchPlayers, remainingSubs, minute } = params;

    if (remainingSubs <= 0 || benchPlayers.length === 0) {
      return null;
    }

    const availableBench = benchPlayers.filter((b) => b.isAvailable);
    if (availableBench.length === 0) {
      return null;
    }

    let bestCandidate: SubstitutionCandidate | null = null;
    let highestPriorityScore = -1;

    for (const playerOut of playersOnPitch) {
      // Urgent triggers: Injury or Fatigue > 80 or Red card risk (yellow card + high aggression/fatigue) or poor rating < 5.5 after min 60
      let needsSub = false;
      let reason = '';
      let baseUrgency = 0;

      if (playerOut.isInjured) {
        needsSub = true;
        reason = `Forced sub: ${playerOut.playerId} injured`;
        baseUrgency = 100;
      } else if (playerOut.fatigue > 75 || playerOut.fitness < 40) {
        needsSub = true;
        reason = `Fatigue sub: ${playerOut.playerId} exhausted (fatigue ${playerOut.fatigue}%)`;
        baseUrgency = 80;
      } else if (playerOut.yellowCards >= 1 && playerOut.fatigue > 55 && minute >= 55) {
        needsSub = true;
        reason = `Card risk sub: ${playerOut.playerId} on yellow card`;
        baseUrgency = 65;
      } else if (minute >= 65 && playerOut.rating < 5.5) {
        needsSub = true;
        reason = `Tactical sub: Poor rating (${playerOut.rating.toFixed(1)})`;
        baseUrgency = 50;
      }

      if (!needsSub) continue;

      // Find best bench replacement matching position
      const exactPosMatch = availableBench.find((b) => b.position === playerOut.position);
      const replacement = exactPosMatch || availableBench.sort((a, b) => b.overallRating - a.overallRating)[0];

      if (replacement) {
        const candidateScore = baseUrgency + replacement.overallRating * 0.1;
        if (candidateScore > highestPriorityScore) {
          highestPriorityScore = candidateScore;
          bestCandidate = {
            playerOutId: playerOut.playerId,
            playerInId: replacement.playerId,
            reason,
            score: candidateScore,
          };
        }
      }
    }

    return bestCandidate;
  }
}
