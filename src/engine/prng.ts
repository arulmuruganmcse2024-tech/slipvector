/**
 * PRNG: Deterministic 32-bit Mulberry32 generator and Gaussian Box-Muller transform.
 * Guarantees bit-for-bit reproducibility across runs with the same seed.
 */

export type PRNG = () => number;

/**
 * Creates a mulberry32 pseudo-random number generator function.
 * @param seed - 32-bit integer seed
 * @returns PRNG function returning float in [0, 1)
 */
export function createMulberry32(seed: number): PRNG {
  let s = Math.floor(seed) >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Standard Normal Gaussian sample N(0, 1) using the Box-Muller transform.
 */
export function gaussianBoxMuller(prng: PRNG): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
