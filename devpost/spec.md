---
skill: 4-spec
doc: spec
status: approved
completed_at: 2026-10-25T03:45:40.000Z
---

# SlipVector — Technical Spec

## How This Works, In Plain Language
SlipVector is a high-performance, browser-native client-side application. When a user tests a UI layout, the app sends the layout bounding boxes and motor variability settings to a dedicated Web Worker. The Worker runs hundreds to thousands ($500$, $2,000$, or $10,000$) of seeded Monte Carlo pointer movements using peer-reviewed human motor formulations (MacKenzie's Shannon Fitts Law, Meyer impulse noise, Ornstein-Uhlenbeck tremor).

The simulation computes the exact approach angle from the anchor element to the target, integrates ballistic movement and continuous hand tremor, and checks every trajectory point for collisions against destructive and primary targets. The results—collision counts, Wilson 95% confidence intervals, movement times, throughput, and sample trajectory coordinate buffers—are transferred back to the main thread via typed arrays.

The main thread renders animated particles at 60 FPS on an HTML5 Canvas, presents side-by-side static vs. kinetic findings, runs sensitivity sweeps, offers a 1-click Auto-Heal solver that relocates destructive buttons, and calculates quantitative trade-offs for non-spatial alternatives.

## The Core Journey Through the System
1. **User loads preset or pastes HTML** $\rightarrow$ `src/engine/presets.ts` or `src/import/htmlExtractor.ts` parses the DOM into an array of `UIElement` records `(id, label, role, rect)`.
2. **User triggers simulation** $\rightarrow$ Main thread serializes `SimulationConfig` and passes it via `postMessage` to `src/worker/simWorker.ts`.
3. **Web Worker executes trials** $\rightarrow$ Calls `src/engine/biomechanics.ts` across $N$ iterations using `mulberry32` PRNG. Computes trajectories, hit states, Fitts metrics, and Wilson CI via `src/engine/stats.ts`.
4. **Worker posts results back** $\rightarrow$ Sends `SimulationResult` containing summary statistics, typed coordinate buffers, and real execution duration in ms.
5. **Main thread receives results** $\rightarrow$ `src/canvas/swarmRenderer.ts` animates trajectories; `src/ui/` updates telemetry badges, sensitivity chart, and deterministic diagnostic findings.
6. **User clicks "Run Auto-Heal Solver"** $\rightarrow$ `src/engine/solver.ts` searches the container boundary for safe coordinates orthogonal to the approach vector, produces patch CSS/Tailwind, and automatically re-invokes the Web Worker with the same seed to verify $0 / N$ risk or report infeasibility.
7. **User reviews mitigations** $\rightarrow$ `src/engine/mitigations.ts` evaluates spatial fixes against Undo Toast, Overflow Menu, and Confirmation Dialog.
8. **User exports results** $\rightarrow$ Exports copy-pasteable CSS, Tailwind classes, or downloads reproducible JSON Audit Receipt.

## Stack
- **Language**: TypeScript 5.8+ (strict type-checking, zero runtime overhead).
- **Build Tool / Bundler**: Vite 6+ (instant HMR, native Web Worker module bundling, zero-config production bundling).
- **Styling**: Vanilla CSS with modern custom properties (precision engineering console aesthetic, zero bloated CSS runtime).
- **Math & Simulation Engine**: Pure TypeScript with `Float32Array` buffers, zero external runtime math dependencies.
- **Testing**: Vitest (instant unit/integration testing for biomechanics, PRNG, Wilson CI, calibration, and solver honesty) + Playwright (end-to-end browser verification).

## Where It Runs and How Someone Tries It
- **Runtime**: Modern web browser (Chrome, Edge, Firefox, Safari).
- **Local Dev Server**: `npm run dev` (starts on `http://localhost:5173`).
- **Production Build**: `npm run build && npm run preview`.
- **Automated Tests**: `npm test` (executes the complete Vitest non-circular verification suite).
- **Deployment**: Static single-page application ready for Vercel, GitHub Pages, or Netlify via `vercel.json` or `.github/workflows/deploy.yml`.

## Look and Feel
- **Color Palette**:
  - Background Base: `#0A0D14` (Carbon slate)
  - Panel Surfaces: `#111622` (Elevated console card)
  - Structural Borders: `#1E2638` (Hairline crisp division)
  - Typography: `#F8FAFC` (Alabaster primary text), `#94A3B8` (Steel secondary text)
  - Accents: `#10B981` (Emerald / Primary Hit / Safe), `#F59E0B` (Amber / Warning / Miss), `#F43F5E` (Crimson / Destructive Hazard), `#06B6D4` (Cyan / Approach Vector / Tracers).
- **Typography**: Inter / system geometric sans for UI controls; `JetBrains Mono` with `font-variant-numeric: tabular-nums` for all metrics, coordinates, intervals, and code snippets.
- **Density**: High-density engineering studio; all controls have clear touch targets ($\ge 44\text{px}$) and keyboard focus outlines.

## Components

### 1. `src/engine/prng.ts`
Deterministic pseudorandom number generator using `mulberry32(seed: number)`. Produces uniform floating-point numbers in $[0, 1)$ with bit-for-bit reproducibility across runs. Also includes Box-Muller transform for standard Gaussian sampling $N(0, 1)$.

### 2. `src/engine/stats.ts`
- `wilsonInterval(k: number, n: number, z = 1.95996)`: Computes the Wilson score 95% confidence interval for binomial proportions:
  $$\hat{p} = \frac{k}{n}, \quad \text{Center} = \frac{\hat{p} + \frac{z^2}{2n}}{1 + \frac{z^2}{n}}, \quad \text{Margin} = \frac{z}{1 + \frac{z^2}{n}} \sqrt{\frac{\hat{p}(1 - \hat{p})}{n} + \frac{z^2}{4n^2}}$$
- Handles edge cases: when $k = 0$, lower bound is strictly $0$ and upper bound is $\frac{z^2}{2n + z^2}$ (for $N=500$, upper bound is $\approx 0.762\%$).
- Computes mean, median, standard deviation, and percentiles for movement times and trajectories.

### 3. `src/engine/biomechanics.ts`
- **MacKenzie (1992) Shannon Fitts Law**:
  $$ID = \log_2\left(\frac{D}{W} + 1\right), \quad MT = a + b \cdot ID, \quad TP = \frac{ID}{MT}$$
  Calibrated coefficients: $a = 150\text{ms}$, $b = 135\text{ms/bit}$, yielding Throughput $TP \in [3.0, 6.5]\text{ bits/s}$ matching empirical literature.
- **Approach Vector & Frame Rotation**:
  $$\hat{\mathbf{u}} = \frac{\mathbf{x}_{\text{target}} - \mathbf{x}_{\text{anchor}}}{\|\mathbf{x}_{\text{target}} - \mathbf{x}_{\text{anchor}}\|}, \quad \hat{\mathbf{v}} = (-\hat{u}_y, \hat{u}_x)$$
- **Meyer et al. (1988) / Schmidt et al. (1979) Impulse Variability**:
  Primary ballistic scatter scales with movement amplitude $D$ and urgency $u$:
  $$\sigma_\perp = k_{\text{aim}} \cdot D \cdot u, \quad \sigma_\parallel = \rho_{\text{overshoot}} \cdot \sigma_\perp$$
  Where $\rho_{\text{overshoot}} = 1.5$ by default (slider $1.0 - 2.5$). Independent of target width $W$.
- **Continuous Stochastic Tremor Integration**:
  Superimposes Ornstein-Uhlenbeck mean-reverting noise $d\mathbf{\eta} = -\theta \mathbf{\eta} dt + \sigma d\mathbf{W}_t$ plus sinusoidal tremor $\mathbf{A} \sin(2\pi f t + \phi)$ during transit and $90\text{ms}$ actuation dwell.
- **Hit Detection**: Checks point-in-rect for primary, destructive, and neutral bounding boxes.

### 4. `src/engine/staticChecks.ts`
Evaluates layouts against:
- `WCAG 2.2 SC 2.5.8 (AA Target Size >= 24x24px) — SlipVector Static Check`
- `WCAG 2.2 SC 2.5.5 (AAA Target Size >= 44x44px) — SlipVector Static Check`
Includes edge-to-edge spacing calculation.

### 5. `src/engine/solver.ts`
- Constrained repulsive layout solver.
- Computes safe placement for destructive elements orthogonal to approach vector $\hat{\mathbf{u}}$, separated by at least $24\text{px}$ from primary targets, within container bounds $[0, W_{\text{container}}] \times [0, H_{\text{container}}]$.
- Expands target sizes toward $\ge 44\text{px}$.
- Evaluates candidate layouts using fast Monte Carlo checks; if safe harbor is proven, outputs `status: 'solved'`, patch CSS, and Tailwind classes.
- If physical bounds prevent $0$ collisions (e.g. cramped container or extreme tremor), honestly returns `status: 'infeasible'` with the best achievable configuration.

### 6. `src/engine/mitigations.ts`
Evaluates trade-offs across 4 strategies:
- Spatial Separation + Target Expansion (Auto-Heal)
- Soft Delete + Undo Toast
- 2-Step Overflow Menu
- Confirmation Modal
Provides residual collision rate ($k/N$ + Wilson CI), routine movement time penalty (ms), and recovery friction (extra clicks).

### 7. `src/import/htmlExtractor.ts`
Sanitized DOM extractor rendering custom HTML inside `<iframe sandbox="allow-same-origin" srcdoc="...">`. Queries rendered geometry and assigns semantic roles based on transparent heuristic rules with interactive table overrides.

### 8. `src/worker/simWorker.ts`
Dedicated Web Worker handling simulation requests. Allocates `Float32Array` buffers for trajectory coordinates, executes $N$ trials, computes statistics, and returns results without blocking the UI thread.

### 9. `src/canvas/swarmRenderer.ts`
High-performance Canvas renderer displaying bounding boxes, approach vector arrow, animated particles, scatter markers, covariance ellipses, and Gaussian hazard density heatmaps.

## Data Model

```typescript
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ElementRole = 'anchor' | 'primary' | 'destructive' | 'neutral';

export interface UIElement {
  id: string;
  label: string;
  role: ElementRole;
  rect: Rect;
  style?: Record<string, string>;
}

export interface MotorProfile {
  id: string;
  name: string;
  frequency: number; // Hz (0 - 10)
  amplitude: number; // px (0 - 25)
  jerkImpulse: number; // px (0 - 15)
  urgency: number; // 0.6 - 2.0
  overshootRatio: number; // 1.0 - 2.5 (sigma_parallel / sigma_perp)
  description: string;
}

export interface SimulationConfig {
  elements: UIElement[];
  container: { width: number; height: number };
  motorProfile: MotorProfile;
  sampleSize: 500 | 2000 | 10000;
  seed: number;
  dwellTimeMs: number;
}

export interface WilsonInterval {
  proportion: number;
  lower: number;
  upper: number;
}

export interface TrialResult {
  hitType: 'primary' | 'destructive' | 'neutral' | 'miss';
  endX: number;
  endY: number;
  movementTimeMs: number;
  idBits: number;
  tpBitsPerSec: number;
}

export interface SimulationResult {
  sampleSize: number;
  seed: number;
  durationMs: number; // measured worker time in ms
  primaryHits: number;
  destructiveCollisions: number;
  neutralHits: number;
  totalMisses: number;
  destructiveWilsonCI: WilsonInterval;
  primaryWilsonCI: WilsonInterval;
  meanMTMs: number;
  meanIDBits: number;
  meanTPBitsPerSec: number;
  trajectoriesSample: Float32Array; // sample of coordinates for animation
  endpoints: Float32Array; // x, y, hitType for all N trials
}

export interface SolverResult {
  status: 'solved' | 'infeasible';
  optimizedElements: UIElement[];
  beforeCollisions: number;
  afterCollisions: number;
  beforeWilsonCI: WilsonInterval;
  afterWilsonCI: WilsonInterval;
  deltaMTMs: number;
  patchCSS: string;
  tailwindClasses: string;
  explanation: string;
}
```

## File Structure

```
slipvector/
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md / scope.html
│   ├── prd.md / prd.html
│   ├── spec.md / spec.html
│   ├── checklist.md
│   └── app-map.html
├── docs/
│   └── limitations.md
├── src/
│   ├── index.html
│   ├── main.ts
│   ├── style.css
│   ├── canvas/
│   │   ├── swarmRenderer.ts
│   │   └── heatmap.ts
│   ├── engine/
│   │   ├── prng.ts
│   │   ├── stats.ts
│   │   ├── biomechanics.ts
│   │   ├── staticChecks.ts
│   │   ├── presets.ts
│   │   ├── solver.ts
│   │   └── mitigations.ts
│   ├── import/
│   │   └── htmlExtractor.ts
│   ├── perturbation/
│   │   └── pointerStress.ts
│   ├── ui/
│   │   ├── controlDeck.ts
│   │   ├── telemetryBanner.ts
│   │   ├── sensitivityChart.ts
│   │   ├── autoHealModal.ts
│   │   ├── mitigationTable.ts
│   │   ├── htmlImportModal.ts
│   │   └── exportDrawer.ts
│   └── worker/
│       └── simWorker.ts
├── tests/
│   ├── engine.test.ts
│   └── solver.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── vercel.json
└── README.md
```

## Important Failure Modes & Fallbacks
1. **Pasted HTML with malformed elements or external scripts**: The HTML extractor sanitizes the snippet via `<iframe sandbox="allow-same-origin" srcdoc="...">`, stripping `<script>` tags and rejecting untrusted payloads without throwing a security error.
2. **Cramped container where zero collisions is physically impossible**: The solver does not fake zero risk; it honestly reports `status: 'infeasible'`, surfaces the best achievable configuration, and notes why the container boundary prevents safe separation.
3. **Touch-screen device attempting mouse perturbation stress test**: The cursor perturbation mode detects touch environments and displays a polite notice explaining that pointer lock perturbation requires a mouse or trackpad.

## What Was Simplified and Why
- **Parametric Tremor Model instead of Electromyographic (EMG) Signal Capture**: We model tremor through validated frequency bands (4–8 Hz sinusoidal + Ornstein-Uhlenbeck stochastic drift) rather than requiring specialized biomechanical EMG hardware sensors.
- **Sandboxed `srcdoc` iframe instead of Cross-Origin Proxy**: Web security forbids reading arbitrary third-party website DOMs without server-side proxies; we provide a high-fidelity paste-your-own HTML/CSS inspector and dogfood audit to audit real layouts safely.
