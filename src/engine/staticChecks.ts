/**
 * Static Accessibility Target-Size Evaluator
 * Non-negotiable naming requirement:
 *  - WCAG 2.2 SC 2.5.8 (AA Target Size >= 24x24px) — SlipVector Static Check
 *  - WCAG 2.2 SC 2.5.5 (AAA Target Size >= 44x44px) — SlipVector Static Check
 * Transparent disclaimer:
 *  "Static target-size checks evaluate buttons in isolation and do not model movement trajectories or approach vectors."
 */

import { UIElement, Rect } from './biomechanics.ts';

export interface ElementStaticResult {
  id: string;
  label: string;
  role: string;
  rect: Rect;
  passAA: boolean; // width >= 24 and height >= 24
  passAAA: boolean; // width >= 44 and height >= 44
  minEdgeDistance: number;
}

export interface StaticAuditResult {
  passAA: boolean;
  passAAA: boolean;
  labelAA: string;
  labelAAA: string;
  minTargetDimensions: { width: number; height: number };
  elements: ElementStaticResult[];
  disclaimer: string;
}

export const STATIC_CHECK_AA_NAME = 'WCAG 2.2 SC 2.5.8 (AA Target Size >= 24x24px) — SlipVector Static Check';
export const STATIC_CHECK_AAA_NAME = 'WCAG 2.2 SC 2.5.5 (AAA Target Size >= 44x44px) — SlipVector Static Check';
export const STATIC_CHECK_DISCLAIMER = 'Static target-size checks evaluate buttons in isolation and do not model movement trajectories or approach vectors.';

/**
 * Calculates edge-to-edge distance between two axis-aligned bounding rectangles.
 * Returns 0 if rectangles intersect or touch.
 */
export function edgeDistance(r1: Rect, r2: Rect): number {
  const left = r2.x > r1.x + r1.width;
  const right = r1.x > r2.x + r2.width;
  const bottom = r1.y > r2.y + r2.height;
  const top = r2.y > r1.y + r1.height;

  if (top) {
    if (left) return Math.hypot((r2.x) - (r1.x + r1.width), (r2.y) - (r1.y + r1.height));
    if (right) return Math.hypot((r1.x) - (r2.x + r2.width), (r2.y) - (r1.y + r1.height));
    return r2.y - (r1.y + r1.height);
  } else if (bottom) {
    if (left) return Math.hypot((r2.x) - (r1.x + r1.width), (r1.y) - (r2.y + r2.height));
    if (right) return Math.hypot((r1.x) - (r2.x + r2.width), (r1.y) - (r2.y + r2.height));
    return r1.y - (r2.y + r2.height);
  } else {
    if (left) return r2.x - (r1.x + r1.width);
    if (right) return r1.x - (r2.x + r2.width);
    return 0; // Overlapping
  }
}

/**
 * Performs static accessibility target size analysis across all interactive elements.
 */
export function evaluateStaticChecks(elements: UIElement[]): StaticAuditResult {
  const interactive = elements.filter(e => e.role === 'primary' || e.role === 'destructive' || e.role === 'neutral');

  let passAA = true;
  let passAAA = true;
  let minW = Infinity;
  let minH = Infinity;

  const elementResults: ElementStaticResult[] = interactive.map(el => {
    const elPassAA = el.rect.width >= 24 && el.rect.height >= 24;
    const elPassAAA = el.rect.width >= 44 && el.rect.height >= 44;

    if (!elPassAA) passAA = false;
    if (!elPassAAA) passAAA = false;

    if (el.rect.width < minW) minW = el.rect.width;
    if (el.rect.height < minH) minH = el.rect.height;

    // Minimum distance to any other element
    let minDist = Infinity;
    for (const other of elements) {
      if (other.id === el.id) continue;
      const d = edgeDistance(el.rect, other.rect);
      if (d < minDist) minDist = d;
    }

    return {
      id: el.id,
      label: el.label,
      role: el.role,
      rect: el.rect,
      passAA: elPassAA,
      passAAA: elPassAAA,
      minEdgeDistance: minDist === Infinity ? 0 : minDist
    };
  });

  return {
    passAA,
    passAAA,
    labelAA: STATIC_CHECK_AA_NAME,
    labelAAA: STATIC_CHECK_AAA_NAME,
    minTargetDimensions: {
      width: minW === Infinity ? 0 : minW,
      height: minH === Infinity ? 0 : minH
    },
    elements: elementResults,
    disclaimer: STATIC_CHECK_DISCLAIMER
  };
}
