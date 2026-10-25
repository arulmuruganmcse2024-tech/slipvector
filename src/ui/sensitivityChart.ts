/**
 * Sensitivity Sweep Chart & Plain-Language Deterministic Diagnostics
 * Computes multi-point sensitivity sweeps across Overshoot Ratio (1.0 to 2.5)
 * and Oscillation Amplitude (0 to 20px) with Wilson 95% error bars.
 * Generates deterministic engineering diagnostics explaining root geometric causes.
 */

import { UIElement, MotorProfile, simulateSingleTrial, rectCenter } from '../engine/biomechanics.ts';
import { edgeDistance } from '../engine/staticChecks.ts';
import { createMulberry32 } from '../engine/prng.ts';
import { wilsonInterval } from '../engine/stats.ts';

export interface SensitivityPoint {
  paramValue: number;
  collisions: number;
  sampleSize: number;
  rate: number;
  lowerRate: number;
  upperRate: number;
}

export function computeSensitivitySweep(
  elements: UIElement[],
  baseProfile: MotorProfile,
  param: 'overshoot' | 'amplitude',
  seed: number = 42
): SensitivityPoint[] {
  const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
  const primaryEl = elements.find(e => e.role === 'primary');
  const destructiveEl = elements.find(e => e.role === 'destructive');
  const neutralEls = elements.filter(e => e.role === 'neutral').map(e => e.rect);

  if (!primaryEl || !destructiveEl) return [];

  const points: SensitivityPoint[] = [];
  const N = 400; // fast sweep

  const steps = param === 'overshoot'
    ? [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5]
    : [0, 4, 8, 12, 16, 20];

  for (const val of steps) {
    const testProfile: MotorProfile = {
      ...baseProfile,
      overshootRatio: param === 'overshoot' ? val : baseProfile.overshootRatio,
      amplitude: param === 'amplitude' ? val : baseProfile.amplitude
    };

    const prng = createMulberry32(seed);
    let collisions = 0;
    for (let i = 0; i < N; i++) {
      const res = simulateSingleTrial(
        anchorEl.rect,
        primaryEl.rect,
        destructiveEl.rect,
        neutralEls,
        testProfile,
        prng,
        90.0,
        false
      );
      if (res.hitType === 'destructive') collisions++;
    }

    const ci = wilsonInterval(collisions, N);
    points.push({
      paramValue: val,
      collisions,
      sampleSize: N,
      rate: ci.proportion,
      lowerRate: ci.lower,
      upperRate: ci.upper
    });
  }

  return points;
}

export function generateDeterministicDiagnostic(
  elements: UIElement[],
  profile: MotorProfile
): string {
  const anchorEl = elements.find(e => e.role === 'anchor') ?? elements[0];
  const primaryEl = elements.find(e => e.role === 'primary');
  const destructiveEl = elements.find(e => e.role === 'destructive');

  if (!primaryEl || !destructiveEl) {
    return 'No destructive action detected. Low kinetic hazard.';
  }

  const anchorCenter = rectCenter(anchorEl.rect);
  const primaryCenter = rectCenter(primaryEl.rect);
  const destructiveCenter = rectCenter(destructiveEl.rect);

  // Approach vector
  const dx = primaryCenter.x - anchorCenter.x;
  const dy = primaryCenter.y - anchorCenter.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;

  // Vector from primary to destructive
  const dpx = destructiveCenter.x - primaryCenter.x;
  const dpy = destructiveCenter.y - primaryCenter.y;
  const dDest = Math.max(1, Math.hypot(dpx, dpy));
  const cosAngle = (ux * dpx + uy * dpy) / dDest;
  const alignmentAngleDeg = Math.round((Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI);

  const edgeGap = Math.round(edgeDistance(primaryEl.rect, destructiveEl.rect));
  const peakToPeakTremor = Math.round(profile.amplitude * 2);

  const reasons: string[] = [];

  // Alignment check
  if (cosAngle > 0.7) {
    reasons.push(
      `Destructive target is directly aligned with the approach path (alignment angle ${alignmentAngleDeg}°). Ballistic overshoot along approach vector (û) carries the pointer straight into the danger zone.`
    );
  } else if (cosAngle > 0.2) {
    reasons.push(
      `Destructive target sits within the forward approach quadrant (${alignmentAngleDeg}° off-axis). Directional approach scatter increases clipping probability.`
    );
  } else {
    reasons.push(
      `Destructive target is positioned off-axis (${alignmentAngleDeg}° from approach vector), reducing direct ballistic trajectory collisions.`
    );
  }

  // Spacing vs Tremor check
  if (edgeGap < peakToPeakTremor) {
    reasons.push(
      `Physical edge gap (${edgeGap}px) is narrower than peak-to-peak motor oscillation excursion (${peakToPeakTremor}px). Continuous 4–8 Hz hand oscillation will cross the button boundary during tap actuation.`
    );
  } else if (edgeGap < 24) {
    reasons.push(
      `Edge-to-edge separation (${edgeGap}px) is below the recommended 24px ergonomic safety buffer.`
    );
  } else {
    reasons.push(
      `Physical edge gap (${edgeGap}px) exceeds tremor excursion (${peakToPeakTremor}px), providing spatial clearance.`
    );
  }

  // Target size check
  if (primaryEl.rect.height < 44 || primaryEl.rect.width < 44) {
    reasons.push(
      `Primary target is undersized (${primaryEl.rect.width}x${primaryEl.rect.height}px), increasing Fitts Index of Difficulty and endpoint scatter.`
    );
  }

  return reasons.join(' ');
}

export function renderSensitivityChart(
  containerEl: HTMLElement,
  elements: UIElement[],
  profile: MotorProfile,
  activeParam: 'overshoot' | 'amplitude',
  onParamChange: (param: 'overshoot' | 'amplitude') => void
): void {
  const points = computeSensitivitySweep(elements, profile, activeParam);
  const diagnostic = generateDeterministicDiagnostic(elements, profile);

  const maxRate = Math.max(0.15, ...points.map(p => p.upperRate));
  const svgW = 320;
  const svgH = 140;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const polyPoints = points.map((p, idx) => {
    const x = padL + (idx / (points.length - 1)) * plotW;
    const y = padT + (1 - p.rate / maxRate) * plotH;
    return `${x},${y}`;
  }).join(' ');

  // Error bars & dots
  const errorBarsHtml = points.map((p, idx) => {
    const x = padL + (idx / (points.length - 1)) * plotW;
    const y = padT + (1 - p.rate / maxRate) * plotH;
    const yLow = padT + (1 - p.lowerRate / maxRate) * plotH;
    const yHigh = padT + (1 - p.upperRate / maxRate) * plotH;
    const label = activeParam === 'overshoot' ? p.paramValue.toFixed(1) : `${p.paramValue}px`;

    return `
      <!-- Error Bar -->
      <line x1="${x}" y1="${yLow}" x2="${x}" y2="${yHigh}" stroke="rgba(244, 63, 94, 0.4)" stroke-width="1.5" />
      <line x1="${x - 3}" y1="${yLow}" x2="${x + 3}" y2="${yLow}" stroke="rgba(244, 63, 94, 0.4)" stroke-width="1.5" />
      <line x1="${x - 3}" y1="${yHigh}" x2="${x + 3}" y2="${yHigh}" stroke="rgba(244, 63, 94, 0.4)" stroke-width="1.5" />
      <!-- Point -->
      <circle cx="${x}" cy="${y}" r="3.5" fill="#F43F5E" stroke="#FFFFFF" stroke-width="1" />
      <!-- X Label -->
      <text x="${x}" y="${svgH - 8}" font-size="9" fill="#94A3B8" text-anchor="middle" font-family="JetBrains Mono">${label}</text>
    `;
  }).join('');

  containerEl.innerHTML = `
    <div class="sensitivity-card">
      <div class="sensitivity-header">
        <div class="sensitivity-title-row">
          <span class="panel-section-title">Sensitivity Sweep</span>
          <span class="badge-assumption" title="Explicitly documented model parameter">Assumption Analysis</span>
        </div>
        <div class="param-toggle-buttons">
          <button id="btn-sweep-overshoot" class="toggle-btn ${activeParam === 'overshoot' ? 'active' : ''}">
            Overshoot Ratio (σ∥/σ⊥)
          </button>
          <button id="btn-sweep-amplitude" class="toggle-btn ${activeParam === 'amplitude' ? 'active' : ''}">
            Tremor Amplitude
          </button>
        </div>
      </div>

      <!-- SVG Mini Chart -->
      <div class="sensitivity-chart-wrapper">
        <svg viewBox="0 0 ${svgW} ${svgH}" class="sensitivity-svg">
          <!-- Grid Lines -->
          <line x1="${padL}" y1="${padT}" x2="${padL + plotW}" y2="${padT}" stroke="#1E2638" stroke-dasharray="2,2" />
          <line x1="${padL}" y1="${padT + plotH / 2}" x2="${padL + plotW}" y2="${padT + plotH / 2}" stroke="#1E2638" stroke-dasharray="2,2" />
          <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#232D42" />

          <!-- Y Axis Labels -->
          <text x="${padL - 6}" y="${padT + 4}" font-size="9" fill="#64748B" text-anchor="end" font-family="JetBrains Mono">${(maxRate * 100).toFixed(0)}%</text>
          <text x="${padL - 6}" y="${padT + plotH / 2 + 4}" font-size="9" fill="#64748B" text-anchor="end" font-family="JetBrains Mono">${((maxRate / 2) * 100).toFixed(0)}%</text>
          <text x="${padL - 6}" y="${padT + plotH}" font-size="9" fill="#64748B" text-anchor="end" font-family="JetBrains Mono">0%</text>

          <!-- Polyline Trend -->
          <polyline fill="none" stroke="#F43F5E" stroke-width="2" points="${polyPoints}" />

          ${errorBarsHtml}
        </svg>
      </div>

      <!-- Deterministic Plain-Language Diagnostic -->
      <div class="diagnostic-box">
        <div class="diagnostic-header">
          <span class="diagnostic-icon">🔍</span>
          <strong>Geometric Root Cause Analysis</strong>
        </div>
        <p class="diagnostic-text">${diagnostic}</p>
      </div>
    </div>
  `;

  // Bind toggle buttons
  const btnOvershoot = containerEl.querySelector('#btn-sweep-overshoot');
  const btnAmplitude = containerEl.querySelector('#btn-sweep-amplitude');

  btnOvershoot?.addEventListener('click', () => onParamChange('overshoot'));
  btnAmplitude?.addEventListener('click', () => onParamChange('amplitude'));
}
