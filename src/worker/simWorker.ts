/**
 * Simulation Worker (simWorker.ts)
 * Runs off-thread Monte Carlo simulations using Float32Array buffers.
 * Never blocks the UI thread even at N = 10,000 trials.
 * Measures real execution time dynamically via performance.now().
 */

import {
  UIElement,
  MotorProfile,
  simulateSingleTrial,
  SingleTrialResult
} from '../engine/biomechanics.ts';
import { createMulberry32 } from '../engine/prng.ts';
import { wilsonInterval, WilsonInterval, mean } from '../engine/stats.ts';

export interface WorkerRequest {
  elements: UIElement[];
  profile: MotorProfile;
  sampleSize: 500 | 2000 | 10000;
  seed: number;
  dwellTimeMs?: number;
}

export interface WorkerResponse {
  sampleSize: number;
  seed: number;
  durationMs: number;
  primaryHits: number;
  destructiveCollisions: number;
  neutralHits: number;
  totalMisses: number;
  destructiveWilsonCI: WilsonInterval;
  primaryWilsonCI: WilsonInterval;
  meanMTMs: number;
  meanIDBits: number;
  meanTPBitsPerSec: number;
  endpoints: Float32Array; // 3 floats per trial: [endX, endY, hitTypeCode] (0: primary, 1: destructive, 2: neutral, 3: miss)
  trajectorySamples: Float32Array; // sample of animated trajectories
  trajectoryLengths: Int32Array; // number of points per sample trajectory
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const startTime = performance.now();
  const { elements, profile, sampleSize, seed, dwellTimeMs = 90.0 } = event.data;

  const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
  const primaryEl = elements.find(e => e.role === 'primary');
  const destructiveEl = elements.find(e => e.role === 'destructive');
  const neutralEls = elements.filter(e => e.role === 'neutral').map(e => e.rect);

  if (!primaryEl) {
    self.postMessage({ error: 'No primary target defined' });
    return;
  }

  const prng = createMulberry32(seed);

  let primaryHits = 0;
  let destructiveCollisions = 0;
  let neutralHits = 0;
  let totalMisses = 0;

  const movementTimes: number[] = new Array(sampleSize);
  const idBitsList: number[] = new Array(sampleSize);
  const tpList: number[] = new Array(sampleSize);

  // Buffer for endpoints: [endX, endY, hitCode] for all N trials
  const endpoints = new Float32Array(sampleSize * 3);

  // Save full trajectories for up to 100 sample trials for 60 FPS animation
  const maxSampleTrajectories = Math.min(100, sampleSize);
  const sampleSteps = 30;
  const samplePoints: number[] = [];
  const trajectoryLengths = new Int32Array(maxSampleTrajectories);

  for (let i = 0; i < sampleSize; i++) {
    const recordTraj = i < maxSampleTrajectories;
    const res: SingleTrialResult = simulateSingleTrial(
      anchorEl.rect,
      primaryEl.rect,
      destructiveEl ? destructiveEl.rect : null,
      neutralEls,
      profile,
      prng,
      dwellTimeMs,
      recordTraj,
      sampleSteps
    );

    let hitCode = 3; // miss
    if (res.hitType === 'primary') {
      primaryHits++;
      hitCode = 0;
    } else if (res.hitType === 'destructive') {
      destructiveCollisions++;
      hitCode = 1;
    } else if (res.hitType === 'neutral') {
      neutralHits++;
      hitCode = 2;
    } else {
      totalMisses++;
    }

    endpoints[i * 3 + 0] = res.endX;
    endpoints[i * 3 + 1] = res.endY;
    endpoints[i * 3 + 2] = hitCode;

    movementTimes[i] = res.movementTimeMs;
    idBitsList[i] = res.idBits;
    tpList[i] = res.throughputBitsPerSec;

    if (recordTraj && res.trajectory) {
      trajectoryLengths[i] = res.trajectory.length;
      for (const pt of res.trajectory) {
        samplePoints.push(pt.x, pt.y, pt.t);
      }
    }
  }

  const durationMs = performance.now() - startTime;
  const destructiveWilsonCI = wilsonInterval(destructiveCollisions, sampleSize);
  const primaryWilsonCI = wilsonInterval(primaryHits, sampleSize);

  const response: WorkerResponse = {
    sampleSize,
    seed,
    durationMs,
    primaryHits,
    destructiveCollisions,
    neutralHits,
    totalMisses,
    destructiveWilsonCI,
    primaryWilsonCI,
    meanMTMs: mean(movementTimes),
    meanIDBits: mean(idBitsList),
    meanTPBitsPerSec: mean(tpList),
    endpoints,
    trajectorySamples: new Float32Array(samplePoints),
    trajectoryLengths
  };

  self.postMessage(response, [endpoints.buffer, response.trajectorySamples.buffer, trajectoryLengths.buffer]);
};
