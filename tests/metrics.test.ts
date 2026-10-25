import { describe, it, expect } from 'vitest';
import { PRESETS, MOTOR_PROFILES } from '../src/engine/presets.ts';
import { solveLayout } from '../src/engine/solver.ts';
import { simulateSingleTrial, computeEffectiveFittsMetrics } from '../src/engine/biomechanics.ts';
import { createMulberry32 } from '../src/engine/prng.ts';
import { wilsonInterval, formatWilsonCI, standardDeviation } from '../src/engine/stats.ts';
import { evaluateStaticChecks } from '../src/engine/staticChecks.ts';

describe('Empirical Verification Summary Across All 5 Presets', () => {
  it('computes and logs live empirical telemetry before and after Auto-Heal with full partition verification', () => {
    console.log('\n================================================================');
    console.log('   SLIPVECTOR EMPIRICAL VERIFICATION REPORT (5 PRESETS)');
    console.log('================================================================\n');

    for (const preset of PRESETS) {
      const profile = MOTOR_PROFILES.find(p => p.id === preset.recommendedProfileId) || MOTOR_PROFILES[0];
      const N = preset.defaultSampleSize ?? 500;
      const seed = 42;

      const staticRes = evaluateStaticChecks(preset.elements);

      const anchor = preset.elements.find(e => e.role === 'anchor') || preset.elements[0];
      const primary = preset.elements.find(e => e.role === 'primary')!;
      const destructive = preset.elements.find(e => e.role === 'destructive');
      const neutrals = preset.elements.filter(e => e.role === 'neutral').map(e => e.rect);

      const anchorCenter = { x: anchor.rect.x + anchor.rect.width / 2, y: anchor.rect.y + anchor.rect.height / 2 };
      const primCenter = { x: primary.rect.x + primary.rect.width / 2, y: primary.rect.y + primary.rect.height / 2 };
      const dx = primCenter.x - anchorCenter.x;
      const dy = primCenter.y - anchorCenter.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / dist;
      const uy = dy / dist;

      const prngBefore = createMulberry32(seed);
      let beforeCols = 0;
      let beforeHits = 0;
      let beforeNeutrals = 0;
      let totalMT = 0;
      const parallelDeltas: number[] = new Array(N);

      for (let i = 0; i < N; i++) {
        const res = simulateSingleTrial(
          anchor.rect,
          primary.rect,
          destructive ? destructive.rect : null,
          neutrals,
          profile,
          prngBefore
        );
        if (res.hitType === 'destructive') beforeCols++;
        else if (res.hitType === 'primary') beforeHits++;
        else beforeNeutrals++;

        totalMT += res.movementTimeMs;
        parallelDeltas[i] = (res.endX - primCenter.x) * ux + (res.endY - primCenter.y) * uy;
      }

      // Invariant: Partition must strictly sum to N
      expect(beforeHits + beforeCols + beforeNeutrals).toBe(N);

      const beforeCI = wilsonInterval(beforeCols, N);
      const meanMT = totalMT / N;
      const sdPar = standardDeviation(parallelDeltas);
      const eff = computeEffectiveFittsMetrics(dist, primary.rect.width, sdPar, meanMT);

      const solved = solveLayout(preset.elements, preset.container, profile, seed, N);

      // Verify solver status contract:
      if (beforeCols === 0) {
        expect(solved.status).toBe('no_change_needed');
      } else if (solved.afterCollisions === 0) {
        expect(solved.status).toBe('solved');
      } else {
        expect(solved.status).toBe('infeasible');
      }

      const mtText = Math.abs(solved.deltaMTMs) < 1
        ? '0 ms (no change)'
        : `${solved.deltaMTMs >= 0 ? '+' : ''}${Math.round(solved.deltaMTMs)} ms (${solved.beforeMTMs} ms -> ${solved.afterMTMs} ms)`;

      console.log(`>>> ${preset.name}`);
      console.log(`    Subtitle: ${preset.subtitle}`);
      console.log(`    Static Checks: WCAG AA (≥24px): ${staticRes.passAA ? 'PASS' : 'FAIL'} | WCAG AAA (≥44px): ${staticRes.passAAA ? 'PASS' : 'FAIL'}`);
      console.log(`    Motor Profile: ${profile.name} (freq: ${profile.frequency}Hz, amp: ${profile.amplitude}px, overshoot: ${profile.overshootRatio}x)`);
      console.log(`    [BEFORE Auto-Heal, N = ${N}]:`);
      console.log(`      Collisions:    ${formatWilsonCI(beforeCI, beforeCols, N)}`);
      console.log(`      Primary Hits:  ${beforeHits} / ${N} (${((beforeHits / N) * 100).toFixed(1)}%)`);
      console.log(`      Neutral Miss:  ${beforeNeutrals} / ${N} (${((beforeNeutrals / N) * 100).toFixed(1)}%)`);
      console.log(`      Check Sum:     ${beforeHits + beforeCols + beforeNeutrals} / ${N} (100.0%)`);
      console.log(`      Nominal TP:    ${eff.nominalThroughputBitsPerSec.toFixed(2)} bits/s | Effective TP (We=4.133·SD): ${eff.effectiveThroughputBitsPerSec.toFixed(2)} bits/s`);
      console.log(`      Movement Time: ${Math.round(meanMT)} ms | Nominal ID: ${eff.nominalIDBits.toFixed(2)} bits | Effective We: ${eff.effectiveWidth.toFixed(1)}px`);
      console.log(`    [AFTER Auto-Heal]:`);
      console.log(`      Solver Status: ${solved.status.toUpperCase()}`);
      console.log(`      Collisions:    ${formatWilsonCI(solved.afterWilsonCI, solved.afterCollisions, N)}`);
      console.log(`      Primary Hits:  ${solved.afterPrimaryHits} / ${N} (${((solved.afterPrimaryHits / N) * 100).toFixed(1)}%)`);
      console.log(`      Routine MT:    ${mtText}`);
      console.log(`      Explanation:   ${solved.explanation}\n`);
    }
  });
});
