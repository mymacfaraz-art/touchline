// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: PRESS CONFERENCE SERVICE
// Context-driven media interviews with structured game-rule outcome processing
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../../lib/prisma';

export interface PressQuestionOption {
  optionId: string;
  text: string;
  boardImpact: number;
  moraleImpact: number;
}

export interface PressQuestion {
  questionId: string;
  prompt: string;
  options: PressQuestionOption[];
}

export class PressConferenceService {
  /**
   * Generates press conference questions based on match context.
   */
  public async generatePressConference(params: {
    matchId: string;
    homeClubId: string;
    awayClubId: string;
    homeScore: number;
    awayScore: number;
  }): Promise<PressQuestion[]> {
    const { homeScore, awayScore } = params;

    const isWin = homeScore > awayScore;
    const prompt = isWin
      ? 'Congratulations on the victory today. What key factor drove your team to win?'
      : 'That was a tough result today. How will you respond in the next fixture?';

    return [
      {
        questionId: 'q-match-reaction',
        prompt,
        options: [
          {
            optionId: 'opt-praise-squad',
            text: 'The squad executed our strategy brilliantly and worked hard.',
            boardImpact: 2,
            moraleImpact: 5,
          },
          {
            optionId: 'opt-stay-focused',
            text: 'We take it one game at a time. The work continues tomorrow.',
            boardImpact: 1,
            moraleImpact: 2,
          },
          {
            optionId: 'opt-critical',
            text: 'Individual errors cost us today. We need higher standards.',
            boardImpact: -1,
            moraleImpact: -4,
          },
        ],
      },
    ];
  }

  /**
   * Processes manager's selected response and applies explicit game rule updates.
   */
  public async submitResponse(params: {
    clubId: string;
    gameSeasonId: string;
    optionSelected: PressQuestionOption;
  }) {
    const { clubId, gameSeasonId, optionSelected } = params;

    const clubState = await prisma.clubSeasonState.findUnique({
      where: { clubId_gameSeasonId: { clubId, gameSeasonId } },
    });

    if (clubState) {
      await prisma.clubSeasonState.update({
        where: { id: clubState.id },
        data: {
          boardConfidence: Math.max(0, Math.min(100, clubState.boardConfidence + optionSelected.boardImpact)),
          squadMorale: Math.max(0, Math.min(100, clubState.squadMorale + optionSelected.moraleImpact)),
        },
      });
    }

    return {
      success: true,
      appliedBoardImpact: optionSelected.boardImpact,
      appliedMoraleImpact: optionSelected.moraleImpact,
    };
  }
}
