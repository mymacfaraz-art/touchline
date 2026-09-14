import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../src/simulation/engine/rng';

describe('SeededRNG', () => {
  it('1. Same seed produces identical sequence of numbers', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);

    const sequence1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const sequence2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(sequence1).toEqual(sequence2);
  });

  it('2. Different seed produces different sequence of numbers', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(999);

    const sequence1 = Array.from({ length: 10 }, () => rng1.nextFloat());
    const sequence2 = Array.from({ length: 10 }, () => rng2.nextFloat());

    expect(sequence1).not.toEqual(sequence2);
  });

  it('3. Integer bounds are strictly respected', () => {
    const rng = new SeededRNG('touchline-test-seed');
    const min = 5;
    const max = 15;

    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(min, max);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
    }
  });

  it('4. Chance / boolean values behave correctly according to probability', () => {
    const rng = new SeededRNG(12345);
    expect(rng.nextBoolean(1.0)).toBe(true);
    expect(rng.nextBoolean(0.0)).toBe(false);

    // Statistical check for 0.5 chance over 1000 samples
    let trueCount = 0;
    const samples = 1000;
    for (let i = 0; i < samples; i++) {
      if (rng.nextBoolean(0.5)) trueCount++;
    }

    // Expect trueCount to be close to 500 (between 400 and 600)
    expect(trueCount).toBeGreaterThan(400);
    expect(trueCount).toBeLessThan(600);
  });

  it('5. No NaN or Infinity values are produced', () => {
    const rng = new SeededRNG('boundary-test');

    for (let i = 0; i < 200; i++) {
      const floatVal = rng.nextFloat();
      const intVal = rng.nextInt(-100, 100);

      expect(Number.isNaN(floatVal)).toBe(false);
      expect(Number.isFinite(floatVal)).toBe(true);
      expect(Number.isNaN(intVal)).toBe(false);
      expect(Number.isFinite(intVal)).toBe(true);
    }
  });
});
