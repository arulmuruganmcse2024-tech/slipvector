---
skill: 3-prd
doc: prd
status: approved
completed_at: 2026-10-25T03:45:30.000Z
---

# SlipVector — Product Requirements

A browser-native kinetic UI misclick and motor-variability stress auditor that models human motor variability, measures destructive misclick hazards, verifies spatial layout fixes, and compares mitigations.
Source: `scope.md > The Unique Kernel`.

## The Core Journey
1. **Landing & Orientation**: The user opens SlipVector to a high-contrast human-factors instrumentation console. A prominent **"▶ Run 10-Second Guided Demo"** button invites immediate automated exploration.
2. **Selecting a Preset**: The user selects one of 5 presets (e.g. *SaaS Settings Modal* or *Preset #5: 48px WCAG AAA Stress Case*).
3. **Reviewing Static vs. Kinetic Dual Telemetry**: The header immediately reports:
   - `WCAG 2.2 SC 2.5.8 (AA Target Size >= 24x24px) — SlipVector Static Check`
   - `WCAG 2.2 SC 2.5.5 (AAA Target Size >= 44x44px) — SlipVector Static Check`
   - Real-time Monte Carlo kinetic collision rate: $k / N$ with Wilson Score 95% CI `[lower%, upper%]`.
4. **Inspecting Trajectories & Visual Telemetry**: The canvas displays animated pointer trajectories tracing from the anchor field toward the primary button, showing overshoot scatter, 4–8 Hz tremor oscillations, and crimson collision markers when trajectories clip adjacent destructive buttons.
5. **Analyzing Geometric Sensitivity**: The user reviews the deterministic findings and sensitivity sweep chart displaying collision probability across overshoot ratios (1.0 to 2.5) and tremor amplitudes (0 to 20px).
6. **Triggering Auto-Heal**: The user clicks **"🛡️ Run Auto-Heal Solver"**. The UI animates the buttons into safe-harbor coordinates, re-simulates the swarm automatically, and delivers a Before vs. After Verification Receipt.
7. **Evaluating Non-Spatial Mitigations**: The user scrolls to the Mitigation Matrix comparing Spatial Auto-Heal against Undo Toast, 2-Step Overflow Menu, and Confirmation Dialog.
8. **Exporting Fixes**: The user copies production-ready CSS patches, Tailwind classes, or downloads a full reproducible JSON Audit Receipt.
9. **Dogfooding & Custom Imports**: The user clicks **"🔍 Audit SlipVector's Own UI (Dogfood)"** to test SlipVector's controls, or opens **"📋 Paste Your Own HTML/CSS"** to audit custom markup safely.

## Screens and Layout
- **Global Header**: Product identity, status indicators, **"▶ Run 10-Second Guided Demo"**, **"🔍 Audit SlipVector's Own UI (Dogfood)"**, **"📋 Paste Your Own HTML/CSS"**, and **"🖐️ Motor Perturbation Test (Opt-In)"**.
- **Dual-Auditor Telemetry Banner**: Sticky top HUD displaying static WCAG status side-by-side with kinetic Monte Carlo results.
- **Three-Column Main Workbench**:
  - **Left Panel (Control Deck)**: Preset selector, Motor Profile selector, parameter sliders (Oscillation Frequency, Amplitude, Transit Jerk, Urgency, Sample Size $N \in \{500, 2000, 10000\}$, Directional Overshoot Ratio $\sigma_\parallel/\sigma_\perp$ [Assumption Slider]), and interactive Element Coordinates table.
  - **Center Panel (Interactive Kinetic Stage)**: High-DPI 60 FPS Canvas rendering UI buttons, ballistic approach cones, animated pointer trajectories, scatter markers, covariance ellipses, and Gaussian hazard heatmap. Includes drag-and-drop / resize handles directly on canvas.
  - **Right Panel (Diagnostics & Mitigations)**:
    - *Deterministic Diagnostic Findings*: Plain-language geometric explanation of root causes.
    - *Sensitivity Sweep Mini-Chart*: Multi-point plot showing risk across parameter bounds.
    - *Auto-Heal Control & Verification Receipt*: Solved vs. Infeasible status, Before vs. After metrics.
    - *Mitigation Trade-Off Matrix*: Spatial vs. Undo Toast vs. Overflow Menu vs. Confirmation Dialog.
    - *Export Drawer*: Clean CSS, Tailwind classes, JSON Audit Receipt.
- **Persistent Non-Clinical Footer**:
  *"Model-based ergonomic screening tool using parametric pointing models; not a clinical diagnostic instrument or a substitute for usability testing with human participants."*

## Look and Feel
- **Theme**: Precision human-factors instrumentation console. Deep carbon slate (`#0A0D14`), panel surfaces (`#111622`), crisp structural borders (`#1E2638`), Alabaster typography (`#F8FAFC`), steel labels (`#94A3B8`).
- **Accents**: Emerald (`#10B981` — Primary Hit / Safe), Amber (`#F59E0B` — Neutral / Warning), Rose-Crimson (`#F43F5E` — Destructive / Collision), Electric Cyan (`#06B6D4` — Active focus / Tracers).
- **Typography**: Inter / system geometric sans for UI interface copy + `JetBrains Mono` (`tabular-nums`) for all numbers, coordinates, confidence intervals, and metrics.
- **Accessibility**: 100% WCAG AA 4.5:1 text-to-background contrast; full `prefers-reduced-motion` compliance (static scatter view without continuous particle movement); zero flashing above 3 Hz.

## Features and Behavior

### FR1: 5 Built-in Presets
1. **SaaS Settings Modal**:
   - Anchor: `<input id="org-name">` at `(40, 40, 240, 36)`.
   - Primary: `<button id="save-changes">` (Save Changes, 28px height) at `(260, 200, 110, 28)`.
   - Destructive: `<button id="delete-workspace">` (Delete Workspace, 28px height, 4px gap) at `(374, 200, 130, 28)`.
   - Static Check: Passes WCAG AA (24px), Fails AAA (44px). High kinetic collision rate under diagonal approach.
2. **Mobile Commuter Checkout**:
   - Anchor: `<input id="promo-code">` at `(30, 60, 260, 44)`.
   - Primary: `<button id="complete-order">` (Complete Order, 44px) at `(30, 380, 260, 48)`.
   - Destructive: `<button id="cancel-cart">` (Cancel & Clear Cart, 32px) directly below at `(30, 436, 260, 32)`.
   - Motor Profile: ~2.5 Hz Transit Sway + Jolt Impulse.
3. **Clinical Infusion Keypad**:
   - Anchor: `<div id="dose-input">` at `(60, 30, 180, 40)`.
   - Primary: `<button id="confirm-bolus">` (Confirm Bolus, 40px) at `(40, 200, 100, 40)`.
   - Destructive: `<button id="reset-pump">` (Reset Pump, 36px) at `(150, 200, 100, 36)`.
   - Motor Profile: Postural / Action tremor model.
4. **Git Pull Request Bar**:
   - Anchor: `<textarea id="merge-message">` at `(40, 40, 420, 80)`.
   - Primary: `<button id="merge-pr">` (Merge Pull Request, 36px) at `(40, 150, 160, 36)`.
   - Destructive: `<button id="close-pr">` (Close & Delete Branch, 36px) at `(210, 150, 180, 36)`.
5. **Preset #5: 48px WCAG AAA Stress Case ("Defeats the 28px Strawman")**:
   - Anchor: `<input id="version-tag">` at `(40, 40, 200, 40)`.
   - Primary: `<button id="publish-release">` (Publish Release, 48x48px) at `(200, 160, 140, 48)`.
   - Destructive: `<button id="revoke-keys">` (Revoke Production Keys, 48x48px, 8px gap) at `(348, 160, 180, 48)`.
   - Geometry: Destructive button sits directly behind primary along ballistic approach vector $\hat{\mathbf{u}}$.
   - Behavior: Passes both WCAG AA (24px) and WCAG AAA (44px) static checks, but suffers substantial collision rate due to directional overshoot. Proves that static target sizing alone is insufficient.

### FR2: Paste Your Own HTML/CSS Sandboxed Inspector
- Secure `<iframe sandbox="allow-same-origin" srcdoc="...">` isolates custom HTML/CSS while keeping `contentDocument` accessible without cross-origin exceptions.
- Strips `<script>` tags, event listeners, and dangerous external resources.
- Automatically queries interactive elements (`button`, `a[role="button"]`, `input[type="submit"]`, `[data-role]`).
- Semantic inference rules:
  - Destructive: `delete|remove|destroy|revoke|cancel|discard|reset|close`
  - Primary: `save|submit|confirm|publish|merge|complete|pay|checkout|order`
  - Anchor: `input|textarea|select|checkbox`
  - Neutral: default fallback.
- User can edit markup, inspect extracted bounding rects, and override semantic roles in an interactive table before running simulation.

### FR3: Self-Dogfooding Audit ("Audit SlipVector's Own Controls")
- 1-click execution: Queries live `getBoundingClientRect()` of SlipVector's top toolbar.
- Toolbar engineered with `min-height: 44px` and minimum `16px` margin around destructive/reset actions.
- Automatically loads coordinates into the engine and runs the Monte Carlo swarm, demonstrating $0 / 500$ collisions under standard baseline.

### FR4: Parametric Motor Profiles & Biomechanical Modeling
- **Profiles**:
  1. *Steady Baseline*: $f = 0\text{ Hz}$, $A = 0\text{ px}$, baseline mouse precision.
  2. *Essential-Tremor-Like Oscillation*: $f = 6\text{ Hz}$ (4–8 Hz band), $A = 8\text{ px}$.
  3. *Transit Sway & Jolt*: $f = 2.5\text{ Hz}$, $A = 14\text{ px}$, random impulse jerk.
  4. *Parkinsonian Action/Postural Approximation*: $f = 5\text{ Hz}$, $A = 12\text{ px}$, labeled as model approximation.
  5. *One-Handed Thumb Reach*: Non-linear angular arc reach modeling radial thumb curvature.
- **Parametric Sliders**:
  - Oscillation Frequency (0–10 Hz)
  - Oscillation Amplitude (0–25 px)
  - Transit Jerk / Impulse (0–15 px)
  - Movement Urgency $u \in [0.6, 2.0]$
  - Sample Size $N \in \{500, 2000, 10000\}$
  - Directional Overshoot Ratio $\rho_{overshoot} = \sigma_\parallel / \sigma_\perp \in [1.0, 2.5]$ (default 1.5, badged "Model Assumption").

### FR5: High-Contrast Visual Telemetry Canvas
- Renders up to 250 animated particle tracers at 60 FPS using smooth quadratic/cubic Bézier approach paths + noise.
- Endpoint scatter markers with distinct shapes:
  - Emerald Circle = Primary Hit
  - Amber Triangle = Neutral Miss
  - Crimson Diamond = Destructive Collision
- Approach-cone covariance ellipse ($2\sigma$ envelope) aligned to approach vector $\hat{\mathbf{u}}$.
- Toggleable 2D Gaussian kernel hazard heatmap overlay.
- Accessible tabular results and `aria-live` status regions for screen readers.

### FR6: Honest Auto-Heal Constrained Solver
- Objective: Minimize collision probability $P(\text{collision})$ while respecting container bounding box and maintaining visual hierarchy.
- Strategy: Displaces destructive elements orthogonal/opposite to approach vector $\hat{\mathbf{u}}$, separates button clusters by $\ge 24\text{px}$, and expands undersized targets toward $\ge 44\text{px}$.
- Verification: Re-runs the exact same Monte Carlo seed.
- Status: Returns `solved` if $k = 0$, or honestly returns `infeasible` with the lowest-risk configuration if container dimensions are physically inadequate.

### FR7: Spatial vs. Non-Spatial Mitigation Matrix
Computes trade-offs across 4 UX patterns:
1. **Spatial Separation + Target Expansion (Auto-Heal CSS)**: 0% residual collision, 0 ms added time, 0 extra clicks.
2. **Soft Delete + Undo Toast**: Low collision consequence, 0 ms added primary time, 1 click to undo.
3. **2-Step Overflow Menu**: Destructive hidden behind menu, 0% direct collision, 2 extra clicks to access destructive.
4. **Explicit Confirmation Modal**: Destructive click opens confirmation modal, 0% single-click catastrophic loss, 1 extra confirmation click.

### FR8: Sensitivity Sweep & Deterministic Diagnostics
- Computes real-time sensitivity curve across overshoot ratio and tremor amplitude with Wilson 95% error bands.
- Plain-language diagnostic explains geometric factors (e.g. alignment angle, edge distance vs. tremor excursion).

### FR9: Opt-In Motor-Variability Pointer Stress Test
- Disabled by default. Clicking activates client-side cursor perturbation following active profile parameters. Pressing `Esc` or clicking anywhere instantly exits.

### FR10: Export Suite & Measured Runtime Telemetry
- Actual measured Web Worker duration in ms.
- Downloadable JSON Audit Receipt with timestamp, seed, layout coordinates, motor parameters, collision counts, and Wilson CIs.
- Copyable production CSS patch and Tailwind utility classes.

## States and Boundaries
- **Normal Running State**: Full UI interactive, canvas animating.
- **Simulating State**: Web Worker processing; progress indicator active.
- **Auto-Healed State**: Layout transitioned to safe coordinates; verification receipt displayed.
- **Infeasible Solver State**: Solver reports `Partially Mitigated (Zero-Collision Infeasible in Container)` with best effort layout.
- **Sandbox Error State**: Handled gracefully if pasted HTML contains unparseable nodes.

## Product Decisions
- **Web Worker Architecture**: Ensures smooth 60 FPS canvas animation without main thread jank during 10,000-trial runs.
- **Sandboxed `srcdoc` iframe**: Guarantees zero script injection risks while allowing DOM bounding box extraction.
- **Statistical Rigor**: Never displays "0% risk" without reporting the Wilson 95% CI upper bound.

## Non-Goals
- Real-time camera hand-tracking.
- Native operating system driver modifications.
- Medical diagnostic classification.
