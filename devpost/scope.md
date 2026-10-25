---
skill: 2-scope
doc: scope
status: approved
completed_at: 2026-10-25T03:45:20.000Z
---

# SlipVector

A browser-native kinetic UI misclick and motor-variability stress auditor simulating realistic human pointer trajectories to measure, heal, and mitigate accidental destructive clicks.

## The Unique Kernel
1. **Coupled Biomechanical Monte Carlo Simulation Engine**: Unifies MacKenzie's (1992) Shannon Fitts formulation, Meyer et al. (1988) approach-vector impulse scatter, and Ornstein-Uhlenbeck continuous motor oscillation running in a Web Worker with `Float32Array` zero-copy buffers.
2. **Constrained Repulsive Layout Solver (Auto-Heal)**: Evaluates layout geometry in real time to relocate destructive buttons orthogonal to ballistic approach vectors and expand touch targets to $\ge 44\text{px}$, providing empirical before-and-after re-simulation receipts or an honest `infeasible` status if container boundaries are physically constrained.
3. **Quantitative Mitigation Comparator**: Measures spatial layout separation directly against non-spatial UX patterns (Undo Toast, 2-Step Overflow Menu, Confirmation Modal) across residual hazard ($k/N$ with Wilson 95% CI) and routine interaction time tax ($MT$ in ms / extra clicks).

## Who It's For
Frontend engineers, accessibility leads, product designers, and AI-assisted builders whose generative coding tools frequently bundle destructive actions directly adjacent to primary actions in compact headers, dialogs, and toolbars.

Today, teams rely either on static WCAG guidelines (which check individual button dimensions in static isolation) or discover high misclick rates only after real users accidentally drop databases, cancel orders, or delete repositories.

## The Core Loop
1. **Select or Import UI Layout**: Choose one of 5 presets (including a WCAG AAA 48px stress case) or paste custom HTML/CSS into a sandboxed inspector.
2. **Execute Kinematic Pointer Swarm**: Trigger 500 to 10,000 Monte Carlo human pointer trajectories under selectable motor profiles (Steady Baseline, 4–8 Hz Essential Tremor, ~2.5 Hz Transit Sway, One-Handed Reach).
3. **Inspect Collision Telemetry & Sensitivity**: View animated trajectories, covariance error ellipses, Gaussian hazard heatmaps, Wilson 95% Confidence Intervals, and sensitivity sweeps across overshoot and tremor amplitude.
4. **Auto-Heal or Mitigate**: Click 1-button Auto-Heal to solve a safe-harbor layout and re-verify $0 / N$ risk, or review the trade-off matrix comparing spatial fixes against Undo Toast, Overflow, and Confirmation patterns.
5. **Export Production Patch**: Copy hardened CSS patches, Tailwind classes, or download a reproducible JSON Audit Receipt.

## Inspiration & Identity
- **Visual Aesthetic**: High-contrast dark human-factors instrumentation console (`#0A0D14` carbon slate, `#111622` panel surfaces, `#1E2638` hairline grids, Alabaster `#F8FAFC`, Emerald `#10B981`, Rose-Crimson `#F43F5E`, Cyan `#06B6D4`).
- **Inspirations**: Oscilloscope interfaces, aerodynamic wind-tunnel particle tracers, and flight-control telemetry dashboards.
- **Tone**: Scientifically honest, non-judgmental, transparently parametric, and rigorously grounded in peer-reviewed ergonomics literature.

## Why This Matters to the Learner
Static accessibility compliance gives a false sense of security: buttons can strictly satisfy WCAG 2.2 AA (24px) or AAA (44px) target size rules, yet suffer catastrophic misclick rates when placed immediately behind primary targets along natural ballistic approach vectors. Creating an empirical kinetic simulation tool empowers teams to catch motor-variability hazards during design and code review.

## What "Working" Looks Like
A developer loads Preset #5 (48px WCAG AAA Stress Case). The static auditor shows green "PASS" badges for both WCAG AA (24px) and AAA (44px). Running the kinetic swarm reveals destructive misclicks due to directional overshoot. Clicking **"🛡️ Run Auto-Heal Solver"** immediately displaces the destructive action away from the ballistic approach vector, re-runs the simulation, and proves $0 / 500$ collisions with an empirical Before/After Verification Receipt and clean CSS patch.

## The POC Boundary
### In Scope
- **5 High-Fidelity Presets**:
  1. *SaaS Settings Modal* (28px Save Changes vs. 28px Delete Workspace).
  2. *Mobile Commuter Checkout* (Complete Order vs. Cancel & Clear Cart under ~2.5 Hz transit sway).
  3. *Clinical Infusion Keypad* (Confirm Bolus vs. Reset Pump).
  4. *Git Pull Request Bar* (Merge Pull Request vs. Close & Delete Branch).
  5. *48px WCAG AAA Stress Case* (48px Publish Release vs. 48px Revoke Keys along direct approach vector).
- **Paste-Your-Own HTML/CSS Inspector**: Zero-crash sandboxed DOM geometry & role extractor using `<iframe sandbox="allow-same-origin" srcdoc="...">`.
- **Self-Dogfooding Toolbar Audit**: 1-click self-inspection of SlipVector's live toolbar dimensions.
- **Biomechanical Motor Engine**: MacKenzie Shannon Fitts, Meyer impulse scatter, Ornstein-Uhlenbeck continuous tremor.
- **High-DPI 60 FPS Canvas**: Particle trajectories, scatter markers, covariance ellipses, Gaussian heatmaps, with full `prefers-reduced-motion` compliance.
- **Interactive Drag & Resize**: Direct manipulation of buttons on the canvas.
- **Constrained Repulsive Solver**: Generates certified collision-free layouts or honest `infeasible` boundary reports.
- **Mitigation Matrix**: Spatial separation vs. Undo Toast vs. 2-Step Overflow vs. Confirmation Dialog.
- **Sensitivity Sweep Chart**: 2D parameter sweep across overshoot ratio and tremor amplitude with Wilson error bars.
- **Opt-In Motor Perturbation Pointer Mode**: Live browser cursor perturbation demo.
- **Export Suite**: CSS patches, Tailwind classes, and JSON Audit Receipt.

### Explicitly Cut for POC
- **Arbitrary Cross-Origin Web Crawling**: Blocked by browser Same-Origin Policy / CORS restrictions.
- **Hardware Eye-Tracking / Gaze Integration**: Requires specialized external peripherals beyond pure browser APIs.
- **Native OS Cursor Driver Hooks**: Operating system kernel drivers are out of browser sandbox capabilities.
- **Clinical Diagnostic Claims**: SlipVector is strictly an ergonomic screening tool; clinical claims are explicitly disclaimed.

## Later
- Figma plugin integrating the Web Worker engine into Canvas design layers.
- Headless CI/CD GitHub Action failing PRs when UI kinetic collision risk exceeds threshold.
- Multi-finger simultaneous touch modeling on tablet displays.
