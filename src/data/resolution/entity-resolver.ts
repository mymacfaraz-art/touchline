// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: ENTITY RESOLVER
// Deterministic deduplication, alias resolution, and entity reconciliation.
// Enforces strict confidence thresholds and marks ambiguous entities.
// ─────────────────────────────────────────────────────────────────────────────

import { NameNormalizer } from '../normalization/name-normalizer';
import { CLUB_ALIASES, COMPETITION_ALIASES } from './aliases';
import { CanonicalClub, CanonicalPlayer } from '../types/data-foundation.types';

export interface PlayerResolutionResult {
  player: CanonicalPlayer | null;
  confidence: number;
  matchType: 'SOURCE_ID' | 'SIGNATURE_MATCH' | 'NAME_CLUB_MATCH' | 'ALIAS_MATCH' | 'UNRESOLVED';
  isAmbiguous?: boolean;
  notes?: string;
}

export class EntityResolver {
  private clubCodeMap = new Map<string, CanonicalClub>();
  private clubNameMap = new Map<string, CanonicalClub>();
  private playerMap = new Map<string, CanonicalPlayer>(); // keyed by signature: name + dob + nat
  private playerNameMap = new Map<string, CanonicalPlayer[]>(); // keyed by normalized name
  private playerSourceIdMap = new Map<string, CanonicalPlayer>(); // keyed by sourceId

  /**
   * Registers an authoritative canonical club in the resolver cache.
   */
  public registerClub(club: CanonicalClub): void {
    this.clubCodeMap.set(club.code.toUpperCase(), club);
    const normalized = NameNormalizer.toComparableKey(club.name);
    this.clubNameMap.set(normalized, club);

    if (club.shortName) {
      this.clubNameMap.set(NameNormalizer.toComparableKey(club.shortName), club);
    }
    if (club.aliases) {
      for (const alias of club.aliases) {
        this.clubNameMap.set(NameNormalizer.toComparableKey(alias), club);
      }
    }
  }

  /**
   * Resolves a club name or code against known canonical clubs and aliases.
   */
  public resolveClub(rawNameOrCode: string): {
    club: CanonicalClub | null;
    confidence: number;
    matchType: 'EXACT_CODE' | 'EXACT_NAME' | 'ALIAS' | 'NORMALIZED' | 'UNRESOLVED';
  } {
    const trimmed = rawNameOrCode.trim();

    // 1. Check exact 3-letter / short code
    const byCode = this.clubCodeMap.get(trimmed.toUpperCase());
    if (byCode) {
      return { club: byCode, confidence: 1.0, matchType: 'EXACT_CODE' };
    }

    // 2. Check exact normalized name
    const compKey = NameNormalizer.toComparableKey(trimmed);
    const byName = this.clubNameMap.get(compKey);
    if (byName) {
      return { club: byName, confidence: 1.0, matchType: 'EXACT_NAME' };
    }

    // 3. Check alias dictionary
    const aliasTarget = CLUB_ALIASES[compKey];
    if (aliasTarget) {
      const byAlias = this.clubNameMap.get(NameNormalizer.toComparableKey(aliasTarget));
      if (byAlias) {
        return { club: byAlias, confidence: 0.95, matchType: 'ALIAS' };
      }
    }

    // 4. Check normalized stripped club name (e.g. without "FC")
    const stripped = NameNormalizer.normalizeClubName(trimmed);
    const byStripped = this.clubNameMap.get(stripped);
    if (byStripped) {
      return { club: byStripped, confidence: 0.9, matchType: 'NORMALIZED' };
    }

    return { club: null, confidence: 0.0, matchType: 'UNRESOLVED' };
  }

  /**
   * Resolves a competition string or code to canonical competition code (e.g. "EPL", "LALIGA").
   */
  public resolveCompetitionCode(rawComp: string): string | null {
    const key = NameNormalizer.toComparableKey(rawComp);
    return COMPETITION_ALIASES[key] || COMPETITION_ALIASES[rawComp.trim().toLowerCase()] || null;
  }

  /**
   * Registers a canonical player in the resolver cache.
   */
  public registerPlayer(player: CanonicalPlayer): void {
    if (player.sourceId) {
      this.playerSourceIdMap.set(player.sourceId, player);
    }
    const signature = this.buildPlayerSignature(
      player.firstName,
      player.lastName,
      player.dateOfBirth,
      player.nationality
    );
    this.playerMap.set(signature, player);

    // Track by normalized full name
    const fullNameKey = NameNormalizer.toComparableKey(`${player.firstName} ${player.lastName}`.trim());
    if (!this.playerNameMap.has(fullNameKey)) {
      this.playerNameMap.set(fullNameKey, []);
    }
    this.playerNameMap.get(fullNameKey)!.push(player);

    if (player.shortName) {
      const shortKey = NameNormalizer.toComparableKey(player.shortName);
      if (shortKey !== fullNameKey) {
        if (!this.playerNameMap.has(shortKey)) {
          this.playerNameMap.set(shortKey, []);
        }
        this.playerNameMap.get(shortKey)!.push(player);
      }
    }
  }

  /**
   * Resolves a player by source ID, composite identity signature (name + DOB + nationality),
   * or contextual name match. Never automatically merges ambiguous candidates.
   */
  public resolvePlayer(params: {
    sourceId?: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    nationality?: string;
    clubContext?: string;
  }): PlayerResolutionResult {
    // 1. Exact Source ID match
    if (params.sourceId && this.playerSourceIdMap.has(params.sourceId)) {
      return {
        player: this.playerSourceIdMap.get(params.sourceId)!,
        confidence: 1.0,
        matchType: 'SOURCE_ID',
      };
    }

    // 2. Exact composite signature (Name + DOB + Nationality)
    if (params.dateOfBirth && params.nationality) {
      const sig = this.buildPlayerSignature(
        params.firstName,
        params.lastName,
        params.dateOfBirth,
        params.nationality
      );
      const bySig = this.playerMap.get(sig);
      if (bySig) {
        return {
          player: bySig,
          confidence: 0.98,
          matchType: 'SIGNATURE_MATCH',
        };
      }
    }

    // 3. Name lookup with club context
    const nameKey = NameNormalizer.toComparableKey(`${params.firstName} ${params.lastName}`.trim());
    const candidates = this.playerNameMap.get(nameKey) || [];

    if (candidates.length === 1) {
      const candidate = candidates[0];
      if (params.clubContext && candidate.currentClubSourceId) {
        const clubMatch = candidate.currentClubSourceId.toLowerCase().includes(params.clubContext.toLowerCase());
        if (clubMatch) {
          return {
            player: candidate,
            confidence: 0.92,
            matchType: 'NAME_CLUB_MATCH',
          };
        }
      }
      return {
        player: candidate,
        confidence: 0.85,
        matchType: 'ALIAS_MATCH',
      };
    }

    if (candidates.length > 1) {
      // Multiple candidates found: check club context to disambiguate
      if (params.clubContext) {
        const matching = candidates.filter((c) =>
          c.currentClubSourceId?.toLowerCase().includes(params.clubContext!.toLowerCase())
        );
        if (matching.length === 1) {
          return {
            player: matching[0],
            confidence: 0.90,
            matchType: 'NAME_CLUB_MATCH',
          };
        }
      }

      // Ambiguous! Refuse to merge blindly
      return {
        player: null,
        confidence: 0.4,
        matchType: 'UNRESOLVED',
        isAmbiguous: true,
        notes: `Ambiguous match: ${candidates.length} candidates found for '${nameKey}'.`,
      };
    }

    return { player: null, confidence: 0.0, matchType: 'UNRESOLVED' };
  }

  private buildPlayerSignature(
    first: string,
    last: string,
    dob: Date,
    nat: string
  ): string {
    const nameKey = NameNormalizer.toComparableKey(`${first} ${last}`);
    const dobString = dob instanceof Date ? dob.toISOString().slice(0, 10) : String(dob).slice(0, 10);
    const natKey = nat.trim().toUpperCase();
    return `${nameKey}:${dobString}:${natKey}`;
  }
}
