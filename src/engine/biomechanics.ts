/**
 * Biomechanical Pointing & Motor Variability Engine
 * Formulations:
 *  1. MacKenzie (1992) Shannon Formulation of Fitts's Law: ID = log2(D / W + 1), MT = a + b * ID, TP = ID / MT
 *  2. Meyer et al. (1988) / Schmidt et al. (1979) Impulse Variability along rotated approach vector frame
 *  3. Ornstein-Uhlenbeck stochastic drift + Sinusoidal motor tremor oscillation
 *  4. Directional overshoot ratio rho_overshoot = sigma_parallel / sigma_perp (Model Assumption)
 */

import { PRNG, gaussianBoxMuller } from './prng.ts';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ElementRole = 'anchor' | 'primary' | 'destructive' | 'neutral';

export interface UIElement {
  id: string;
  label: string;
  role: ElementRole;
  rect: Rect;
  style?: Record<string, string>;
}

export interface MotorProfile {
  id: string;
  name: string;
  frequency: number; // Hz (0 - 10)
  amplitude: number; // px (0 - 25)
  jerkImpulse: number; // px (0 - 15)
  urgency: number; // 0.6 - 2.0
  overshootRatio: number; // 1.0 - 2.5 (sigma_parallel / sigma_perp)
  description: string;
}

export interface FittsMetrics {
  distance: number;
  targetWidth: number;
  idBits: number;
  movementTimeMs: number;
  throughputBitsPerSec: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number; // ms
}

export interface SingleTrialResult {
  hitType: 'primary' | 'destructive' | 'neutral' | 'miss';
  endX: number;
  endY: number;
  movementTimeMs: number;
  idBits: number;
  throughputBitsPerSec: number;
  trajectory?: TrajectoryPoint[];
}

/**
 * Calibrated Fitts coefficients for mouse pointing matching MacKenzie (1992)
 * human throughput range of 3.0 to 6.5 bits/s.
 */
export const FITTS_A_MS = 160.0; // intercept in ms
export const FITTS_B_MS = 130.0; // slope in ms/bit
export const AIM_NOISE_K = 0.055; // Meyer et al. impulse noise coefficient
export const DEFAULT_DWELL_MS = 90.0; // Tap actuation dwell time

/**
 * Computes the center of a bounding rectangle.
 */
export function rectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

/**
 * Checks if a point lies inside a rectangle.
 */
export function pointInRect(p: Point, rect: Rect): boolean {
  return (
    p.x >= rect.x &&
    p.x <= rect.x + rect.width &&
    p.y >= rect.y &&
    p.y <= rect.y + rect.height
  );
}

/**
 * Computes the effective target width W along the approach angle.
 * For an axis-aligned target approached at angle theta, projects the line of approach through the box.
 */
export function computeEffectiveTargetWidth(target: Rect, approachAngleRad: number): number {
  const cos = Math.abs(Math.cos(approachAngleRad));
  const sin = Math.abs(Math.sin(approachAngleRad));
  const eps = 1e-6;

  const wCollinear = target.width / Math.max(eps, cos);
  const hCollinear = target.height / Math.max(eps, sin);

  return Math.min(wCollinear, hCollinear);
}

/**
 * MacKenzie (1992) Shannon Formulation of Fitts's Law.
 * ID = log2(D / W + 1)
 * MT = a + b * ID (ms)
 * TP = ID / (MT in seconds) = (1000 * ID) / MT (bits/s)
 */
export function calculateFittsLaw(
  distance: number,
  targetWidth: number,
  a: number = FITTS_A_MS,
  b: number = FITTS_B_MS
): FittsMetrics {
  const d = Math.max(1, distance);
  const w = Math.max(1, targetWidth);
  const idBits = Math.log2(d / w + 1);
  const movementTimeMs = Math.max(50, a + b * idBits);
  const throughputBitsPerSec = (1000.0 * idBits) / movementTimeMs;

  return {
    distance: d,
    targetWidth: w,
    idBits,
    movementTimeMs,
    throughputBitsPerSec
  };
}

/**
 * Simulates a single human pointer trial from an anchor element towards a target element.
 */
export function simulateSingleTrial(
  anchorRect: Rect,
  targetRect: Rect,
  destructiveRect: Rect | null,
  neutralRects: Rect[],
  profile: MotorProfile,
  prng: PRNG,
  dwellTimeMs: number = DEFAULT_DWELL_MS,
  recordTrajectory: boolean = false,
  sampleRateSteps: number = 30
): SingleTrialResult {
  const anchor = rectCenter(anchorRect);
  const target = rectCenter(targetRect);

  const dx = target.x - anchor.x;
  const dy = target.y - anchor.y;
  const distance = Math.max(1, Math.hypot(dx, dy));

  const ux = dx / distance;
  const uy = dy / distance;
  const vx = -uy;
  const vy = ux;

  const approachAngle = Math.atan2(dy, dx);
  const effectiveW = computeEffectiveTargetWidth(targetRect, approachAngle);
  const fitts = calculateFittsLaw(distance, effectiveW);
  const mt = fitts.movementTimeMs;

  // Meyer et al. (1988) Ballistic impulse scatter along approach vector frame
  // Note: Independent of target width W, preventing Fitts variance paradox.
  const sigmaPerp = AIM_NOISE_K * distance * profile.urgency;
  const sigmaParallel = profile.overshootRatio * sigmaPerp;

  const zParallel = gaussianBoxMuller(prng);
  const zPerp = gaussianBoxMuller(prng);

  const ballisticX = target.x + (zParallel * sigmaParallel) * ux + (zPerp * sigmaPerp) * vx;
  const ballisticY = target.y + (zParallel * sigmaParallel) * uy + (zPerp * sigmaPerp) * vy;

  // Motor oscillation & Ornstein-Uhlenbeck stochastic drift parameters
  const freq = profile.frequency;
  const amp = profile.amplitude;
  const jerk = profile.jerkImpulse;

  const phiX = prng() * Math.PI * 2;
  const phiY = prng() * Math.PI * 2;

  // Random transit jerk event
  const hasJolt = jerk > 0 && prng() < 0.35;
  const joltT = hasJolt ? 0.3 + prng() * 0.4 : -1;
  const joltDirX = gaussianBoxMuller(prng);
  const joltDirY = gaussianBoxMuller(prng);

  let trajectory: TrajectoryPoint[] | undefined = undefined;
  if (recordTrajectory) {
    trajectory = [];
  }

  // OU state
  let ouX = 0;
  let ouY = 0;
  const theta = 4.0;
  const dtSec = 0.016; // 16ms approx step

  const totalTime = mt + dwellTimeMs;
  const steps = Math.max(10, sampleRateSteps);
  let currentX = anchor.x;
  let currentY = anchor.y;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalTime;
    const tTransit = Math.min(t, mt);
    const tau = mt > 0 ? tTransit / mt : 1;

    // Minimum jerk smooth ballistic interpolation s(tau) = 10*tau^3 - 15*tau^4 + 6*tau^5
    const s = 10 * Math.pow(tau, 3) - 15 * Math.pow(tau, 4) + 6 * Math.pow(tau, 5);
    const baseX = (1 - s) * anchor.x + s * ballisticX;
    const baseY = (1 - s) * anchor.y + s * ballisticY;

    // Continuous motor tremor
    const oscPerp = amp * Math.sin(2 * Math.PI * freq * (t / 1000) + phiX);
    const oscPar = (amp * 0.7) * Math.cos(2 * Math.PI * freq * (t / 1000) + phiY);

    // OU drift update
    const ouSigma = 0.5 * Math.sqrt(amp + 1);
    ouX = ouX * Math.exp(-theta * dtSec) + ouSigma * Math.sqrt(dtSec) * gaussianBoxMuller(prng);
    ouY = ouY * Math.exp(-theta * dtSec) + ouSigma * Math.sqrt(dtSec) * gaussianBoxMuller(prng);

    // Transit jerk impulse
    let joltX = 0;
    let joltY = 0;
    if (hasJolt && tau >= joltT) {
      const decay = Math.exp(-(tau - joltT) * 8);
      joltX = jerk * joltDirX * decay;
      joltY = jerk * joltDirY * decay;
    }

    currentX = baseX + (oscPar * ux + oscPerp * vx) + ouX + joltX;
    currentY = baseY + (oscPar * uy + oscPerp * vy) + ouY + joltY;

    if (trajectory) {
      trajectory.push({ x: currentX, y: currentY, t });
    }
  }

  // Final actuation position at end of tap dwell
  const endPoint: Point = { x: currentX, y: currentY };

  // Classify endpoint hit
  let hitType: 'primary' | 'destructive' | 'neutral' | 'miss' = 'miss';

  if (destructiveRect && pointInRect(endPoint, destructiveRect)) {
    hitType = 'destructive';
  } else if (pointInRect(endPoint, targetRect)) {
    hitType = 'primary';
  } else {
    for (const nr of neutralRects) {
      if (pointInRect(endPoint, nr)) {
        hitType = 'neutral';
        break;
      }
    }
  }

  return {
    hitType,
    endX: currentX,
    endY: currentY,
    movementTimeMs: mt,
    idBits: fitts.idBits,
    throughputBitsPerSec: fitts.throughputBitsPerSec,
    trajectory
  };
}
