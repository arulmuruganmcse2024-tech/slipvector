/**
 * Simulation Worker (simWorker.ts)
 * Runs off-thread Monte Carlo simulations using Float32Array buffers.
 * Never blocks the UI thread even at N = 10,000 trials.
 * Measures real execution time dynamically via performance.now().
 * Computes both Nominal and Effective (We = 4.133 * SD) Throughput (MacKenzie 1992, ISO 9241-9).
 */

import {
  UIElement,
  MotorProfile,
  simulateSingleTrial,
  SingleTrialResult,
  rectCenter
} from '../engine/biomechanics.ts';
import { createMulberry32 } from '../engine/prng.ts';
import { wilsonInterval, WilsonInterval, mean, standardDeviation } from '../engine/stats.ts';

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
  effectiveTPBitsPerSec: number;
  effectiveWidth: number;
  sdParallel: number;
  endpoints: Float32Array; // 3 floats per trial: [endX, endY, hitTypeCode] (0: primary, 1: destructive, 2: neutral)
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

  const anchorCenter = rectCenter(anchorEl.rect);
  const primaryCenter = rectCenter(primaryEl.rect);
  const dx = primaryCenter.x - anchorCenter.x;
  const dy = primaryCenter.y - anchorCenter.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;

  const prng = createMulberry32(seed);

  let primaryHits = 0;
  let destructiveCollisions = 0;
  let neutralHits = 0;

  const movementTimes: number[] = new Array(sampleSize);
  const idBitsList: number[] = new Array(sampleSize);
  const tpList: number[] = new Array(sampleSize);
  const parallelDeltas: number[] = new Array(sampleSize);

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

    let hitCode = 2; // neutral
    if (res.hitType === 'primary') {
      primaryHits++;
      hitCode = 0;
    } else if (res.hitType === 'destructive') {
      destructiveCollisions++;
      hitCode = 1;
    } else {
      neutralHits++;
      hitCode = 2;
    }

    endpoints[i * 3 + 0] = res.endX;
    endpoints[i * 3 + 1] = res.endY;
    endpoints[i * 3 + 2] = hitCode;

    movementTimes[i] = res.movementTimeMs;
    idBitsList[i] = res.idBits;
    tpList[i] = res.throughputBitsPerSec;
    parallelDeltas[i] = (res.endX - primaryCenter.x) * ux + (res.endY - primaryCenter.y) * uy;

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

  // Effective Throughput computation: We = 4.133 * SD_parallel
  const sdParallel = standardDeviation(parallelDeltas);
  const we = sdParallel > 0 ? 4.133 * sdParallel : Math.max(1, primaryEl.rect.width);
  const idEff = Math.log2(dist / we + 1);
  const meanMT = mean(movementTimes);
  const effectiveTP = (1000.0 * idEff) / Math.max(50, meanMT);

  const response: WorkerResponse = {
    sampleSize,
    seed,
    durationMs,
    primaryHits,
    destructiveCollisions,
    neutralHits,
    totalMisses: 0,
    destructiveWilsonCI,
    primaryWilsonCI,
    meanMTMs: meanMT,
    meanIDBits: mean(idBitsList),
    meanTPBitsPerSec: mean(tpList),
    effectiveTPBitsPerSec: effectiveTP,
    effectiveWidth: we,
    sdParallel,
    endpoints,
    trajectorySamples: new Float32Array(samplePoints),
    trajectoryLengths
  };

  self.postMessage(response, [endpoints.buffer, response.trajectorySamples.buffer, trajectoryLengths.buffer]);
};
