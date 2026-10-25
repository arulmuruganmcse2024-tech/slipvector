/**
 * Simulation Worker (simWorker.ts)
 * Runs off-thread Monte Carlo simulations using Float32Array buffers.
 * Never blocks the UI thread even at N = 10,000 trials.
 * Measures real execution time dynamically via performance.now().
 * Computes both Nominal and Effective (We = 4.133 * SD) Throughput (MacKenzie 1992, ISO 9241-9).
 */

import { runSimBatch, WorkerRequest } from './simWorkerCore.ts';
export type { WorkerRequest, WorkerResponse } from './simWorkerCore.ts';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const response = runSimBatch(event.data);
    self.postMessage(response, [
      response.endpoints.buffer,
      response.trajectorySamples.buffer,
      response.trajectoryLengths.buffer
    ]);
  } catch (err: any) {
    self.postMessage({ error: err?.message || 'Simulation worker error' });
  }
};
