/**
 * Auto-Heal Solver Control & Before/After Verification Receipt
 * Triggers the constrained repulsive solver, animates layout transition,
 * re-runs the simulation with the same seed, and renders the empirical receipt.
 */

import { SolverResult } from '../engine/solver.ts';
import { formatWilsonCI } from '../engine/stats.ts';

export interface AutoHealCallbacks {
  onTriggerAutoHeal: () => void;
  onApplyCSSPatch: () => void;
}

export function renderAutoHealSection(
  containerEl: HTMLElement,
  solverResult: SolverResult | null,
  isSolving: boolean,
  callbacks: AutoHealCallbacks
): void {
  let receiptHtml = '';

  if (isSolving) {
    receiptHtml = `
      <div class="autoheal-card solving">
        <div class="solver-status-row">
          <span class="spinner"></span>
          <span>Searching container bounds for safe-harbor geometry...</span>
        </div>
      </div>
    `;
  } else if (solverResult) {
    let statusClass = 'badge-infeasible';
    let statusLabel = '⚠ PARTIALLY MITIGATED (Infeasible in Bounds)';

    if (solverResult.status === 'no_change_needed') {
      statusClass = 'badge-pass';
      statusLabel = '✓ NO CHANGE NEEDED (Baseline Meets Target)';
    } else if (solverResult.status === 'solved') {
      statusClass = 'badge-pass';
      statusLabel = '✓ SOLVED (Zero Collisions Certified)';
    }

    const n = 500;
    const beforeText = formatWilsonCI(
      solverResult.beforeWilsonCI,
      solverResult.beforeCollisions,
      n
    );
    const afterText = formatWilsonCI(
      solverResult.afterWilsonCI,
      solverResult.afterCollisions,
      n
    );

    const mtDisplay = Math.abs(solverResult.deltaMTMs) < 1
      ? '0 ms (no change)'
      : `${solverResult.deltaMTMs >= 0 ? '+' : ''}${Math.round(solverResult.deltaMTMs)} ms (${solverResult.beforeMTMs} -> ${solverResult.afterMTMs} ms)`;

    const primBefore = ((solverResult.beforePrimaryHits / n) * 100).toFixed(1);
    const primAfter = ((solverResult.afterPrimaryHits / n) * 100).toFixed(1);

    const cardClass = solverResult.status === 'infeasible' ? 'infeasible' : 'solved';

    receiptHtml = `
      <div class="autoheal-card receipt-card ${cardClass}">
        <div class="receipt-header">
          <span class="badge ${statusClass}">${statusLabel}</span>
          <span class="receipt-title">Auto-Heal Verification Receipt</span>
        </div>

        <div class="receipt-metrics-grid">
          <div class="receipt-metric">
            <span class="metric-label">Hazard Before Heal:</span>
            <span class="metric-val text-crimson">${beforeText}</span>
          </div>
          <div class="receipt-metric">
            <span class="metric-label">Hazard After Heal:</span>
            <span class="metric-val ${solverResult.afterCollisions === 0 ? 'text-emerald' : 'text-amber'}">${afterText}</span>
          </div>
          <div class="receipt-metric">
            <span class="metric-label">Routine Movement Time:</span>
            <span class="metric-val font-mono">${mtDisplay}</span>
          </div>
          <div class="receipt-metric">
            <span class="metric-label">Primary Hit Rate:</span>
            <span class="metric-val font-mono text-emerald">${primBefore}% -> ${primAfter}%</span>
          </div>
          <div class="receipt-metric">
            <span class="metric-label">Nominal Throughput:</span>
            <span class="metric-val font-mono">${solverResult.beforeThroughput?.toFixed(2) ?? '—'} -> ${solverResult.afterThroughput?.toFixed(2) ?? '—'} bits/s</span>
          </div>
          <div class="receipt-metric">
            <span class="metric-label">Effective TP (We=4.133·SD):</span>
            <span class="metric-val font-mono">${solverResult.effectiveThroughputBefore?.toFixed(2) ?? '—'} -> ${solverResult.effectiveThroughputAfter?.toFixed(2) ?? '—'} bits/s</span>
          </div>
        </div>

        <p class="receipt-explanation">${solverResult.explanation}</p>
      </div>
    `;
  }

  containerEl.innerHTML = `
    <div class="autoheal-container">
      <div class="autoheal-action-row">
        <button id="btn-trigger-autoheal" class="btn-autoheal ${isSolving ? 'disabled' : ''}">
          <span class="heal-icon">🛡️</span> Run Auto-Heal Constrained Solver
        </button>
      </div>

      ${receiptHtml}
    </div>
  `;

  const btnHeal = containerEl.querySelector('#btn-trigger-autoheal');
  btnHeal?.addEventListener('click', () => {
    if (!isSolving) callbacks.onTriggerAutoHeal();
  });
}
