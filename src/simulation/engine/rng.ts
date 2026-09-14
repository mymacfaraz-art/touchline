/**
 * Seeded Pseudo-Random Number Generator (PRNG) implementing the Mulberry32 algorithm.
 * Guarantees 100% deterministic and reproducible simulation outcomes for testing and debugging.
 */
export class SeededRNG {
  private state: number;
  private readonly initialSeed: number | string;

  constructor(seed: number | string) {
    this.initialSeed = seed;
    this.state = typeof seed === 'string' ? SeededRNG.hashString(seed) : (seed >>> 0);
    if (this.state === 0) {
      this.state = 1; // Ensure state is non-zero
    }
  }

  /**
   * Hashes a string into a 32-bit unsigned integer using FNV-1a.
   */
  public static hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Gets the original seed used to initialize this instance.
   */
  public getSeed(): number | string {
    return this.initialSeed;
  }

  /**
   * Generates a pseudo-random floating-point number in the range [0, 1).
   */
  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    
    // Safety check against invalid states
    if (isNaN(result) || !isFinite(result)) {
      return 0.5;
    }
    return result;
  }

  /**
   * Generates a pseudo-random integer in the range [min, max] (inclusive).
   */
  public nextInt(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error('Range bounds must be finite numbers');
    }
    const lower = Math.ceil(Math.min(min, max));
    const upper = Math.floor(Math.max(min, max));
    
    if (lower === upper) return lower;
    
    const floatVal = this.nextFloat();
    return Math.floor(floatVal * (upper - lower + 1)) + lower;
  }

  /**
   * Evaluates a probability check against a chance threshold in [0, 1].
   * @param chance Probability threshold between 0.0 and 1.0 (default: 0.5)
   */
  public nextBoolean(chance = 0.5): boolean {
    const clampedChance = Math.max(0, Math.min(1, chance));
    return this.nextFloat() < clampedChance;
  }

  /**
   * Selects a random element from an array.
   */
  public choice<T>(array: readonly T[]): T {
    if (!array || array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }
}
