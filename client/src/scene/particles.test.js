import { describe, expect, it } from 'vitest';
import { between, makeParticles, mulberry32 } from './particles.js';

describe('particles', () => {
  it('gives the same numbers for the same seed', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('gives different numbers for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('makeParticles builds the asked number of particles', () => {
    expect(makeParticles(12, 1, (r, i) => ({ i }))).toHaveLength(12);
  });

  it('between stays inside its range', () => {
    const random = mulberry32(9);
    for (let i = 0; i < 200; i++) {
      const n = between(random, 3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThan(7);
    }
  });
});
