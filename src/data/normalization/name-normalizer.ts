// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: NAME NORMALIZER
// Removes diacritics, standardizes club suffixes, and cleans entity strings.
// ─────────────────────────────────────────────────────────────────────────────

export class NameNormalizer {
  /**
   * Normalizes a string by stripping accents/diacritics, removing extraneous whitespace,
   * and converting to lower case for comparison.
   */
  public static toComparableKey(name: string): string {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ') // replace non-alphanumerics with space
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalizes a club name by cleaning common corporate/legal suffixes (FC, CF, etc.)
   * for entity matching.
   */
  public static normalizeClubName(clubName: string): string {
    const key = this.toComparableKey(clubName);
    // Remove standard club prefixes/suffixes for matching
    return key
      .replace(/\b(football club|fc|cf|afc|ac|sc|ssc|bsc|as|vfb|rb|tsv)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parses and cleans a player's full name into first, last, and short name components.
   */
  public static parsePlayerName(rawName: string): {
    firstName: string;
    lastName: string;
    shortName: string;
  } {
    const cleaned = rawName.trim().replace(/\s+/g, ' ');
    const parts = cleaned.split(' ');

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        lastName: parts[0],
        shortName: parts[0],
      };
    }

    const firstName = parts.slice(0, -1).join(' ');
    const lastName = parts[parts.length - 1];
    const shortName = `${parts[0].charAt(0)}. ${lastName}`;

    return {
      firstName,
      lastName,
      shortName,
    };
  }
}
