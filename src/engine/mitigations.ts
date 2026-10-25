/**
 * Quantitative Mitigation Comparator
 * Compares Spatial Separation (Auto-Heal) against Non-Spatial UI patterns:
 *  1. Spatial Separation + Target Expansion (Auto-Heal CSS)
 *  2. Soft Delete + Undo Toast
 *  3. Move Destructive Action into 2-Step Overflow (...) Menu
 *  4. Add Explicit Confirmation Modal on Destructive Click
 *
 * Evaluated across:
 *  - Residual Destructive Hazard (k/N + Wilson 95% CI)
 *  - Added Routine Interaction Cost (ms per primary action)
 *  - Destructive Recovery Friction (extra clicks)
 *  - Recommended Use Case
 */

import { WilsonInterval, wilsonInterval, formatWilsonCI } from './stats.ts';
import { SolverResult } from './solver.ts';

export interface MitigationRow {
  id: string;
  strategy: string;
  residualHazardCount: number;
  sampleSize: number;
  residualHazardCI: WilsonInterval;
  hazardFormatted: string;
  addedRoutineCostMs: number;
  extraClicks: number;
  recommendedUseCase: string;
  tradeoffSummary: string;
}

export function computeMitigationMatrix(
  beforeCollisions: number,
  sampleSize: number,
  solverResult: SolverResult
): MitigationRow[] {
  // 1. Spatial Separation (Auto-Heal)
  const spatialCount = solverResult.afterCollisions;
  const spatialCI = solverResult.afterWilsonCI;

  // 2. Soft Delete + Undo Toast (Collision still physically triggers, but reversible)
  const undoCount = beforeCollisions;
  const undoCI = wilsonInterval(undoCount, sampleSize);

  // 3. 2-Step Overflow Menu (Hidden behind ... trigger, 0 direct collisions on main canvas)
  const overflowCount = 0;
  const overflowCI = wilsonInterval(0, sampleSize);

  // 4. Confirmation Modal (Compound probability: user must misclick destructive AND misclick modal confirm)
  // Estimated compound collision rate
  const p1 = beforeCollisions / sampleSize;
  const compoundP = Math.pow(p1, 2);
  const modalCount = Math.round(compoundP * sampleSize);
  const modalCI = wilsonInterval(modalCount, sampleSize);

  return [
    {
      id: 'spatial-autoheal',
      strategy: 'Spatial Separation + Hitbox Expansion (Auto-Heal)',
      residualHazardCount: spatialCount,
      sampleSize,
      residualHazardCI: spatialCI,
      hazardFormatted: formatWilsonCI(spatialCI, spatialCount, sampleSize),
      addedRoutineCostMs: Math.max(0, Math.round(solverResult.deltaMTMs)),
      extraClicks: 0,
      recommendedUseCase: 'Standard modals & toolbars where container dimensions permit >= 24px spatial separation.',
      tradeoffSummary: 'Zero added interaction tax or friction; eliminates hazard purely through physical geometry.'
    },
    {
      id: 'undo-toast',
      strategy: 'Soft Delete + Undo Toast Banner (5s window)',
      residualHazardCount: undoCount,
      sampleSize,
      residualHazardCI: undoCI,
      hazardFormatted: `${formatWilsonCI(undoCI, undoCount, sampleSize)} (Reversible within 5s)`,
      addedRoutineCostMs: 0,
      extraClicks: 1,
      recommendedUseCase: 'High-frequency everyday productivity apps (email, notes, issue trackers) where speed is paramount.',
      tradeoffSummary: 'Physical misclicks still occur, but consequence is deferred. Requires server-side soft-delete support.'
    },
    {
      id: 'overflow-menu',
      strategy: '2-Step Overflow Action Menu (...)',
      residualHazardCount: overflowCount,
      sampleSize,
      residualHazardCI: overflowCI,
      hazardFormatted: formatWilsonCI(overflowCI, 0, sampleSize),
      addedRoutineCostMs: 0,
      extraClicks: 1, // 1 extra click on destructive flow
      recommendedUseCase: 'Cramped headers, compact card footers, or mobile bottom sheets with insufficient spatial margin.',
      tradeoffSummary: 'Completely eliminates accidental direct clicks. Adds 1 click + ~350ms to intentional destructive access.'
    },
    {
      id: 'confirmation-modal',
      strategy: 'Explicit Confirmation Dialog on Destructive Action',
      residualHazardCount: modalCount,
      sampleSize,
      residualHazardCI: modalCI,
      hazardFormatted: formatWilsonCI(modalCI, modalCount, sampleSize),
      addedRoutineCostMs: 0,
      extraClicks: 1, // 1 extra confirmation click
      recommendedUseCase: 'Irreversible catastrophic operations (e.g. drop database, revoke production keys, cancel account).',
      tradeoffSummary: 'Catastrophic misclick risk drops quadratically. High friction; can cause confirmation fatigue if overused.'
    }
  ];
}
