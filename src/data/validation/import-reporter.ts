// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: IMPORT REPORTER
// Generates observable, structured audit summaries for data ingestion batches.
// ─────────────────────────────────────────────────────────────────────────────

import { ImportReport } from '../types/data-foundation.types';

export class ImportReporter {
  public static formatReport(report: ImportReport): string {
    const lines: string[] = [
      `============================================================`,
      `TOUCHLINE DATA INGESTION REPORT`,
      `============================================================`,
      `Batch ID:         ${report.batchId}`,
      `Source:           ${report.sourceCode}`,
      `Dataset Version:  ${report.datasetVersion}`,
      `Execution Time:   ${report.startedAt.toISOString()} -> ${report.completedAt.toISOString()}`,
      `Idempotent Run:   ${report.isIdempotentRun ? 'YES (No duplicates created)' : 'INITIAL IMPORT'}`,
      `------------------------------------------------------------`,
      `ENTITIES IMPORTED:`,
      `  - Countries:     ${report.counts.countries}`,
      `  - Competitions:  ${report.counts.competitions}`,
      `  - Clubs:         ${report.counts.clubs}`,
      `  - Players:       ${report.counts.players}`,
      `  - Registrations: ${report.counts.registrations}`,
      `  - Player Stats:  ${report.counts.playerStats}`,
      `  - Fixtures:      ${report.counts.fixtures}`,
      `------------------------------------------------------------`,
      `QUALITY METRICS:`,
      `  - Duplicates Detected:  ${report.duplicatesDetected}`,
      `  - Duplicates Resolved:  ${report.duplicatesResolved}`,
      `  - Unresolved Entities:  ${report.unresolvedEntities}`,
      `  - Validation Errors:    ${report.validationErrors.length}`,
      `  - Warnings Logged:      ${report.warnings.length}`,
      `============================================================`,
    ];

    if (report.validationErrors.length > 0) {
      lines.push('ERRORS ENCOUNTERED:');
      report.validationErrors.slice(0, 10).forEach((err, idx) => {
        lines.push(`  [${idx + 1}] ${err}`);
      });
      if (report.validationErrors.length > 10) {
        lines.push(`  ...and ${report.validationErrors.length - 10} more errors.`);
      }
    }

    return lines.join('\n');
  }
}
