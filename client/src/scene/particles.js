// A small random number generator that always gives the same numbers for the same seed.
// The effects use it so the rain or snow looks the same on every render instead of jumping around.
export function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds `count` particles. `make(random, index)` describes one particle.
export function makeParticles(count, seed, make) {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => make(random, i));
}

// Picks a number between min and max.
export const between = (random, min, max) => min + random() * (max - min);
