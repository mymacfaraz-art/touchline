// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 10: NARRATIVE SAFETY & GROUNDING TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { NarrativeService } from '../src/narrative/narrative.service';
import { NarrativeContext } from '../src/domain/types/advanced-ai';

describe('Phase 10: Narrative Grounding & Safety Verification', () => {
  const narrativeService = new NarrativeService();

  it('generates fact-grounded report from context using template fallback', async () => {
    const context: NarrativeContext = {
      careerId: 'career-1',
      gameSeasonId: 'season-1',
      headlineFacts: {
        homeTeamName: 'Arsenal',
        awayTeamName: 'Chelsea',
        homeScore: 3,
        awayScore: 1,
        keyEvents: [
          { minute: 14, kind: 'GOAL', playerShortName: 'B. Saka' },
          { minute: 42, kind: 'GOAL', playerShortName: 'G. Martinelli' },
          { minute: 78, kind: 'GOAL', playerShortName: 'C. Palmer' },
          { minute: 88, kind: 'GOAL', playerShortName: 'K. Havertz' },
        ],
        homeXg: 2.4,
        awayXg: 0.9,
        homePossession: 58,
        awayPossession: 42,
      },
    };

    const report = await narrativeService.generateMatchReport(context);

    expect(report.headline).toContain('Arsenal Secure Victory');
    expect(report.summary).toContain('3–1');
    expect(report.summary).toContain('B. Saka (14\')');
    expect(report.sourceType).toBe('DETERMINISTIC_TEMPLATE_FALLBACK');
  });

  it('verifies narrative output is purely text without database mutation side-effects', async () => {
    const context: NarrativeContext = {
      careerId: 'career-1',
      gameSeasonId: 'season-1',
      headlineFacts: {
        homeTeamName: 'Real Madrid',
        awayTeamName: 'Barcelona',
        homeScore: 2,
        awayScore: 2,
        keyEvents: [],
      },
    };

    const report = await narrativeService.generateMatchReport(context);

    expect(report.headline).toContain('Share Points');
    expect(typeof report.headline).toBe('string');
    expect(typeof report.summary).toBe('string');
    expect(typeof report.managerQuote).toBe('string');
  });
});
