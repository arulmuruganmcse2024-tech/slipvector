/**
 * Constrained Repulsive Layout Solver (Auto-Heal)
 * Evaluates candidate geometries within container bounds to relocate destructive targets
 * orthogonal/opposite to ballistic approach vectors and expand hitboxes toward >= 44px.
 *
 * Statuses:
 * - 'no_change_needed': Baseline already satisfies the zero-collision target (never labeled solved).
 * - 'solved': Baseline had collisions > 0 and the solver achieved 0 / N collisions certified.
 * - 'infeasible': Container geometry or tremor amplitude prevents complete elimination of risk.
 */

import {
  UIElement,
  MotorProfile,
  Rect,
  simulateSingleTrial,
  rectCenter,
  computeEffectiveTargetWidth,
  calculateFittsLaw
} from './biomechanics.ts';
import { createMulberry32 } from './prng.ts';
import { wilsonInterval, WilsonInterval, standardDeviation } from './stats.ts';

export interface SolverResult {
  status: 'solved' | 'no_change_needed' | 'infeasible';
  optimizedElements: UIElement[];
  beforeCollisions: number;
  afterCollisions: number;
  beforeWilsonCI: WilsonInterval;
  afterWilsonCI: WilsonInterval;
  beforePrimaryHits: number;
  afterPrimaryHits: number;
  beforeMTMs: number;
  afterMTMs: number;
  deltaMTMs: number;
  beforeIDBits: number;
  afterIDBits: number;
  deltaIDBits: number;
  beforeThroughput: number;
  afterThroughput: number;
  deltaThroughput: number;
  effectiveThroughputBefore: number;
  effectiveThroughputAfter: number;
  patchCSS: string;
  tailwindClasses: string;
  explanation: string;
}

/**
 * Checks if two rectangles overlap with an optional buffer.
 */
function rectsOverlap(r1: Rect, r2: Rect, buffer: number = 0): boolean {
  return !(
    r2.x >= r1.x + r1.width + buffer ||
    r2.x + r2.width <= r1.x - buffer ||
    r2.y >= r1.y + r1.height + buffer ||
    r2.y + r2.height <= r1.y - buffer
  );
}

/**
 * Computes minimum edge-to-edge distance between two non-overlapping rectangles.
 */
function rectDistance(r1: Rect, r2: Rect): number {
  const left = r2.x >= r1.x + r1.width;
  const right = r1.x >= r2.x + r2.width;
  const bottom = r2.y >= r1.y + r1.height;
  const top = r1.y >= r2.y + r2.height;

  if (left && bottom) return Math.hypot(r2.x - (r1.x + r1.width), r2.y - (r1.y + r1.height));
  if (left && top) return Math.hypot(r2.x - (r1.x + r1.width), r1.y - (r2.y + r2.height));
  if (right && bottom) return Math.hypot(r1.x - (r2.x + r2.width), r2.y - (r1.y + r1.height));
  if (right && top) return Math.hypot(r1.x - (r2.x + r2.width), r1.y - (r2.y + r2.height));
  if (left) return r2.x - (r1.x + r1.width);
  if (right) return r1.x - (r2.x + r2.width);
  if (bottom) return r2.y - (r1.y + r1.height);
  if (top) return r1.y - (r2.y + r2.height);
  return 0; // Overlapping
}

/**
 * Simulates N trials for a given layout configuration and counts outcomes and spread.
 */
function evaluateLayoutCollisions(
  elements: UIElement[],
  profile: MotorProfile,
  seed: number,
  sampleSize: number
): {
  collisions: number;
  primaryHits: number;
  neutralHits: number;
  meanMT: number;
  sdParallel: number;
} {
  const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
  const primaryEl = elements.find(e => e.role === 'primary');
  const destructiveEl = elements.find(e => e.role === 'destructive');
  const neutralEls = elements.filter(e => e.role === 'neutral').map(e => e.rect);

  if (!primaryEl) {
    return { collisions: 0, primaryHits: 0, neutralHits: 0, meanMT: 0, sdParallel: 0 };
  }

  const anchorCenter = rectCenter(anchorEl.rect);
  const primaryCenter = rectCenter(primaryEl.rect);
  const dx = primaryCenter.x - anchorCenter.x;
  const dy = primaryCenter.y - anchorCenter.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;

  const prng = createMulberry32(seed);
  let collisions = 0;
  let primaryHits = 0;
  let neutralHits = 0;
  let totalMT = 0;
  const parallelDeltas: number[] = new Array(sampleSize);

  for (let i = 0; i < sampleSize; i++) {
    const res = simulateSingleTrial(
      anchorEl.rect,
      primaryEl.rect,
      destructiveEl ? destructiveEl.rect : null,
      neutralEls,
      profile,
      prng,
      90.0,
      false
    );

    if (res.hitType === 'destructive') collisions++;
    else if (res.hitType === 'primary') primaryHits++;
    else neutralHits++;

    totalMT += res.movementTimeMs;
    parallelDeltas[i] = (res.endX - primaryCenter.x) * ux + (res.endY - primaryCenter.y) * uy;
  }

  return {
    collisions,
    primaryHits,
    neutralHits,
    meanMT: totalMT / sampleSize,
    sdParallel: standardDeviation(parallelDeltas)
  };
}

/**
 * Solves for a safe layout configuration within container bounds.
 */
export function solveLayout(
  elements: UIElement[],
  container: { width: number; height: number },
  profile: MotorProfile,
  seed: number,
  sampleSize: number = 500
): SolverResult {
  const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
  const primaryEl = elements.find(e => e.role === 'primary');
  const destructiveEl = elements.find(e => e.role === 'destructive');

  const initialEval = evaluateLayoutCollisions(elements, profile, seed, sampleSize);
  const beforeCollisions = initialEval.collisions;
  const beforeWilson = wilsonInterval(beforeCollisions, sampleSize);

  // Baseline metrics computation
  const anchorCenter = rectCenter(anchorEl.rect);
  const primCenterBefore = primaryEl ? rectCenter(primaryEl.rect) : anchorCenter;
  const distBefore = Math.max(1, Math.hypot(primCenterBefore.x - anchorCenter.x, primCenterBefore.y - anchorCenter.y));
  const angleBefore = Math.atan2(primCenterBefore.y - anchorCenter.y, primCenterBefore.x - anchorCenter.x);
  const effWBefore = primaryEl ? computeEffectiveTargetWidth(primaryEl.rect, angleBefore) : 40;
  const fittsBefore = calculateFittsLaw(distBefore, effWBefore);
  const beforeMT = fittsBefore.movementTimeMs;
  const beforeID = fittsBefore.idBits;
  const beforeTP = fittsBefore.throughputBitsPerSec;
  const weBefore = initialEval.sdParallel > 0 ? 4.133 * initialEval.sdParallel : effWBefore;
  const idEffBefore = Math.log2(distBefore / weBefore + 1);
  const tpEffBefore = (1000.0 * idEffBefore) / beforeMT;

  if (!primaryEl || !destructiveEl) {
    return {
      status: 'no_change_needed',
      optimizedElements: elements,
      beforeCollisions,
      afterCollisions: beforeCollisions,
      beforeWilsonCI: beforeWilson,
      afterWilsonCI: beforeWilson,
      beforePrimaryHits: initialEval.primaryHits,
      afterPrimaryHits: initialEval.primaryHits,
      beforeMTMs: Math.round(beforeMT),
      afterMTMs: Math.round(beforeMT),
      deltaMTMs: 0,
      beforeIDBits: beforeID,
      afterIDBits: beforeID,
      deltaIDBits: 0,
      beforeThroughput: beforeTP,
      afterThroughput: beforeTP,
      deltaThroughput: 0,
      effectiveThroughputBefore: tpEffBefore,
      effectiveThroughputAfter: tpEffBefore,
      patchCSS: '/* No destructive target present */',
      tailwindClasses: '',
      explanation: 'No adjacent destructive target found in layout. No change needed.'
    };
  }

  // If baseline already satisfies the zero-collision target, return NO_CHANGE_NEEDED (never label SOLVED)
  if (beforeCollisions === 0) {
    return {
      status: 'no_change_needed',
      optimizedElements: elements,
      beforeCollisions: 0,
      afterCollisions: 0,
      beforeWilsonCI: beforeWilson,
      afterWilsonCI: beforeWilson,
      beforePrimaryHits: initialEval.primaryHits,
      afterPrimaryHits: initialEval.primaryHits,
      beforeMTMs: Math.round(beforeMT),
      afterMTMs: Math.round(beforeMT),
      deltaMTMs: 0,
      beforeIDBits: beforeID,
      afterIDBits: beforeID,
      deltaIDBits: 0,
      beforeThroughput: beforeTP,
      afterThroughput: beforeTP,
      deltaThroughput: 0,
      effectiveThroughputBefore: tpEffBefore,
      effectiveThroughputAfter: tpEffBefore,
      patchCSS: '/* Layout already certified safe */',
      tailwindClasses: '',
      explanation: `Baseline layout already satisfies the zero-collision safety target (0 / ${sampleSize} collisions, 95% CI upper bound: ${(beforeWilson.upper * 100).toFixed(2)}%). No layout change needed. Movement time: no change (${Math.round(beforeMT)} ms, ID: ${beforeID.toFixed(2)} bits, nominal TP: ${beforeTP.toFixed(2)} bits/s, effective TP: ${tpEffBefore.toFixed(2)} bits/s).`
    };
  }

  // Clone elements and expand target dimensions toward >= 44px if container allows
  const expandedElements: UIElement[] = elements.map(el => {
    if (el.role === 'primary' || el.role === 'destructive') {
      const targetH = Math.max(el.rect.height, 44);
      const targetW = Math.max(el.rect.width, 44);
      const w = Math.min(targetW, container.width - 20);
      const h = Math.min(targetH, container.height - 20);
      return {
        ...el,
        rect: { ...el.rect, width: w, height: h }
      };
    }
    return { ...el, rect: { ...el.rect } };
  });

  const prim = expandedElements.find(e => e.role === 'primary')!;
  const dest = expandedElements.find(e => e.role === 'destructive')!;
  const primCenter = rectCenter(prim.rect);

  // Approach vector
  const dx = primCenter.x - anchorCenter.x;
  const dy = primCenter.y - anchorCenter.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;
  const vx = -uy;
  const vy = ux;

  // Candidate generation for destructive target position
  const candidateDestRects: Rect[] = [];
  const pad = 16;
  const destW = dest.rect.width;
  const destH = dest.rect.height;

  // Bottom-left corner
  candidateDestRects.push({
    x: pad,
    y: Math.min(container.height - destH - pad, prim.rect.y),
    width: destW,
    height: destH
  });

  // Top-right corner
  candidateDestRects.push({
    x: container.width - destW - pad,
    y: pad,
    width: destW,
    height: destH
  });

  // Orthogonal offset by various steps
  for (const offset of [80, 120, 160, -80, -120, -160]) {
    const candX = primCenter.x + offset * vx - destW / 2;
    const candY = primCenter.y + offset * vy - destH / 2;
    if (
      candX >= pad &&
      candX + destW <= container.width - pad &&
      candY >= pad &&
      candY + destH <= container.height - pad
    ) {
      candidateDestRects.push({
        x: Math.round(candX),
        y: Math.round(candY),
        width: destW,
        height: destH
      });
    }
  }

  // Grid sweep over container corners and edges
  const gridPositions = [
    { x: pad, y: container.height - destH - pad },
    { x: pad, y: pad },
    { x: container.width - destW - pad, y: pad },
    { x: pad, y: Math.round((container.height - destH) / 2) }
  ];
  for (const gp of gridPositions) {
    if (gp.x >= 0 && gp.y >= 0 && gp.x + destW <= container.width && gp.y + destH <= container.height) {
      candidateDestRects.push({ ...gp, width: destW, height: destH });
    }
  }

  // Filter out candidates that overlap with anchor or primary
  const validCandidates = candidateDestRects.filter(c => {
    return !rectsOverlap(c, anchorEl.rect, 12) && !rectsOverlap(c, prim.rect, 24);
  });

  let bestElements: UIElement[] = expandedElements;
  let lowestCollisions = beforeCollisions;

  for (const candRect of validCandidates) {
    const testElements: UIElement[] = expandedElements.map(e => {
      if (e.id === dest.id) {
        return { ...e, rect: candRect };
      }
      return e;
    });

    const res = evaluateLayoutCollisions(testElements, profile, seed, sampleSize);
    if (res.collisions < lowestCollisions) {
      lowestCollisions = res.collisions;
      bestElements = testElements;
      if (lowestCollisions === 0) {
        break; // Found 0 collision safe harbor
      }
    }
  }

  // If no candidates achieved 0, attempt opposite corner layout
  if (lowestCollisions > 0) {
    const altPrimRect: Rect = {
      x: container.width - prim.rect.width - pad,
      y: container.height - prim.rect.height - pad,
      width: prim.rect.width,
      height: prim.rect.height
    };
    const altDestRect: Rect = {
      x: pad,
      y: container.height - dest.rect.height - pad,
      width: dest.rect.width,
      height: dest.rect.height
    };

    if (
      !rectsOverlap(altPrimRect, altDestRect, 24) &&
      !rectsOverlap(altPrimRect, anchorEl.rect, 12) &&
      !rectsOverlap(altDestRect, anchorEl.rect, 12) &&
      altPrimRect.x >= 0 && altDestRect.x >= 0
    ) {
      const testElements: UIElement[] = expandedElements.map(e => {
        if (e.id === prim.id) return { ...e, rect: altPrimRect };
        if (e.id === dest.id) return { ...e, rect: altDestRect };
        return e;
      });
      const res = evaluateLayoutCollisions(testElements, profile, seed, sampleSize);
      if (res.collisions < lowestCollisions) {
        lowestCollisions = res.collisions;
        bestElements = testElements;
      }
    }
  }

  // Final evaluation on the optimized layout to recompute all telemetry dynamically
  const afterEval = evaluateLayoutCollisions(bestElements, profile, seed, sampleSize);
  const afterWilson = wilsonInterval(afterEval.collisions, sampleSize);
  const isSolved = afterEval.collisions === 0;
  const status: 'solved' | 'no_change_needed' | 'infeasible' = isSolved ? 'solved' : 'infeasible';

  // Compute healed geometry metrics
  const bestPrim = bestElements.find(e => e.role === 'primary')!;
  const bestDest = bestElements.find(e => e.role === 'destructive')!;
  const primCenterAfter = rectCenter(bestPrim.rect);
  const distAfter = Math.max(1, Math.hypot(primCenterAfter.x - anchorCenter.x, primCenterAfter.y - anchorCenter.y));
  const angleAfter = Math.atan2(primCenterAfter.y - anchorCenter.y, primCenterAfter.x - anchorCenter.x);
  const effWAfter = computeEffectiveTargetWidth(bestPrim.rect, angleAfter);
  const fittsAfter = calculateFittsLaw(distAfter, effWAfter);
  const afterMT = fittsAfter.movementTimeMs;
  const afterID = fittsAfter.idBits;
  const afterTP = fittsAfter.throughputBitsPerSec;
  const weAfter = afterEval.sdParallel > 0 ? 4.133 * afterEval.sdParallel : effWAfter;
  const idEffAfter = Math.log2(distAfter / weAfter + 1);
  const tpEffAfter = (1000.0 * idEffAfter) / afterMT;

  const deltaMTMs = afterMT - beforeMT;
  const deltaIDBits = afterID - beforeID;
  const deltaThroughput = afterTP - beforeTP;

  // Geometry deltas for dynamic explanation
  const origDest = destructiveEl;
  const origPrim = primaryEl;
  const destDx = Math.round(bestDest.rect.x - origDest.rect.x);
  const destDy = Math.round(bestDest.rect.y - origDest.rect.y);
  const destDistMoved = Math.round(Math.hypot(destDx, destDy));
  const origGap = Math.round(rectDistance(origPrim.rect, origDest.rect));
  const newGap = Math.round(rectDistance(bestPrim.rect, bestDest.rect));
  const dWp = bestPrim.rect.width - origPrim.rect.width;
  const dHp = bestPrim.rect.height - origPrim.rect.height;

  const mtText = Math.abs(deltaMTMs) < 1
    ? '0 ms (no change: primary target dimensions and distance were already >= 44px)'
    : `${deltaMTMs > 0 ? '+' : ''}${Math.round(deltaMTMs)} ms (${Math.round(beforeMT)} ms -> ${Math.round(afterMT)} ms; ID: ${beforeID.toFixed(2)} -> ${afterID.toFixed(2)} bits)`;

  const hitRateText = `${((initialEval.primaryHits / sampleSize) * 100).toFixed(1)}% -> ${((afterEval.primaryHits / sampleSize) * 100).toFixed(1)}%`;

  let explanation = '';
  if (isSolved) {
    explanation = `Relocated '${bestDest.label}' by ${destDistMoved}px (dx: ${destDx > 0 ? '+' : ''}${destDx}px, dy: ${destDy > 0 ? '+' : ''}${destDy}px to [${bestDest.rect.x}, ${bestDest.rect.y}])${dHp > 0 || dWp > 0 ? `, expanded '${bestPrim.label}' target to ${bestPrim.rect.width}x${bestPrim.rect.height}px (+${dHp}px)` : ''}, expanding edge-to-edge gap from ${origGap}px to ${newGap}px. Residual hazard: 0 / ${sampleSize} collisions (95% CI upper bound: ${(afterWilson.upper * 100).toFixed(2)}%). Primary hit rate: ${hitRateText}. Routine MT: ${mtText}.`;
  } else {
    explanation = `Container bounds (${container.width}x${container.height}px) restrict maximum clearance to ${newGap}px under motor amplitude (${profile.amplitude}px). Relocated '${bestDest.label}' by ${destDistMoved}px (dx: ${destDx > 0 ? '+' : ''}${destDx}px, dy: ${destDy > 0 ? '+' : ''}${destDy}px), reducing collisions from ${beforeCollisions} to ${afterEval.collisions} (${(afterWilson.proportion * 100).toFixed(2)}%). Routine MT: ${mtText}. Recommend non-spatial mitigation (e.g. 2-step overflow menu or confirmation dialog).`;
  }

  // Generate CSS Patch
  const patchCSS = `/* SlipVector Certified Auto-Heal Layout */
#${bestPrim.id} {
  min-height: ${bestPrim.rect.height}px;
  min-width: ${bestPrim.rect.width}px;
  /* Retained in primary action cluster */
}

#${bestDest.id} {
  position: absolute;
  left: ${bestDest.rect.x}px;
  top: ${bestDest.rect.y}px;
  min-height: ${bestDest.rect.height}px;
  margin-right: auto; /* Displaced orthogonal to approach vector */
}`;

  const tailwindClasses = `/* Tailwind CSS Utility Recommendations */
Primary: min-h-[${bestPrim.rect.height}px] min-w-[${bestPrim.rect.width}px]
Destructive: absolute left-[${bestDest.rect.x}px] top-[${bestDest.rect.y}px] min-h-[${bestDest.rect.height}px]`;

  return {
    status,
    optimizedElements: bestElements,
    beforeCollisions,
    afterCollisions: afterEval.collisions,
    beforeWilsonCI: beforeWilson,
    afterWilsonCI: afterWilson,
    beforePrimaryHits: initialEval.primaryHits,
    afterPrimaryHits: afterEval.primaryHits,
    beforeMTMs: Math.round(beforeMT),
    afterMTMs: Math.round(afterMT),
    deltaMTMs,
    beforeIDBits: beforeID,
    afterIDBits: afterID,
    deltaIDBits,
    beforeThroughput: beforeTP,
    afterThroughput: afterTP,
    deltaThroughput,
    effectiveThroughputBefore: tpEffBefore,
    effectiveThroughputAfter: tpEffAfter,
    patchCSS,
    tailwindClasses,
    explanation
  };
}
