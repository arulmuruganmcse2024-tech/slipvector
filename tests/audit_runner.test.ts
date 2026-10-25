import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PRESETS, MOTOR_PROFILES } from '../src/engine/presets.ts';
import {
  simulateSingleTrial,
  computeEffectiveTargetWidth,
  calculateFittsLaw,
  computeEffectiveFittsMetrics,
  Rect,
  AIM_NOISE_K,
  rectCenter
} from '../src/engine/biomechanics.ts';
import { createMulberry32 } from '../src/engine/prng.ts';
import { wilsonInterval, mean, standardDeviation } from '../src/engine/stats.ts';
import { solveLayout } from '../src/engine/solver.ts';

describe('Step 2: Numeric & Model Integrity Audit Suite', () => {
  const SEED = 42;
  const N = 10000;

  it('1. Computes live empirical results for all 5 presets at N=10,000 with exact partition P + D + M = N', () => {
    const results: any[] = [];
    const markdownRows: string[] = [];

    markdownRows.push('# SlipVector Pre-Submission Empirical Audit: N=10,000 Results Table');
    markdownRows.push('');
    markdownRows.push(`**Fixed Pseudorandom Seed:** \`${SEED}\`  `);
    markdownRows.push(`**Sample Size:** \`N = ${N.toLocaleString()}\` trials per preset  `);
    markdownRows.push(`**Engine Aim Noise Coefficient:** \`k_aim = ${AIM_NOISE_K}\` (calibrated against MacKenzie 1992 baseline)  `);
    markdownRows.push(`**Effective Width Formulation:** \`W_e = 4.133 * SD_parallel\` (ISO 9241-9 / Soukoreff & MacKenzie 2004)  `);
    markdownRows.push('');
    markdownRows.push('| # | Preset Layout | Profile | Primary Hits | Destructive Collisions (k/N, 95% CI) | Neutral Misses | Sum Check (P+D+M) | Nominal MT | Nominal ID | Nominal TP | Effective TP (We=4.133·SD) | Solver Status | Healed Collisions | Healed MT | Delta MT |');
    markdownRows.push('| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

    for (const preset of PRESETS) {
      const profile = MOTOR_PROFILES.find(pr => pr.id === preset.recommendedProfileId) || MOTOR_PROFILES[0];
      const elements = preset.elements.map(e => ({ ...e, rect: { ...e.rect } }));

      const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
      const primaryEl = elements.find(e => e.role === 'primary')!;
      const destructiveEl = elements.find(e => e.role === 'destructive');
      const neutralEls = elements.filter(e => e.role === 'neutral').map(e => e.rect);

      const anchorCenter = rectCenter(anchorEl.rect);
      const primaryCenter = rectCenter(primaryEl.rect);
      const dx = primaryCenter.x - anchorCenter.x;
      const dy = primaryCenter.y - anchorCenter.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / dist;
      const uy = dy / dist;

      const prng = createMulberry32(SEED);
      let primaryHits = 0;
      let destructiveCollisions = 0;
      let neutralMisses = 0;

      const movementTimes: number[] = new Array(N);
      const idBitsList: number[] = new Array(N);
      const tpList: number[] = new Array(N);
      const parallelDeltas: number[] = new Array(N);

      for (let i = 0; i < N; i++) {
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

        if (res.hitType === 'primary') {
          primaryHits++;
        } else if (res.hitType === 'destructive') {
          destructiveCollisions++;
        } else {
          neutralMisses++;
        }

        movementTimes[i] = res.movementTimeMs;
        idBitsList[i] = res.idBits;
        tpList[i] = res.throughputBitsPerSec;
        parallelDeltas[i] = (res.endX - primaryCenter.x) * ux + (res.endY - primaryCenter.y) * uy;
      }

      // STRICT PARTITION CHECK
      const partitionSum = primaryHits + destructiveCollisions + neutralMisses;
      expect(partitionSum).toBe(N);

      const destructiveCI = wilsonInterval(destructiveCollisions, N);
      const meanMT = mean(movementTimes);
      const meanID = mean(idBitsList);
      const meanTP = mean(tpList);

      const sdParallel = standardDeviation(parallelDeltas);
      const we = sdParallel > 0 ? 4.133 * sdParallel : primaryEl.rect.width;
      const idEff = Math.log2(dist / we + 1);
      const effectiveTP = (1000.0 * idEff) / Math.max(50, meanMT);

      // Execute constrained repulsive Auto-Heal solver at N=10,000
      const solverResult = solveLayout(elements, preset.container, profile, SEED, N);

      const deltaMT = solverResult.deltaMTMs;
      const healedCollisions = solverResult.afterCollisions;
      const healedStatus = solverResult.status.toUpperCase();

      results.push({
        preset_id: preset.id,
        preset_name: preset.name,
        motor_profile: profile.name,
        sample_size: N,
        seed: SEED,
        baseline: {
          primary_hits: primaryHits,
          primary_rate_percent: Number(((primaryHits / N) * 100).toFixed(2)),
          destructive_collisions: destructiveCollisions,
          destructive_rate_percent: Number((destructiveCI.proportion * 100).toFixed(2)),
          destructive_wilson_ci: {
            lower_percent: Number((destructiveCI.lower * 100).toFixed(2)),
            upper_percent: Number((destructiveCI.upper * 100).toFixed(2))
          },
          neutral_misses: neutralMisses,
          neutral_rate_percent: Number(((neutralMisses / N) * 100).toFixed(2)),
          partition_sum: partitionSum,
          mean_mt_ms: Math.round(meanMT),
          mean_id_bits: Number(meanID.toFixed(2)),
          nominal_throughput_bits_per_sec: Number(meanTP.toFixed(2)),
          effective_width_px: Number(we.toFixed(1)),
          effective_throughput_bits_per_sec: Number(effectiveTP.toFixed(2))
        },
        auto_heal: {
          status: solverResult.status,
          after_collisions: healedCollisions,
          after_primary_hits: solverResult.afterPrimaryHits,
          after_mt_ms: solverResult.afterMTMs,
          delta_mt_ms: Math.round(deltaMT),
          explanation: solverResult.explanation
        }
      });

      markdownRows.push(
        `| ${preset.name.split('.')[0]} | **${preset.name.split('. ')[1]}** | ${profile.name.split(' (')[0]} | ${primaryHits} (${((primaryHits/N)*100).toFixed(1)}%) | **${destructiveCollisions}** (${(destructiveCI.proportion*100).toFixed(2)}%, [${(destructiveCI.lower*100).toFixed(2)}%, ${(destructiveCI.upper*100).toFixed(2)}%]) | ${neutralMisses} (${((neutralMisses/N)*100).toFixed(1)}%) | **${partitionSum} / ${N}** | ${Math.round(meanMT)} ms | ${meanID.toFixed(2)} bits | ${meanTP.toFixed(2)} b/s | **${effectiveTP.toFixed(2)} b/s** | \`${healedStatus}\` | ${healedCollisions} / ${N} | ${solverResult.afterMTMs} ms | **${deltaMT >= 0 ? '+' : ''}${Math.round(deltaMT)} ms** |`
      );
    }

    markdownRows.push('');
    markdownRows.push('### Invariant Verifications');
    markdownRows.push('- **Partition Strict Invariant:** $\\text{Primary Hits} + \\text{Destructive Collisions} + \\text{Neutral Misses} = N$ identically for all presets.');
    markdownRows.push('- **Dynamic Throughput:** Both Nominal Throughput and Effective Throughput ($W_e = 4.133 \\cdot SD_\\parallel$) are computed dynamically from actual trajectory endpoints.');
    markdownRows.push('- **Dynamic Movement Time:** $\\Delta MT$ is recomputed dynamically from the post-heal target geometry.');

    const docsDir = path.resolve(process.cwd(), 'docs/audit');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    fs.writeFileSync(path.join(docsDir, 'results_table.md'), markdownRows.join('\n'), 'utf8');
    fs.writeFileSync(path.join(docsDir, 'results.json'), JSON.stringify(results, null, 2), 'utf8');

    console.log(`✓ Saved empirical results to docs/audit/results_table.md and docs/audit/results.json (${results.length} presets at N=${N})`);
  });

  it('2. Evaluates out-of-sample calibration at W=20px, D=500px under Steady Baseline without retuning', () => {
    const profile = MOTOR_PROFILES[0]; // Steady Baseline
    const anchorRect: Rect = { x: 30, y: 100, width: 60, height: 40 };
    const targetRect: Rect = { x: 530, y: 100, width: 20, height: 20 }; // W=20, D=500
    const prng = createMulberry32(SEED);

    let hits = 0;
    let misses = 0;
    const movementTimes: number[] = new Array(N);

    for (let i = 0; i < N; i++) {
      const res = simulateSingleTrial(
        anchorRect,
        targetRect,
        null,
        [],
        profile,
        prng,
        90.0,
        false
      );

      if (res.hitType === 'primary') {
        hits++;
      } else {
        misses++;
      }
      movementTimes[i] = res.movementTimeMs;
    }

    const errorRate = misses / N;
    const meanMT = mean(movementTimes);
    const id = Math.log2(500 / 20 + 1);

    console.log(`\n================================================================`);
    console.log(`   OUT-OF-SAMPLE CALIBRATION RESULT (W=20px, D=500px)`);
    console.log(`================================================================`);
    console.log(`Trials: ${N.toLocaleString()}`);
    console.log(`Hits:   ${hits} / ${N} (${((hits/N)*100).toFixed(2)}%)`);
    console.log(`Misses: ${misses} / ${N} (${((misses/N)*100).toFixed(2)}%)`);
    console.log(`Empirical Error Rate: ${(errorRate * 100).toFixed(2)}%`);
    console.log(`Fitts ID: ${id.toFixed(2)} bits`);
    console.log(`Mean MT:  ${Math.round(meanMT)} ms`);
    console.log(`Throughput: ${((1000 * id) / meanMT).toFixed(2)} bits/s`);
    console.log(`================================================================\n`);

    // Verify partition
    expect(hits + misses).toBe(N);
    // Honest check: with W=20px, D=500px (ID=4.70 bits), error rate is 71.40% without artificial constant tuning.
    expect(errorRate).toBeCloseTo(0.714, 2);
  });

  it('3. Guarantees byte-identical reproducibility on identical seeds', () => {
    const preset = PRESETS[0];
    const profile = MOTOR_PROFILES[1];

    const run = (seed: number) => {
      const prng = createMulberry32(seed);
      const endpoints: number[] = [];
      for (let i = 0; i < 200; i++) {
        const res = simulateSingleTrial(
          preset.elements[0].rect,
          preset.elements[1].rect,
          preset.elements[2].rect,
          [],
          profile,
          prng
        );
        endpoints.push(res.endX, res.endY);
      }
      return endpoints;
    };

    const runA = run(12345);
    const runB = run(12345);
    expect(runA).toEqual(runB);
  });

  it('4. Zero-size and overlapping element robustness: Never produces NaN, Infinity, or uncaught errors', () => {
    const profile = MOTOR_PROFILES[0];
    const prng = createMulberry32(999);

    // Test zero-width and zero-height
    const zeroRect: Rect = { x: 100, y: 100, width: 0, height: 0 };
    const negativeRect: Rect = { x: 100, y: 100, width: -10, height: -10 };
    const targetRect: Rect = { x: 100, y: 100, width: 40, height: 40 };

    const wEffZero = computeEffectiveTargetWidth(zeroRect, 0);
    expect(Number.isFinite(wEffZero)).toBe(true);
    expect(wEffZero).toBeGreaterThan(0);

    const wEffNeg = computeEffectiveTargetWidth(negativeRect, 0);
    expect(Number.isFinite(wEffNeg)).toBe(true);
    expect(wEffNeg).toBeGreaterThan(0);

    const fittsZero = calculateFittsLaw(0, 0);
    expect(Number.isFinite(fittsZero.movementTimeMs)).toBe(true);
    expect(Number.isFinite(fittsZero.idBits)).toBe(true);
    expect(Number.isFinite(fittsZero.throughputBitsPerSec)).toBe(true);

    const metricsZero = computeEffectiveFittsMetrics(0, 0, 0, 0);
    expect(Number.isFinite(metricsZero.effectiveWidth)).toBe(true);
    expect(Number.isFinite(metricsZero.effectiveThroughputBitsPerSec)).toBe(true);

    // Completely overlapping anchor & target
    const resOverlap = simulateSingleTrial(
      targetRect,
      targetRect,
      zeroRect,
      [],
      profile,
      prng
    );
    expect(Number.isFinite(resOverlap.endX)).toBe(true);
    expect(Number.isFinite(resOverlap.endY)).toBe(true);
    expect(Number.isFinite(resOverlap.movementTimeMs)).toBe(true);
  });
});
