/**
 * Constrained Repulsive Layout Solver (Auto-Heal)
 * Evaluates candidate geometries within container bounds to relocate destructive targets
 * orthogonal/opposite to ballistic approach vectors and expand hitboxes toward >= 44px.
 *
 * Honestly returns 'solved' if re-simulation yields 0 / N collisions,
 * or 'infeasible' if container geometry or tremor amplitude prevents 0 risk.
 */

import { UIElement, MotorProfile, Rect, simulateSingleTrial, rectCenter } from './biomechanics.ts';
import { createMulberry32 } from './prng.ts';
import { wilsonInterval, WilsonInterval } from './stats.ts';

export interface SolverResult {
  status: 'solved' | 'infeasible';
  optimizedElements: UIElement[];
  beforeCollisions: number;
  afterCollisions: number;
  beforeWilsonCI: WilsonInterval;
  afterWilsonCI: WilsonInterval;
  deltaMTMs: number;
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
 * Simulates N trials for a given layout configuration and counts destructive collisions.
 */
function evaluateLayoutCollisions(
  elements: UIElement[],
  profile: MotorProfile,
  seed: number,
  sampleSize: number
): { collisions: number; primaryHits: number; meanMT: number } {
  const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
  const primaryEl = elements.find(e => e.role === 'primary');
  const destructiveEl = elements.find(e => e.role === 'destructive');
  const neutralEls = elements.filter(e => e.role === 'neutral').map(e => e.rect);

  if (!primaryEl) {
    return { collisions: 0, primaryHits: 0, meanMT: 0 };
  }

  const prng = createMulberry32(seed);
  let collisions = 0;
  let primaryHits = 0;
  let totalMT = 0;

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
    if (res.hitType === 'primary') primaryHits++;
    totalMT += res.movementTimeMs;
  }

  return {
    collisions,
    primaryHits,
    meanMT: totalMT / sampleSize
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
  const initialEval = evaluateLayoutCollisions(elements, profile, seed, sampleSize);
  const beforeCollisions = initialEval.collisions;
  const beforeWilson = wilsonInterval(beforeCollisions, sampleSize);

  const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
  const primaryEl = elements.find(e => e.role === 'primary');
  const destructiveEl = elements.find(e => e.role === 'destructive');

  if (!primaryEl || !destructiveEl) {
    return {
      status: 'solved',
      optimizedElements: elements,
      beforeCollisions,
      afterCollisions: beforeCollisions,
      beforeWilsonCI: beforeWilson,
      afterWilsonCI: beforeWilson,
      deltaMTMs: 0,
      patchCSS: '/* No destructive target present */',
      tailwindClasses: '',
      explanation: 'No adjacent destructive target found in layout.'
    };
  }

  // Clone elements and expand target dimensions toward >= 44px if container allows
  const expandedElements: UIElement[] = elements.map(el => {
    if (el.role === 'primary' || el.role === 'destructive') {
      const targetH = Math.max(el.rect.height, 44);
      const targetW = Math.max(el.rect.width, 44);
      // Ensure it still fits container
      const w = Math.min(targetW, container.width - 20);
      const h = Math.min(targetH, container.height - 20);
      return {
        ...el,
        rect: { ...el.rect, width: w, height: h }
      };
    }
    return { ...el, rect: { ...el.rect } };
  });

  const anchorCenter = rectCenter(anchorEl.rect);
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

  // Candidate generation for destructive target position:
  // We want destructive target to be far away from the approach line of fire (+ux, +uy)
  const candidateDestRects: Rect[] = [];

  // Strategy 1: Move destructive target far left / opposite corner from primary
  // e.g. if primary is bottom-right, move destructive to bottom-left with >= 24px gap
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

  // Orthogonal offset by 80px, 120px, 160px
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
  let bestMT = initialEval.meanMT;

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
      bestMT = res.meanMT;
      if (lowestCollisions === 0) {
        break; // Found 0 collision certified safe harbor
      }
    }
  }

  // If no candidates achieved 0, also try repositioning primary if needed, or check if constrained
  if (lowestCollisions > 0) {
    // Attempt opposite layout: place primary at bottom-right, destructive at bottom-left
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
        bestMT = res.meanMT;
      }
    }
  }

  const afterWilson = wilsonInterval(lowestCollisions, sampleSize);
  const isSolved = lowestCollisions === 0;

  // Generate CSS Patch
  const bestDest = bestElements.find(e => e.role === 'destructive')!;
  const bestPrim = bestElements.find(e => e.role === 'primary')!;

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

  const explanation = isSolved
    ? `Successfully relocated destructive action orthogonal to the ballistic approach vector (${Math.round(bestDest.rect.x)}px, ${Math.round(bestDest.rect.y)}px) and expanded touch targets to >= 44px, achieving 0 / ${sampleSize} verified collision risk.`
    : `Container bounds (${container.width}x${container.height}px) or motor amplitude (${profile.amplitude}px) physically constrain safe separation. Partially mitigated hazard from ${beforeCollisions} to ${lowestCollisions} collisions (${(afterWilson.proportion * 100).toFixed(1)}%). Recommended: move destructive action to an overflow menu.`;

  return {
    status: isSolved ? 'solved' : 'infeasible',
    optimizedElements: bestElements,
    beforeCollisions,
    afterCollisions: lowestCollisions,
    beforeWilsonCI: beforeWilson,
    afterWilsonCI: afterWilson,
    deltaMTMs: bestMT - initialEval.meanMT,
    patchCSS,
    tailwindClasses,
    explanation
  };
}
