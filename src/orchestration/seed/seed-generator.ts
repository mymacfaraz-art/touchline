// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 4: DETERMINISTIC SEED GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a deterministic RNG seed for a match simulation.
 * Given identical fixtureId, gameSeasonId, and optional override, this function
 * unconditionally produces the exact same seed string.
 *
 * @param fixtureId The ID of the fixture to simulate
 * @param gameSeasonId The career game season ID
 * @param seedOverride Optional explicit seed override
 */
export function generateMatchSeed(
  fixtureId: string,
  gameSeasonId: string,
  seedOverride?: string | number
): string {
  if (seedOverride !== undefined && seedOverride !== null) {
    return String(seedOverride);
  }

  // Pure deterministic string hashing algorithm (FNV-1a 32-bit hash)
  const source = `touchline:match:${gameSeasonId}:${fixtureId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Format as a positive hexadecimal seed string
  const positiveHash = (hash >>> 0).toString(16).padStart(8, '0');
  return `seed-v1-${positiveHash}`;
}
