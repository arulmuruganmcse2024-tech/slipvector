import { describe, it, expect } from 'vitest';
import { createMulberry32 } from '../src/engine/prng.ts';
import { wilsonInterval, formatWilsonCI } from '../src/engine/stats.ts';
import {
  calculateFittsLaw,
  simulateSingleTrial,
  computeEffectiveTargetWidth,
  MotorProfile,
  Rect,
  UIElement
} from '../src/engine/biomechanics.ts';
import { PRESETS, MOTOR_PROFILES } from '../src/engine/presets.ts';
import { evaluateStaticChecks, STATIC_CHECK_AA_NAME, STATIC_CHECK_AAA_NAME } from '../src/engine/staticChecks.ts';
import { solveLayout } from '../src/engine/solver.ts';

describe('1. PRNG & Determinism Suite', () => {
  it('guarantees bit-for-bit reproducibility with identical seeds', () => {
    const prng1 = createMulberry32(4242);
    const prng2 = createMulberry32(4242);

    const values1 = Array.from({ length: 50 }, () => prng1());
    const values2 = Array.from({ length: 50 }, () => prng2());

    expect(values1).toEqual(values2);
  });

  it('produces distinct distributions across distinct seeds', () => {
    const prngA = createMulberry32(1111);
    const prngB = createMulberry32(9999);

    const valA = prngA();
    const valB = prngB();

    expect(valA).not.toEqual(valB);
  });
});

describe('2. Wilson Score 95% Confidence Interval Suite', () => {
  it('accurately computes analytical upper bound for zero collisions (k=0, n=500)', () => {
    const ci = wilsonInterval(0, 500);

    // Analytical upper bound: z^2 / (n + z^2) = (1.959964^2) / (500 + 1.959964^2) ~= 0.0076243
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBeCloseTo(0.00762, 4);

    const formatted = formatWilsonCI(ci, 0, 500);
    expect(formatted).toBe('0 / 500 collisions (0.00%, 95% CI upper bound: 0.76%)');
  });

  it('honors strict boundary invariant 0 <= lower <= proportion <= upper <= 1 for all k in [0, n]', () => {
    const testCases = [
      { k: 0, n: 500 },
      { k: 1, n: 500 },
      { k: 15, n: 500 },
      { k: 250, n: 500 },
      { k: 499, n: 500 },
      { k: 500, n: 500 },
      { k: 0, n: 2000 },
      { k: 48, n: 2000 },
      { k: 2000, n: 2000 },
      { k: 0, n: 10000 },
      { k: 340, n: 10000 }
    ];

    for (const { k, n } of testCases) {
      const ci = wilsonInterval(k, n);
      expect(ci.lower).toBeGreaterThanOrEqual(0);
      expect(ci.lower).toBeLessThanOrEqual(ci.proportion);
      expect(ci.proportion).toBeLessThanOrEqual(ci.upper);
      expect(ci.upper).toBeLessThanOrEqual(1);
    }
  });
});

describe('3. Biomechanical Calibration Sanity Check (MacKenzie 1992 Empirical Baseline)', () => {
  it('Throughput lands inside human mouse pointing band of 3.0 to 6.5 bits/s across standard distances & widths', () => {
    const testGrid: { D: number; W: number }[] = [
      { D: 120, W: 64 },
      { D: 160, W: 48 },
      { D: 200, W: 40 },
      { D: 240, W: 32 },
      { D: 280, W: 28 },
      { D: 320, W: 24 }
    ];

    for (const { D, W } of testGrid) {
      const metrics = calculateFittsLaw(D, W);
      const tp = metrics.throughputBitsPerSec;

      // MacKenzie (1992) human mouse pointing throughput range: 3.0 to 6.5 bits/s
      expect(tp).toBeGreaterThanOrEqual(3.0);
      expect(tp).toBeLessThanOrEqual(6.5);
    }
  });

  it('effective target width along approach angle correctly projects rectangle', () => {
    const target: Rect = { x: 100, y: 100, width: 80, height: 40 };

    // Pure horizontal approach (theta = 0)
    const wHoriz = computeEffectiveTargetWidth(target, 0);
    expect(wHoriz).toBeCloseTo(80, 1);

    // Pure vertical approach (theta = pi/2)
    const wVert = computeEffectiveTargetWidth(target, Math.PI / 2);
    expect(wVert).toBeCloseTo(40, 1);
  });
});

describe('4. Metamorphic Invariants Suite', () => {
  const saasPreset = PRESETS.find(p => p.id === 'saas-modal')!;
  const anchorEl = saasPreset.elements.find(e => e.role === 'anchor')!;
  const primaryEl = saasPreset.elements.find(e => e.role === 'primary')!;
  const destructiveEl = saasPreset.elements.find(e => e.role === 'destructive')!;

  it('Invariant 1: Amplitude Monotonicity — increasing tremor amplitude never decreases destructive collision rate', () => {
    const seeds = [101, 202, 303, 404, 505];
    const N = 500;

    const baseProfile: MotorProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      frequency: 6.0,
      amplitude: 0,
      jerkImpulse: 0,
      urgency: 1.0,
      overshootRatio: 1.5,
      description: 'Zero tremor baseline'
    };

    const highTremorProfile: MotorProfile = {
      ...baseProfile,
      amplitude: 18.0
    };

    let totalBaseCollisions = 0;
    let totalHighCollisions = 0;

    for (const seed of seeds) {
      const prngBase = createMulberry32(seed);
      let baseCols = 0;
      for (let i = 0; i < N; i++) {
        const res = simulateSingleTrial(anchorEl.rect, primaryEl.rect, destructiveEl.rect, [], baseProfile, prngBase);
        if (res.hitType === 'destructive') baseCols++;
      }
      totalBaseCollisions += baseCols;

      const prngHigh = createMulberry32(seed);
      let highCols = 0;
      for (let i = 0; i < N; i++) {
        const res = simulateSingleTrial(anchorEl.rect, primaryEl.rect, destructiveEl.rect, [], highTremorProfile, prngHigh);
        if (res.hitType === 'destructive') highCols++;
      }
      totalHighCollisions += highCols;
    }

    const avgBase = totalBaseCollisions / seeds.length;
    const avgHigh = totalHighCollisions / seeds.length;

    // Amplitude monotonicity: tremor excursion increases or maintains destructive collisions
    expect(avgHigh).toBeGreaterThanOrEqual(avgBase);
  });

  it('Invariant 2: Target Width Monotonicity — expanding primary width increases or maintains primary hit rate without Fitts variance paradox', () => {
    const seed = 777;
    const N = 1000;
    const profile = MOTOR_PROFILES.find(p => p.id === 'essential-tremor')!;

    const narrowPrimaryRect: Rect = { x: 260, y: 200, width: 24, height: 28 };
    const widePrimaryRect: Rect = { x: 244, y: 200, width: 56, height: 28 }; // Same center x: 272

    const prng1 = createMulberry32(seed);
    let narrowHits = 0;
    for (let i = 0; i < N; i++) {
      const res = simulateSingleTrial(anchorEl.rect, narrowPrimaryRect, null, [], profile, prng1);
      if (res.hitType === 'primary') narrowHits++;
    }

    const prng2 = createMulberry32(seed);
    let wideHits = 0;
    for (let i = 0; i < N; i++) {
      const res = simulateSingleTrial(anchorEl.rect, widePrimaryRect, null, [], profile, prng2);
      if (res.hitType === 'primary') wideHits++;
    }

    // Wider target must capture strictly more or equal ballistic endpoints
    expect(wideHits).toBeGreaterThan(narrowHits);
  });

  it('Invariant 3: Directional Approach Asymmetry under rho_overshoot = 1.5 — behind-primary collision > behind-anchor collision', () => {
    const seed = 888;
    const N = 1000;
    const profile = MOTOR_PROFILES.find(p => p.id === 'essential-tremor')!;

    const anchor: Rect = { x: 80, y: 150, width: 40, height: 40 };
    const target: Rect = { x: 280, y: 150, width: 40, height: 40 }; // Distance = 200px along +X, target right edge = 320

    // Destructive placed 6px directly behind target along approach vector (+X)
    const destructiveBehindTarget: Rect = { x: 326, y: 150, width: 48, height: 40 };

    // Destructive placed 6px behind anchor opposite approach vector (-X)
    const destructiveBehindAnchor: Rect = { x: 26, y: 150, width: 48, height: 40 };

    const prngForward = createMulberry32(seed);
    let forwardCollisions = 0;
    for (let i = 0; i < N; i++) {
      const res = simulateSingleTrial(anchor, target, destructiveBehindTarget, [], profile, prngForward);
      if (res.hitType === 'destructive') forwardCollisions++;
    }

    const prngBackward = createMulberry32(seed);
    let backwardCollisions = 0;
    for (let i = 0; i < N; i++) {
      const res = simulateSingleTrial(anchor, target, destructiveBehindAnchor, [], profile, prngBackward);
      if (res.hitType === 'destructive') backwardCollisions++;
    }

    // Ballistic scatter moves toward target with forward directional overshoot
    expect(forwardCollisions).toBeGreaterThan(0);
    expect(forwardCollisions).toBeGreaterThan(backwardCollisions);
  });
});

describe('5. Static WCAG Check & Preset #5 Verification', () => {
  it('correctly labels static checks with non-negotiable standard names', () => {
    const saasPreset = PRESETS.find(p => p.id === 'saas-modal')!;
    const res = evaluateStaticChecks(saasPreset.elements);

    expect(res.labelAA).toBe(STATIC_CHECK_AA_NAME);
    expect(res.labelAAA).toBe(STATIC_CHECK_AAA_NAME);
    expect(res.passAA).toBe(true); // 28px >= 24px
    expect(res.passAAA).toBe(false); // 28px < 44px
  });

  it('Preset #5 (48px WCAG AAA Stress Case) passes both AA and AAA static checks yet produces kinetic collisions', () => {
    const preset5 = PRESETS.find(p => p.id === 'wcag-aaa-stress')!;
    const staticRes = evaluateStaticChecks(preset5.elements);

    // Defeats the 28px strawman: Passes both WCAG AA and AAA!
    expect(staticRes.passAA).toBe(true);
    expect(staticRes.passAAA).toBe(true);

    // Now run kinetic simulation: verify collisions occur due to direct approach vector alignment
    const anchor = preset5.elements.find(e => e.role === 'anchor')!;
    const primary = preset5.elements.find(e => e.role === 'primary')!;
    const destructive = preset5.elements.find(e => e.role === 'destructive')!;
    const profile = MOTOR_PROFILES.find(p => p.id === 'essential-tremor')!;

    const prng = createMulberry32(42);
    let collisions = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const res = simulateSingleTrial(anchor.rect, primary.rect, destructive.rect, [], profile, prng);
      if (res.hitType === 'destructive') collisions++;
    }

    // Empirically produces collisions despite passing 48px WCAG AAA static checks
    expect(collisions).toBeGreaterThan(0);
  });
});

describe('6. Solver Honesty Suite (Solved vs Infeasible)', () => {
  it('successfully solves standard SaaS Modal layout to 0 collisions with certified receipt', () => {
    const saasPreset = PRESETS.find(p => p.id === 'saas-modal')!;
    const profile = MOTOR_PROFILES.find(p => p.id === 'essential-tremor')!;

    const result = solveLayout(saasPreset.elements, saasPreset.container, profile, 42, 500);

    expect(result.status).toBe('solved');
    expect(result.afterCollisions).toBe(0);
    expect(result.afterWilsonCI.lower).toBe(0);
    expect(result.patchCSS).toContain('min-height: 44px');
  });

  it('honestly reports infeasible on an intentionally cramped fixture and returns best achievable bound', () => {
    const crampedContainer = { width: 110, height: 70 };
    const crampedElements: UIElement[] = [
      { id: 'anchor', label: 'Field', role: 'anchor', rect: { x: 5, y: 5, width: 40, height: 16 } },
      { id: 'btn-prim', label: 'OK', role: 'primary', rect: { x: 5, y: 24, width: 44, height: 20 } },
      { id: 'btn-dest', label: 'DEL', role: 'destructive', rect: { x: 5, y: 46, width: 44, height: 20 } }
    ];

    const extremeTremor: MotorProfile = {
      id: 'extreme',
      name: 'Extreme Tremor',
      frequency: 6.0,
      amplitude: 22.0, // 22px amplitude inside 110px container
      jerkImpulse: 0,
      urgency: 1.5,
      overshootRatio: 2.0,
      description: 'Extreme test fixture'
    };

    const result = solveLayout(crampedElements, crampedContainer, extremeTremor, 42, 500);

    // Physically impossible to separate two 44px buttons with 22px tremor inside 110x70px container
    expect(result.status).toBe('infeasible');
    expect(result.explanation).toContain('physically constrain safe separation');
  });
});
