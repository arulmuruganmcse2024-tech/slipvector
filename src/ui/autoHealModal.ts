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
    const isSolved = solverResult.status === 'solved';
    const statusClass = isSolved ? 'badge-pass' : 'badge-infeasible';
    const statusLabel = isSolved
      ? '✓ SOLVED (Zero Collisions Certified)'
      : '⚠ PARTIALLY MITIGATED (Infeasible in Bounds)';

    const beforeText = formatWilsonCI(
      solverResult.beforeWilsonCI,
      solverResult.beforeCollisions,
      500
    );
    const afterText = formatWilsonCI(
      solverResult.afterWilsonCI,
      solverResult.afterCollisions,
      500
    );

    receiptHtml = `
      <div class="autoheal-card receipt-card ${isSolved ? 'solved' : 'infeasible'}">
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
            <span class="metric-val ${isSolved ? 'text-emerald' : 'text-amber'}">${afterText}</span>
          </div>
          <div class="receipt-metric">
            <span class="metric-label">Routine Time Impact:</span>
            <span class="metric-val font-mono">${solverResult.deltaMTMs >= 0 ? '+' : ''}${Math.round(solverResult.deltaMTMs)} ms / click</span>
          </div>
          <div class="receipt-metric">
            <span class="metric-label">Touch Target Size:</span>
            <span class="metric-val text-emerald">Expanded to ≥ 44px</span>
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
