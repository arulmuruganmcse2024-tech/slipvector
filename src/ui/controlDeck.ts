/**
 * Control Deck Component (Left Panel)
 * Manages Presets, Motor Profiles, Parameter Sliders, and Target Coordinates.
 * Supports smooth in-place state reconciliation to preserve slider drag and keyboard focus.
 */

import { PRESETS, MOTOR_PROFILES, PresetLayout } from '../engine/presets.ts';
import { MotorProfile, UIElement } from '../engine/biomechanics.ts';

export interface ControlDeckCallbacks {
  onPresetSelect: (preset: PresetLayout) => void;
  onProfileSelect: (profile: MotorProfile) => void;
  onParamChange: (updatedProfile: MotorProfile, sampleSize: 500 | 2000 | 10000) => void;
  onElementRectChange: (elementId: string, x: number, y: number, w: number, h: number) => void;
  onRunSwarm: () => void;
}

export function renderControlDeck(
  containerEl: HTMLElement,
  currentPresetId: string,
  currentProfile: MotorProfile,
  currentSampleSize: 500 | 2000 | 10000,
  elements: UIElement[],
  selectedElementId: string | null,
  callbacks: ControlDeckCallbacks
): void {
  const existingInner = containerEl.querySelector('.control-deck-inner') as HTMLElement | null;
  const prevPresetId = existingInner?.getAttribute('data-preset-id');
  const selectedEl = elements.find(e => e.id === selectedElementId) || elements[1] || elements[0];
  const activeSelectedId = selectedEl?.id || '';
  const prevSelectedId = existingInner?.getAttribute('data-selected-id');

  // In-place reconciliation: update values without destroying active DOM / event listeners / slider focus
  if (existingInner && prevPresetId === currentPresetId && prevSelectedId === activeSelectedId) {
    const valSample = existingInner.querySelector('#val-sample-size');
    if (valSample) valSample.textContent = currentSampleSize.toLocaleString();

    existingInner.querySelectorAll('.btn-sample').forEach(btn => {
      const size = parseInt((btn as HTMLElement).dataset.size || '500', 10);
      btn.classList.toggle('active', size === currentSampleSize);
    });

    const valOvershoot = existingInner.querySelector('#val-overshoot');
    if (valOvershoot) valOvershoot.textContent = `${currentProfile.overshootRatio.toFixed(2)}x`;
    const slOvershoot = existingInner.querySelector('#slider-overshoot') as HTMLInputElement | null;
    if (slOvershoot && document.activeElement !== slOvershoot) slOvershoot.value = currentProfile.overshootRatio.toString();

    const valFreq = existingInner.querySelector('#val-frequency');
    if (valFreq) valFreq.textContent = `${currentProfile.frequency.toFixed(1)} Hz`;
    const slFreq = existingInner.querySelector('#slider-frequency') as HTMLInputElement | null;
    if (slFreq && document.activeElement !== slFreq) slFreq.value = currentProfile.frequency.toString();

    const valAmp = existingInner.querySelector('#val-amplitude');
    if (valAmp) valAmp.textContent = `${currentProfile.amplitude.toFixed(1)} px`;
    const slAmp = existingInner.querySelector('#slider-amplitude') as HTMLInputElement | null;
    if (slAmp && document.activeElement !== slAmp) slAmp.value = currentProfile.amplitude.toString();

    const valJerk = existingInner.querySelector('#val-jerk');
    if (valJerk) valJerk.textContent = `${currentProfile.jerkImpulse.toFixed(1)} px`;
    const slJerk = existingInner.querySelector('#slider-jerk') as HTMLInputElement | null;
    if (slJerk && document.activeElement !== slJerk) slJerk.value = currentProfile.jerkImpulse.toString();

    const valUrg = existingInner.querySelector('#val-urgency');
    if (valUrg) valUrg.textContent = `${currentProfile.urgency.toFixed(2)}x`;
    const slUrg = existingInner.querySelector('#slider-urgency') as HTMLInputElement | null;
    if (slUrg && document.activeElement !== slUrg) slUrg.value = currentProfile.urgency.toString();

    const selProfile = existingInner.querySelector('#select-profile') as HTMLSelectElement | null;
    if (selProfile && selProfile.value !== currentProfile.id) selProfile.value = currentProfile.id;
    const profDesc = existingInner.querySelector('.profile-desc');
    if (profDesc) profDesc.textContent = currentProfile.description;

    if (selectedEl) {
      const inX = existingInner.querySelector('#inp-geom-x') as HTMLInputElement | null;
      const inY = existingInner.querySelector('#inp-geom-y') as HTMLInputElement | null;
      const inW = existingInner.querySelector('#inp-geom-w') as HTMLInputElement | null;
      const inH = existingInner.querySelector('#inp-geom-h') as HTMLInputElement | null;
      if (inX && document.activeElement !== inX) inX.value = selectedEl.rect.x.toString();
      if (inY && document.activeElement !== inY) inY.value = selectedEl.rect.y.toString();
      if (inW && document.activeElement !== inW) inW.value = selectedEl.rect.width.toString();
      if (inH && document.activeElement !== inH) inH.value = selectedEl.rect.height.toString();
    }
    return;
  }

  const allPresets = [...PRESETS];
  if (currentPresetId === 'dogfood-audit') {
    allPresets.push({
      id: 'dogfood-audit',
      name: "🔍 Dogfood: SlipVector Toolbar",
      subtitle: "Self-audit of SlipVector's live action toolbar",
      description: "Live bounding client rect of SlipVector's own controls loaded into the kinetic canvas.",
      container: { width: 640, height: 200 },
      elements: elements,
      recommendedProfileId: 'steady-baseline',
      defaultSampleSize: 500
    });
  } else if (currentPresetId === 'custom-import') {
    allPresets.push({
      id: 'custom-import',
      name: "📋 Custom Imported Layout",
      subtitle: "User imported HTML / CSS layout",
      description: "Custom elements imported from clipboard or HTML inspector.",
      container: { width: 640, height: 200 },
      elements: elements,
      recommendedProfileId: 'essential-tremor',
      defaultSampleSize: 500
    });
  }

  const presetOptions = allPresets.map(p => `
    <option value="${p.id}" ${p.id === currentPresetId ? 'selected' : ''}>
      ${p.name}
    </option>
  `).join('');

  const profileOptions = MOTOR_PROFILES.map(pr => `
    <option value="${pr.id}" ${pr.id === currentProfile.id ? 'selected' : ''}>
      ${pr.name}
    </option>
  `).join('');

  const activePreset = allPresets.find(p => p.id === currentPresetId) || PRESETS[0];

  containerEl.innerHTML = `
    <div class="control-deck-inner" data-preset-id="${currentPresetId}" data-selected-id="${activeSelectedId}">
      <!-- Run Swarm Button -->
      <button id="btn-run-swarm" class="btn-primary-action">
        <span class="btn-icon">⚡</span> Run Kinetic Swarm
        <span class="kbd-hint">Space</span>
      </button>

      <!-- Preset Selector -->
      <div class="control-group">
        <label for="select-preset" class="control-label">UI Preset Case</label>
        <select id="select-preset" class="select-dropdown">
          ${presetOptions}
        </select>
        <div class="preset-subtitle">${activePreset.subtitle}</div>
      </div>

      <!-- Motor Profile Selector -->
      <div class="control-group">
        <label for="select-profile" class="control-label">Motor Variability Profile</label>
        <select id="select-profile" class="select-dropdown">
          ${profileOptions}
        </select>
        <div class="profile-desc">${currentProfile.description}</div>
      </div>

      <!-- Parametric Sliders -->
      <div class="sliders-section">
        <div class="section-divider"></div>
        <div class="panel-section-title">Parametric Kinematics</div>

        <!-- Sample Size N -->
        <div class="control-group slider-group">
          <div class="slider-label-row">
            <span>Sample Size (N)</span>
            <span class="slider-value" id="val-sample-size">${currentSampleSize.toLocaleString()}</span>
          </div>
          <div class="btn-group-sample-size">
            <button class="btn-sample ${currentSampleSize === 500 ? 'active' : ''}" data-size="500">500</button>
            <button class="btn-sample ${currentSampleSize === 2000 ? 'active' : ''}" data-size="2000">2,000</button>
            <button class="btn-sample ${currentSampleSize === 10000 ? 'active' : ''}" data-size="10000">10,000</button>
          </div>
        </div>

        <!-- Directional Overshoot Ratio (Assumption) -->
        <div class="control-group slider-group highlight-assumption">
          <div class="slider-label-row">
            <span>Overshoot Ratio (σ∥/σ⊥)</span>
            <span class="badge-assumption">Model Assumption</span>
            <span class="slider-value font-mono" id="val-overshoot">${currentProfile.overshootRatio.toFixed(2)}x</span>
          </div>
          <input type="range" id="slider-overshoot" aria-label="Directional Overshoot Ratio" min="1.0" max="2.5" step="0.05" value="${currentProfile.overshootRatio}" class="range-slider" />
          <div class="slider-subtext">Directional dispersion along approach vector (û)</div>
        </div>

        <!-- Oscillation Frequency -->
        <div class="control-group slider-group">
          <div class="slider-label-row">
            <span>Tremor Frequency</span>
            <span class="slider-value font-mono" id="val-frequency">${currentProfile.frequency.toFixed(1)} Hz</span>
          </div>
          <input type="range" id="slider-frequency" aria-label="Tremor Frequency" min="0" max="10" step="0.5" value="${currentProfile.frequency}" class="range-slider" />
        </div>

        <!-- Oscillation Amplitude -->
        <div class="control-group slider-group">
          <div class="slider-label-row">
            <span>Tremor Amplitude</span>
            <span class="slider-value font-mono" id="val-amplitude">${currentProfile.amplitude.toFixed(1)} px</span>
          </div>
          <input type="range" id="slider-amplitude" aria-label="Tremor Amplitude" min="0" max="25" step="0.5" value="${currentProfile.amplitude}" class="range-slider" />
        </div>

        <!-- Transit Jerk / Jolt -->
        <div class="control-group slider-group">
          <div class="slider-label-row">
            <span>Transit Jerk / Jolt</span>
            <span class="slider-value font-mono" id="val-jerk">${currentProfile.jerkImpulse.toFixed(1)} px</span>
          </div>
          <input type="range" id="slider-jerk" aria-label="Transit Jerk or Jolt" min="0" max="15" step="0.5" value="${currentProfile.jerkImpulse}" class="range-slider" />
        </div>

        <!-- Movement Urgency -->
        <div class="control-group slider-group">
          <div class="slider-label-row">
            <span>Movement Urgency</span>
            <span class="slider-value font-mono" id="val-urgency">${currentProfile.urgency.toFixed(2)}x</span>
          </div>
          <input type="range" id="slider-urgency" aria-label="Movement Urgency" min="0.6" max="2.0" step="0.05" value="${currentProfile.urgency}" class="range-slider" />
        </div>
      </div>

      <!-- Selected Element Inspector -->
      ${selectedEl ? `
        <div class="element-inspector-card">
          <div class="panel-section-title">Selected Element: <strong>${selectedEl.label}</strong></div>
          <div class="geom-grid">
            <div class="geom-field">
              <label for="inp-geom-x">X (px)</label>
              <input type="number" id="inp-geom-x" aria-label="Selected element X coordinate in pixels" value="${selectedEl.rect.x}" class="inp-num" />
            </div>
            <div class="geom-field">
              <label for="inp-geom-y">Y (px)</label>
              <input type="number" id="inp-geom-y" aria-label="Selected element Y coordinate in pixels" value="${selectedEl.rect.y}" class="inp-num" />
            </div>
            <div class="geom-field">
              <label for="inp-geom-w">W (px)</label>
              <input type="number" id="inp-geom-w" aria-label="Selected element width in pixels" value="${selectedEl.rect.width}" class="inp-num" />
            </div>
            <div class="geom-field">
              <label for="inp-geom-h">H (px)</label>
              <input type="number" id="inp-geom-h" aria-label="Selected element height in pixels" value="${selectedEl.rect.height}" class="inp-num" />
            </div>
          </div>
          <div class="geom-role-tag">Role: <span class="tag-${selectedEl.role}">${selectedEl.role.toUpperCase()}</span></div>
        </div>
      ` : ''}
    </div>
  `;

  // --- Attach Event Listeners ---
  const btnRun = containerEl.querySelector('#btn-run-swarm');
  btnRun?.addEventListener('click', callbacks.onRunSwarm);

  const selPreset = containerEl.querySelector('#select-preset') as HTMLSelectElement;
  selPreset?.addEventListener('change', () => {
    const p = PRESETS.find(item => item.id === selPreset.value);
    if (p) callbacks.onPresetSelect(p);
  });

  const selProfile = containerEl.querySelector('#select-profile') as HTMLSelectElement;
  selProfile?.addEventListener('change', () => {
    const pr = MOTOR_PROFILES.find(item => item.id === selProfile.value);
    if (pr) callbacks.onProfileSelect(pr);
  });

  // Sample size buttons
  containerEl.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = parseInt((btn as HTMLElement).dataset.size || '500', 10) as 500 | 2000 | 10000;
      callbacks.onParamChange(currentProfile, size);
    });
  });

  // Sliders
  const slOvershoot = containerEl.querySelector('#slider-overshoot') as HTMLInputElement;
  const slFreq = containerEl.querySelector('#slider-frequency') as HTMLInputElement;
  const slAmp = containerEl.querySelector('#slider-amplitude') as HTMLInputElement;
  const slJerk = containerEl.querySelector('#slider-jerk') as HTMLInputElement;
  const slUrg = containerEl.querySelector('#slider-urgency') as HTMLInputElement;

  const onSliderInput = () => {
    const updated: MotorProfile = {
      ...currentProfile,
      overshootRatio: parseFloat(slOvershoot.value),
      frequency: parseFloat(slFreq.value),
      amplitude: parseFloat(slAmp.value),
      jerkImpulse: parseFloat(slJerk.value),
      urgency: parseFloat(slUrg.value)
    };
    const valOvershoot = containerEl.querySelector('#val-overshoot');
    if (valOvershoot) valOvershoot.textContent = `${updated.overshootRatio.toFixed(2)}x`;
    const valFreq = containerEl.querySelector('#val-frequency');
    if (valFreq) valFreq.textContent = `${updated.frequency.toFixed(1)} Hz`;
    const valAmp = containerEl.querySelector('#val-amplitude');
    if (valAmp) valAmp.textContent = `${updated.amplitude.toFixed(1)} px`;
    const valJerk = containerEl.querySelector('#val-jerk');
    if (valJerk) valJerk.textContent = `${updated.jerkImpulse.toFixed(1)} px`;
    const valUrg = containerEl.querySelector('#val-urgency');
    if (valUrg) valUrg.textContent = `${updated.urgency.toFixed(2)}x`;

    callbacks.onParamChange(updated, currentSampleSize);
  };

  slOvershoot?.addEventListener('input', onSliderInput);
  slFreq?.addEventListener('input', onSliderInput);
  slAmp?.addEventListener('input', onSliderInput);
  slJerk?.addEventListener('input', onSliderInput);
  slUrg?.addEventListener('input', onSliderInput);

  // Geometry inputs
  if (selectedEl) {
    const inX = containerEl.querySelector('#inp-geom-x') as HTMLInputElement;
    const inY = containerEl.querySelector('#inp-geom-y') as HTMLInputElement;
    const inW = containerEl.querySelector('#inp-geom-w') as HTMLInputElement;
    const inH = containerEl.querySelector('#inp-geom-h') as HTMLInputElement;

    const onGeomChange = () => {
      callbacks.onElementRectChange(
        selectedEl.id,
        parseInt(inX.value, 10) || 0,
        parseInt(inY.value, 10) || 0,
        Math.max(16, parseInt(inW.value, 10) || 16),
        Math.max(16, parseInt(inH.value, 10) || 16)
      );
    };

    inX?.addEventListener('change', onGeomChange);
    inY?.addEventListener('change', onGeomChange);
    inW?.addEventListener('change', onGeomChange);
    inH?.addEventListener('change', onGeomChange);
  }
}
