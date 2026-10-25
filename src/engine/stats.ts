/**
 * Statistical calculations with strict non-negotiable integrity.
 * Implements the Wilson Score 95% Confidence Interval for binomial proportions.
 * Never claims 0.0% risk without reporting the upper confidence bound.
 */

export interface WilsonInterval {
  proportion: number;
  lower: number;
  upper: number;
}

/**
 * Calculates the Wilson Score Confidence Interval for k successes out of n trials.
 * Default z = 1.959964 corresponds to a two-sided 95% confidence interval.
 */
export function wilsonInterval(k: number, n: number, z: number = 1.959964): WilsonInterval {
  if (n <= 0) {
    return { proportion: 0, lower: 0, upper: 0 };
  }

  const p = Math.max(0, Math.min(1, k / n));
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const radicand = (p * (1 - p)) / n + z2 / (4 * n * n);
  const margin = (z / denom) * Math.sqrt(Math.max(0, radicand));

  let lower = center - margin;
  let upper = center + margin;

  // Boundary clamp guarantees strictly 0 <= lower <= upper <= 1
  if (k <= 0) {
    lower = 0;
    // Exact analytical limit for k = 0: upper = z^2 / (n + z^2)
    upper = z2 / (n + z2);
  } else if (k >= n) {
    lower = n / (n + z2);
    upper = 1;
  } else {
    lower = Math.max(0, lower);
    upper = Math.min(1, upper);
  }

  return {
    proportion: p,
    lower,
    upper
  };
}

/**
 * Formats a Wilson interval into an honest scientific human-readable string.
 * Example for k=0, n=500: "0 / 500 collisions (0.00%, 95% CI upper bound: 0.76%)"
 * Example for k=12, n=500: "12 / 500 collisions (2.40%, 95% CI [1.38%, 4.15%])"
 */
export function formatWilsonCI(interval: WilsonInterval, k: number, n: number, label: string = 'collisions'): string {
  const pct = (interval.proportion * 100).toFixed(2);
  const upPct = (interval.upper * 100).toFixed(2);
  const lowPct = (interval.lower * 100).toFixed(2);

  if (k === 0) {
    return `${k} / ${n} ${label} (${pct}%, 95% CI upper bound: ${upPct}%)`;
  }
  return `${k} / ${n} ${label} (${pct}%, 95% CI [${lowPct}%, ${upPct}%])`;
}

export function mean(arr: number[] | Float32Array): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function standardDeviation(arr: number[] | Float32Array, avg?: number): number {
  if (arr.length <= 1) return 0;
  const m = avg ?? mean(arr);
  let variance = 0;
  for (let i = 0; i < arr.length; i++) {
    const diff = arr[i] - m;
    variance += diff * diff;
  }
  return Math.sqrt(variance / (arr.length - 1));
}
