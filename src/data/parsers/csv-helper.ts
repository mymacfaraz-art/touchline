// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: CSV PARSER HELPER
// Robust RFC 4180 compliant CSV parser supporting quoted cells, multi-line values,
// and typed conversion without external dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export interface CsvRow {
  [columnName: string]: string;
}

export class CsvHelper {
  public static parseCsv(csvText: string): CsvRow[] {
    const lines = this.splitCsvLines(csvText.trim());
    if (lines.length === 0) return [];

    const headers = this.parseCsvRow(lines[0]);
    const results: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = this.parseCsvRow(line);
      const row: CsvRow = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cells[j] !== undefined ? cells[j] : '';
      }

      results.push(row);
    }

    return results;
  }

  private static splitCsvLines(text: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        lines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += char;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  private static parseCsvRow(rowLine: string): string[] {
    const cells: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < rowLine.length; i++) {
      const char = rowLine[i];

      if (char === '"') {
        if (insideQuotes && rowLine[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    cells.push(currentCell.trim());
    return cells;
  }

  public static parseNumber(val: string | undefined, fallback: number = 0): number {
    if (!val || val.trim() === '' || val.toLowerCase() === 'none' || val.toLowerCase() === 'null') {
      return fallback;
    }
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  }

  public static parseString(val: string | undefined, fallback: string = ''): string {
    if (!val || val.toLowerCase() === 'none' || val.toLowerCase() === 'null') {
      return fallback;
    }
    return val.trim();
  }
}
