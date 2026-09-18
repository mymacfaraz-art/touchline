// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: LLM NARRATIVE LAYER & GROUNDING SERVICE
// Authoritative fact-grounded narrative generation with template fallback
// ─────────────────────────────────────────────────────────────────────────────

import { INarrativeProvider, NarrativeContext } from '../domain/types/advanced-ai';

export class NarrativeService implements INarrativeProvider {
  /**
   * Generates a grounded match report based strictly on authoritative facts.
   * Uses template fallback if no LLM provider is connected (`NO_NARRATIVE_PROVIDER`).
   */
  public async generateMatchReport(context: NarrativeContext): Promise<{
    headline: string;
    summary: string;
    managerQuote: string;
    sourceType: string;
  }> {
    const { headlineFacts } = context;
    const { homeTeamName, awayTeamName, homeScore, awayScore, keyEvents } = headlineFacts;

    const winner =
      homeScore > awayScore
        ? homeTeamName
        : awayScore > homeScore
        ? awayTeamName
        : null;

    const headline = winner
      ? `${winner} Secure Victory in ${homeScore}–${awayScore} Thriller`
      : `${homeTeamName} and ${awayTeamName} Share Points in ${homeScore}–${awayScore} Draw`;

    const goalEvents = keyEvents.filter((e) => e.kind === 'GOAL' || e.kind === 'PENALTY_GOAL');
    const goalSummary =
      goalEvents.length > 0
        ? goalEvents.map((g) => `${g.playerShortName || 'Goal'} (${g.minute}')`).join(', ')
        : 'No goals recorded.';

    const summary = `In a tightly contested fixture, ${homeTeamName} faced ${awayTeamName} resulting in a final score of ${homeScore}–${awayScore}. Key scoring moments: ${goalSummary}.`;

    const managerQuote = winner
      ? `"I am delighted with the character shown by our players today. We executed our gameplan under pressure."`
      : `"A hard-fought point. Both teams created opportunities, and a draw is a fair reflection of the match."`;

    return {
      headline,
      summary,
      managerQuote,
      sourceType: 'DETERMINISTIC_TEMPLATE_FALLBACK',
    };
  }
}
