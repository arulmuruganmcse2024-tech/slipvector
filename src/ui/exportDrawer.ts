/**
 * Export Suite Component
 * Provides copyable production CSS patches, Tailwind utility classes,
 * and downloadable reproducible JSON Audit Receipts.
 */

import { SolverResult } from '../engine/solver.ts';
import { MotorProfile, UIElement } from '../engine/biomechanics.ts';
import { WorkerResponse } from '../worker/simWorker.ts';

export interface ExportDataConfig {
  presetName: string;
  container: { width: number; height: number };
  elementsBefore: UIElement[];
  elementsAfter: UIElement[];
  profile: MotorProfile;
  seed: number;
  sampleSize: number;
  simResult: WorkerResponse | null;
  solverResult: SolverResult | null;
}

export function generateAuditReceiptJSON(config: ExportDataConfig): string {
  const receipt = {
    slipvector_audit_receipt: {
      generator: 'SlipVector v1.0.0 (Browser-Native Kinetic UI Misclick Auditor)',
      generated_at: new Date().toISOString(),
      disclaimer: 'Model-based ergonomic screening tool using parametric pointing models; not a clinical diagnostic instrument or a substitute for usability testing with human participants.'
    },
    audit_configuration: {
      layout_preset: config.presetName,
      container_dimensions_px: config.container,
      pseudorandom_seed: config.seed,
      sample_size_trials: config.sampleSize,
      motor_variability_profile: {
        name: config.profile.name,
        tremor_frequency_hz: config.profile.frequency,
        tremor_amplitude_px: config.profile.amplitude,
        transit_jerk_impulse_px: config.profile.jerkImpulse,
        urgency_multiplier: config.profile.urgency,
        directional_overshoot_ratio: config.profile.overshootRatio
      }
    },
    empirical_results: {
      baseline: {
        destructive_collisions: config.simResult ? config.simResult.destructiveCollisions : null,
        total_trials: config.sampleSize,
        collision_rate_percent: config.simResult ? (config.simResult.destructiveWilsonCI.proportion * 100).toFixed(2) : null,
        wilson_95_confidence_interval: config.simResult ? {
          lower_bound_percent: (config.simResult.destructiveWilsonCI.lower * 100).toFixed(2),
          upper_bound_percent: (config.simResult.destructiveWilsonCI.upper * 100).toFixed(2)
        } : null,
        mean_movement_time_ms: config.simResult ? Math.round(config.simResult.meanMTMs) : null,
        mean_throughput_bits_per_sec: config.simResult ? config.simResult.meanTPBitsPerSec.toFixed(2) : null
      },
      healed: config.solverResult ? {
        status: config.solverResult.status,
        destructive_collisions_after: config.solverResult.afterCollisions,
        collision_rate_percent: (config.solverResult.afterWilsonCI.proportion * 100).toFixed(2),
        wilson_95_confidence_interval: {
          lower_bound_percent: (config.solverResult.afterWilsonCI.lower * 100).toFixed(2),
          upper_bound_percent: (config.solverResult.afterWilsonCI.upper * 100).toFixed(2)
        },
        routine_interaction_time_delta_ms: Math.round(config.solverResult.deltaMTMs)
      } : null
    },
    layout_geometry: {
      initial_elements: config.elementsBefore,
      healed_elements: config.elementsAfter
    },
    code_patches: {
      css_patch: config.solverResult ? config.solverResult.patchCSS : '',
      tailwind_recommendations: config.solverResult ? config.solverResult.tailwindClasses : ''
    },
    scientific_citations: [
      'Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement.',
      'Schmidt, R. A., et al. (1979). Motor-output variability: A theory for the accuracy of rapid motor acts.',
      'Meyer, D. E., et al. (1988). Optimality in human motor performance: Ideal rapidly aimed movements.',
      'MacKenzie, I. S. (1992). Fitts\' law as a research and design tool in human-computer interaction.'
    ]
  };

  return JSON.stringify(receipt, null, 2);
}

export function renderExportSection(
  containerEl: HTMLElement,
  config: ExportDataConfig
): void {
  const cssPatch = config.solverResult ? config.solverResult.patchCSS : '/* Run Auto-Heal solver to generate CSS patch */';
  const tailwindClasses = config.solverResult ? config.solverResult.tailwindClasses : '/* Run Auto-Heal solver for Tailwind classes */';

  containerEl.innerHTML = `
    <div class="export-suite-card">
      <div class="export-header">
        <span class="panel-section-title">Production Fixes & Audit Receipt</span>
      </div>

      <div class="export-buttons-row">
        <button id="btn-copy-css" class="btn-export">
          <span>📋</span> Copy CSS Patch
        </button>
        <button id="btn-copy-tailwind" class="btn-export">
          <span>🎨</span> Copy Tailwind Classes
        </button>
        <button id="btn-download-json" class="btn-export btn-export-json">
          <span>💾</span> Download JSON Audit Receipt
        </button>
      </div>

      <div id="export-toast" class="export-toast" style="display:none;"></div>
    </div>
  `;

  const btnCss = containerEl.querySelector('#btn-copy-css');
  const btnTailwind = containerEl.querySelector('#btn-copy-tailwind');
  const btnJson = containerEl.querySelector('#btn-download-json');
  const toast = containerEl.querySelector('#export-toast') as HTMLElement;

  const showToast = (msg: string) => {
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2500);
  };

  btnCss?.addEventListener('click', () => {
    navigator.clipboard.writeText(cssPatch).then(() => {
      showToast('✓ Production CSS patch copied to clipboard!');
    });
  });

  btnTailwind?.addEventListener('click', () => {
    navigator.clipboard.writeText(tailwindClasses).then(() => {
      showToast('✓ Tailwind CSS classes copied to clipboard!');
    });
  });

  btnJson?.addEventListener('click', () => {
    const jsonStr = generateAuditReceiptJSON(config);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slipvector-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ JSON Audit Receipt downloaded!');
  });
}
