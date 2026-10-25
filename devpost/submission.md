# ⚡ Devpost Submission — SlipVector

## 📌 Project Tagline
Browser-native kinetic UI misclick and motor-variability stress auditor.

## 🔗 Project Links
- **Live Deployment URL:** [https://arulmuruganmcse2024-tech.github.io/slipvector/](https://arulmuruganmcse2024-tech.github.io/slipvector/)
- **GitHub Public Repository:** [https://github.com/arulmuruganmcse2024-tech/slipvector](https://github.com/arulmuruganmcse2024-tech/slipvector)
- **Demo Video:** [TO VERIFY BY HUMAN — Paste 3-minute pitch video YouTube or Loom link]
- **Audit Artifacts & Documentation:**
  - [Results Table (`docs/audit/results_table.md`)](https://github.com/arulmuruganmcse2024-tech/slipvector/blob/main/docs/audit/results_table.md)
  - [Interactive Button Map (`docs/audit/button_map.md`)](https://github.com/arulmuruganmcse2024-tech/slipvector/blob/main/docs/audit/button_map.md)
  - [Lighthouse Audit (`docs/audit/lighthouse.md`)](https://github.com/arulmuruganmcse2024-tech/slipvector/blob/main/docs/audit/lighthouse.md)
  - [Demo Script Numbers (`docs/audit/demo_numbers.md`)](https://github.com/arulmuruganmcse2024-tech/slipvector/blob/main/docs/audit/demo_numbers.md)
  - [Model Assumptions & Limitations (`docs/limitations.md`)](https://github.com/arulmuruganmcse2024-tech/slipvector/blob/main/docs/limitations.md)

---

## 💡 Inspiration
Modern web development frameworks and generative AI coding agents frequently place high-risk destructive buttons (`Delete Workspace`, `Revoke Keys`, `Cancel Order`) in close proximity to primary actions (`Save Changes`, `Publish`, `Complete Checkout`). 

Standard accessibility checks (such as WCAG 2.2 Success Criterion 2.5.8 Target Size Minimum at 24px, or AAA 2.5.5 at 44px) inspect elements in static isolation. They verify that a button is large enough to touch, but they do not evaluate the pointer's ballistic approach vector, directional overshoot during deceleration, or tremor amplitude during switch actuation. SlipVector was conceived to bridge this gap between static geometry guidelines and dynamic human-factors biomechanics.

---

## 🛠️ What It Does
**SlipVector** is an uncompromising, browser-native kinetic stress auditor that simulates realistic human motor variability and ballistic trajectories to audit and heal user interface layouts:

1. **Kinetic Pointer Swarm Simulation:**
   - Runs off-thread Web Workers executing $500$ to $10,000$ simulated pointing trials via minimum-jerk ballistic trajectories (Flash & Hogan, 1985), impulse variability along the approach axis (Meyer et al., 1988), and continuous Ornstein-Uhlenbeck stochastic tremor (4–8 Hz).
   - Classifies every trial into an exact partition: **Primary Hit**, **Destructive Collision**, or **Neutral Miss** ($Primary + Destructive + Miss \equiv N$).
   - Computes statistical uncertainty with the **Wilson Score 95% Confidence Interval** (never displaying a false "0.0% risk" without reporting confidence intervals).

2. **Fitts's Law Movement Time & Throughput Telemetry:**
   - Evaluates nominal movement difficulty ($ID = \log_2(D/W + 1)$) and movement time ($MT = a + b \cdot ID$) using MacKenzie's (1992) Shannon formulation ($a=160\text{ms}, b=130\text{ms/bit}$).
   - Derives empirical effective throughput ($TP_e$) using effective target width ($W_e = 4.133 \cdot SD_\parallel$) under ISO 9241-9 standards.

3. **Constrained Repulsive Auto-Heal Solver:**
   - Searches bounding containers to relocate destructive controls orthogonally away from the primary approach vector and expand button hitboxes to $\ge 44\text{px}$.
   - Evaluates layout geometry honestly and outputs strictly verified states: `SOLVED` (0 collisions certified), `NO_CHANGE_NEEDED` (baseline already meets zero collisions), or `INFEASIBLE` (container bounds prevent collision-free separation).
   - Re-simulates under the exact identical seed to provide a verifiable Before vs. After receipt showing collision delta and movement time change ($\Delta MT$).

4. **Zero-Crash HTML/CSS Sandboxed DOM Extraction:**
   - Users can paste custom HTML/CSS markup to audit custom components.
   - Code runs inside a strict sandboxed iframe (`sandbox="allow-same-origin"`) omitting `allow-scripts` to block XSS and malicious network execution.

5. **Self-Dogfooding Interface Audit:**
   - Audits SlipVector's own toolbar controls at runtime, verifying $0 / 500$ collisions.

---

## 🔬 Verified Audit Numbers (Fixed Seed 42, $N=10,000$)

| Preset | Baseline Destructive Rate ($k/N$ & 95% CI) | Baseline Hit Rate | Baseline MT | Auto-Heal Status | Healed Rate ($k/N$) | $\Delta MT$ Post-Heal |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. SaaS Modal** | **$128 / 10,000$ ($1.28\%$, CI $[1.08\%, 1.52\%]$)** | $82.78\%$ | $538\text{ ms}$ | **`SOLVED`** | **$0 / 10,000$ (CI $\le 0.04\%$)** | **$-14\text{ ms}$** |
| **2. Mobile Checkout** | **$260 / 10,000$ ($2.60\%$, CI $[2.31\%, 2.93\%]$)** | $85.91\%$ | $538\text{ ms}$ | **`SOLVED`** | **$0 / 10,000$ (CI $\le 0.04\%$)** | **$0\text{ ms}$** |
| **3. Clinical Infusion** *(illustrative)* | **$0 / 10,000$ ($0.00\%$, CI $[0.00\%, 0.04\%]$)** | $85.02\%$ | $439\text{ ms}$ | **`NO_CHANGE_NEEDED`** | **$0 / 10,000$ (CI $\le 0.04\%$)** | **$0\text{ ms}$** |
| **4. Git PR Bar** | **$0 / 10,000$ ($0.00\%$, CI $[0.00\%, 0.04\%]$)** | $91.40\%$ | $433\text{ ms}$ | **`NO_CHANGE_NEEDED`** | **$0 / 10,000$ (CI $\le 0.04\%$)** | **$0\text{ ms}$** |
| **5. 48px AAA Stress** | **$81 / 10,000$ ($0.81\%$, CI $[0.65\%, 1.01\%]$)** | $95.86\%$ | $517\text{ ms}$ | **`SOLVED`** | **$0 / 10,000$ (CI $\le 0.04\%$)** | **$0\text{ ms}$** |

### Out-of-Sample Calibration ($W=20\text{px}, D=500\text{px}$)
- **Steady Baseline Hit Rate:** $2,860 / 10,000$ ($28.60\%$)
- **Empirical Miss Rate:** $7,140 / 10,000$ ($71.40\%$)
- **Fitts ID:** $4.70\text{ bits}$, Mean MT: $764\text{ ms}$, Throughput: $6.15\text{ bits/s}$.
- Documented honestly without artificial constant tuning: open-loop impulse dispersion $\sigma_\parallel \approx 15.6\text{px}$ naturally overshoots narrow $20\text{px}$ targets over $500\text{px}$ ballistic reaches.

---

## 🏛️ Lighthouse & Quality Metrics

- **Accessibility:** **`100 / 100`** (0 critical or serious axe-core violations across 28 rules; full keyboard navigation, accessible names, visible focus rings)
- **Best Practices:** **`100 / 100`** (Zero console errors; safe sandboxing; modern module delivery)
- **SEO:** **`91 / 100`** (Complete Open Graph, Twitter cards, meta descriptions, semantic HTML5)
- **Performance:** **`80 / 100`** (Total Blocking Time: **`0 ms`**, Cumulative Layout Shift: **`0.081`**)
- **Automated Test Coverage:**
  - **22 Unit & Metamorphic Tests (Vitest):** Passing (`tests/engine.test.ts`, `tests/metrics.test.ts`, `tests/audit_runner.test.ts`)
  - **18 End-to-End Tests (Playwright):** Passing (`tests/buttons.spec.ts`, `tests/a11y.spec.ts`)
  - **Deterministic Fresh Clone Build:** Clean build in $< 2\text{s}$ via `node ./scripts/build.mjs`.

---

## 💻 How We Built It
- **Language & Runtime:** Pure TypeScript 5.8 with strict type checking (`noUnusedLocals`, `noUnusedParameters`).
- **Build & Bundler:** Vite 6 configured for minimal footprint (production bundle: 83 kB JS, 18 kB CSS).
- **Concurrency & Compute:** Dedicated Web Worker running with synchronous microtask fallback.
- **Rendering:** HTML5 2D Canvas with sub-pixel anti-aliased trajectory paths, normal distribution heatmaps, and pointer capture drag handles.
- **Test Automation:** Vitest 3 for mathematical metamorphic assertions; Playwright 1.64 + Axe-Core for automated button-by-button interaction and accessibility audits.

---

## 🏆 Accomplishments that We're Proud Of
- Defeating the "28px strawman" by proving mathematically and empirically that even when buttons pass WCAG AAA with $48\times 48\text{px}$ targets, placing a destructive action directly behind a primary action creates a kinetic collision hazard ($81 / 10,000$ collisions).
- Achieving $0\text{ ms}$ Total Blocking Time on Lighthouse by isolating Monte Carlo trajectory sampling in dedicated Web Workers.
- Delivering a 100/100 Lighthouse Accessibility score with zero automated axe-core violations.
- Computing every single metric live at runtime with byte-deterministic reproducibility under fixed seeds.

---

## 🔮 What's Next for SlipVector
- [TO VERIFY BY HUMAN — Figma Plugin integration for continuous design-time kinetic linting]
- [TO VERIFY BY HUMAN — Chrome DevTools extension for real-time DOM approach-vector evaluation]
- [TO VERIFY BY HUMAN — Expansion of motor variability profiles with clinical ergonomics research labs]
