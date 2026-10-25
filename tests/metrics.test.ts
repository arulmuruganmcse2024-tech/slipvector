import { describe, it } from 'vitest';
import { PRESETS, MOTOR_PROFILES } from '../src/engine/presets.ts';
import { solveLayout } from '../src/engine/solver.ts';
import { simulateSingleTrial } from '../src/engine/biomechanics.ts';
import { createMulberry32 } from '../src/engine/prng.ts';
import { wilsonInterval, formatWilsonCI } from '../src/engine/stats.ts';
import { evaluateStaticChecks } from '../src/engine/staticChecks.ts';

describe('Empirical Verification Summary Across All 5 Presets', () => {
  it('computes and logs live empirical telemetry before and after Auto-Heal', () => {
    console.log('\n================================================================');
    console.log('   SLIPVECTOR EMPIRICAL VERIFICATION REPORT (5 PRESETS, N = 500)');
    console.log('================================================================\n');

    for (const preset of PRESETS) {
      const profile = MOTOR_PROFILES.find(p => p.id === preset.recommendedProfileId) || MOTOR_PROFILES[0];
      const N = 500;
      const seed = 42;

      const staticRes = evaluateStaticChecks(preset.elements);

      const anchor = preset.elements.find(e => e.role === 'anchor') || preset.elements[0];
      const primary = preset.elements.find(e => e.role === 'primary')!;
      const destructive = preset.elements.find(e => e.role === 'destructive');
      const neutrals = preset.elements.filter(e => e.role === 'neutral').map(e => e.rect);

      const prngBefore = createMulberry32(seed);
      let beforeCols = 0;
      let beforeHits = 0;
      let totalMT = 0;
      let totalTP = 0;
      let totalID = 0;

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
        if (res.hitType === 'primary') beforeHits++;
        totalMT += res.movementTimeMs;
        totalTP += res.throughputBitsPerSec;
        totalID += res.idBits;
      }

      const beforeCI = wilsonInterval(beforeCols, N);
      const meanMT = Math.round(totalMT / N);
      const meanTP = (totalTP / N).toFixed(2);
      const meanID = (totalID / N).toFixed(2);

      const solved = solveLayout(preset.elements, preset.container, profile, seed, N);

      console.log(`>>> ${preset.name}`);
      console.log(`    Subtitle: ${preset.subtitle}`);
      console.log(`    Static Checks: WCAG AA (≥24px): ${staticRes.passAA ? 'PASS' : 'FAIL'} | WCAG AAA (≥44px): ${staticRes.passAAA ? 'PASS' : 'FAIL'}`);
      console.log(`    Motor Profile: ${profile.name} (freq: ${profile.frequency}Hz, amp: ${profile.amplitude}px, overshoot: ${profile.overshootRatio}x)`);
      console.log(`    [BEFORE Auto-Heal]:`);
      console.log(`      Collisions:   ${formatWilsonCI(beforeCI, beforeCols, N)}`);
      console.log(`      Primary Hits: ${beforeHits} / ${N} (${((beforeHits / N) * 100).toFixed(1)}%)`);
      console.log(`      Throughput:   ${meanTP} bits/s | Movement Time: ${meanMT} ms | ID: ${meanID} bits`);
      console.log(`    [AFTER Auto-Heal]:`);
      console.log(`      Solver Status: ${solved.status.toUpperCase()}`);
      console.log(`      Collisions:    ${formatWilsonCI(solved.afterWilsonCI, solved.afterCollisions, N)}`);
      console.log(`      Delta MT:      ${solved.deltaMTMs >= 0 ? '+' : ''}${Math.round(solved.deltaMTMs)} ms`);
      console.log(`      Explanation:   ${solved.explanation}\n`);
    }
  });
});
