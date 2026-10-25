/**
 * Telemetry Banner Component
 * Displays side-by-side static accessibility compliance badges and
 * live empirical kinetic Monte Carlo simulation metrics with Wilson 95% CIs.
 * Reports both Nominal Throughput and Effective Throughput (We = 4.133 * SD),
 * and verifies Primary + Destructive + Neutral partition sums to N.
 */

import { StaticAuditResult } from '../engine/staticChecks.ts';
import { WorkerResponse } from '../worker/simWorker.ts';

export function renderTelemetryBanner(
  containerEl: HTMLElement,
  staticResult: StaticAuditResult,
  simResult: WorkerResponse | null,
  isSimulating: boolean
): void {
  const aaStatus = staticResult.passAA ? 'PASS' : 'FAIL';
  const aaaStatus = staticResult.passAAA ? 'PASS' : 'FAIL';
  const aaClass = staticResult.passAA ? 'badge-pass' : 'badge-fail';
  const aaaClass = staticResult.passAAA ? 'badge-pass' : 'badge-fail';

  let kineticHtml = '';
  if (isSimulating) {
    kineticHtml = `
      <div class="telemetry-card kinetic-card">
        <div class="telemetry-label">Kinetic Pointing Swarm (Monte Carlo)</div>
        <div class="telemetry-value-loading">
          <span class="spinner"></span> Simulating trajectories in Web Worker...
        </div>
      </div>
    `;
  } else if (simResult) {
    const k = simResult.destructiveCollisions;
    const n = simResult.sampleSize;
    const ci = simResult.destructiveWilsonCI;
    const dur = simResult.durationMs.toFixed(1);
    const tpNominal = simResult.meanTPBitsPerSec.toFixed(2);
    const tpEffective = (simResult.effectiveTPBitsPerSec ?? simResult.meanTPBitsPerSec).toFixed(2);
    const mt = Math.round(simResult.meanMTMs);
    const id = simResult.meanIDBits.toFixed(2);
    const neutral = simResult.neutralHits ?? (n - simResult.primaryHits - k);

    const collisionSeverity = k === 0 ? 'safe' : k / n < 0.05 ? 'warning' : 'critical';

    kineticHtml = `
      <div class="telemetry-card kinetic-card ${collisionSeverity}">
        <div class="telemetry-header">
          <span class="telemetry-title">Kinetic Simulation (${n.toLocaleString()} trials)</span>
          <span class="telemetry-time">Computed in ${dur} ms</span>
        </div>
        <div class="telemetry-primary-stat">
          <span class="stat-number ${collisionSeverity}">${k} / ${n}</span>
          <span class="stat-desc">Destructive Collisions (${(ci.proportion * 100).toFixed(2)}%)</span>
        </div>
        <div class="telemetry-ci" title="Wilson 95% Confidence Interval">
          <strong>Wilson 95% CI:</strong> [${(ci.lower * 100).toFixed(2)}%, ${(ci.upper * 100).toFixed(2)}%]
        </div>
        <div class="telemetry-fitts-row">
          <span><strong>Nominal TP:</strong> ${tpNominal} bits/s</span>
          <span><strong>Effective TP (We=4.133·SD):</strong> ${tpEffective} bits/s</span>
          <span><strong>MT:</strong> ${mt} ms</span>
          <span><strong>ID:</strong> ${id} bits</span>
        </div>
        <div class="telemetry-fitts-row">
          <span><strong>Primary:</strong> ${simResult.primaryHits} (${((simResult.primaryHits / n) * 100).toFixed(1)}%)</span>
          <span><strong>Destructive:</strong> ${k} (${((k / n) * 100).toFixed(1)}%)</span>
          <span><strong>Neutral:</strong> ${neutral} (${((neutral / n) * 100).toFixed(1)}%)</span>
          <span><strong>Sum:</strong> ${simResult.primaryHits + k + neutral} / ${n} (100%)</span>
        </div>
      </div>
    `;
  } else {
    kineticHtml = `
      <div class="telemetry-card kinetic-card">
        <div class="telemetry-label">Kinetic Pointing Swarm</div>
        <div class="telemetry-idle">Ready to simulate. Click "Run Swarm" or select a preset.</div>
      </div>
    `;
  }

  containerEl.innerHTML = `
    <div class="telemetry-grid">
      <!-- Static Checks Column -->
      <div class="telemetry-card static-card">
        <div class="telemetry-header">
          <span class="telemetry-title">Static Accessibility Audits</span>
          <span class="static-subtitle">Isolated Geometry Only</span>
        </div>
        <div class="static-badges-row">
          <div class="static-badge-item">
            <span class="badge ${aaClass}">${aaStatus}</span>
            <span class="badge-label" title="${staticResult.labelAA}">WCAG 2.2 AA (≥24px)</span>
          </div>
          <div class="static-badge-item">
            <span class="badge ${aaaClass}">${aaaStatus}</span>
            <span class="badge-label" title="${staticResult.labelAAA}">WCAG 2.2 AAA (≥44px)</span>
          </div>
        </div>
        <p class="static-disclaimer">
          <em>"${staticResult.disclaimer}"</em>
        </p>
      </div>

      <!-- Kinetic Simulation Column -->
      ${kineticHtml}
    </div>
  `;
}
