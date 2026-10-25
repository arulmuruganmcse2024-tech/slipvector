/**
 * Mitigation Matrix Component
 * Displays 4-row trade-off table comparing Spatial Separation (Auto-Heal)
 * directly against Undo Toast, Overflow Menu, and Confirmation Dialog.
 */

import { MitigationRow } from '../engine/mitigations.ts';

export function renderMitigationTable(
  containerEl: HTMLElement,
  rows: MitigationRow[]
): void {
  const tableRowsHtml = rows.map(r => {
    const isSpatial = r.id === 'spatial-autoheal';
    const rowClass = isSpatial ? 'spatial-row-highlight' : '';

    return `
      <tr class="${rowClass}">
        <td>
          <div class="strategy-name">
            <strong>${r.strategy}</strong>
            ${isSpatial ? '<span class="badge badge-pass">Healed</span>' : ''}
          </div>
          <div class="strategy-desc">${r.tradeoffSummary}</div>
        </td>
        <td class="font-mono text-center">
          <span class="hazard-val ${r.residualHazardCount === 0 ? 'text-emerald' : 'text-crimson'}">
            ${r.hazardFormatted}
          </span>
        </td>
        <td class="font-mono text-center">
          ${r.addedRoutineCostMs === 0 ? '0 ms' : `+${r.addedRoutineCostMs} ms`}
        </td>
        <td class="font-mono text-center">
          ${r.extraClicks === 0 ? '0 clicks' : `+${r.extraClicks} click`}
        </td>
        <td class="use-case-cell">
          ${r.recommendedUseCase}
        </td>
      </tr>
    `;
  }).join('');

  containerEl.innerHTML = `
    <div class="mitigation-matrix-card">
      <div class="matrix-header">
        <span class="panel-section-title">Spatial vs. Non-Spatial Mitigation Matrix</span>
        <span class="matrix-subtitle">Empirical Trade-off Comparison</span>
      </div>

      <div class="table-scroll-wrapper">
        <table class="mitigation-table">
          <thead>
            <tr>
              <th style="width: 28%;">Mitigation Pattern</th>
              <th style="width: 24%; text-align: center;">Residual Hazard (k/N + Wilson 95% CI)</th>
              <th style="width: 14%; text-align: center;">Added Routine Cost</th>
              <th style="width: 14%; text-align: center;">Recovery Friction</th>
              <th style="width: 20%;">Recommended Use Case</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
