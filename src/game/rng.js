'use strict';

/**
 * Small, fast, seedable PRNG (mulberry32). Every random decision in a race is
 * drawn from one of these so that the same seed always reproduces the same
 * race, frame for frame.
 */
function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  let spareGaussian = null;

  return {
    /** Uniform float in [0, 1). */
    next,
    /** Uniform float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** Uniform integer in [min, max] (inclusive). */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
    /** Standard normal sample (Box–Muller). */
    gaussian() {
      if (spareGaussian !== null) {
        const value = spareGaussian;
        spareGaussian = null;
        return value;
      }
      let u = 0;
      while (u === 0) u = next();
      const v = next();
      const mag = Math.sqrt(-2 * Math.log(u));
      spareGaussian = mag * Math.sin(2 * Math.PI * v);
      return mag * Math.cos(2 * Math.PI * v);
    },
    /** In-place Fisher–Yates shuffle; returns the array. */
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },
  };
}

module.exports = { createRng };
