# ⚡ SlipVector

> **Browser-Native Kinetic UI Misclick & Motor-Variability Stress Auditor**  
> *Submitted to the Devpost "Build With AI: Basics" Hackathon*  
> **Live Demo URL:** `https://slipvector.vercel.app` *(or run locally via `npm run preview`)*

[![Verification Status](https://img.shields.io/badge/Vitest-13%2F13%20Passing-10B981?style=flat-square&logo=vitest)](tests/engine.test.ts)
[![WCAG 2.2](https://img.shields.io/badge/WCAG%202.2-SC%202.5.8%20%7C%20SC%202.5.5-06B6D4?style=flat-square)](src/engine/staticChecks.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square)](LICENSE)

---

## 🧭 Project Navigation & Artifacts

- 📋 [**Project Scope (`devpost/scope.md`)**](devpost/scope.md) • [Visual Scope (`devpost/scope.html`)](devpost/scope.html)
- 📝 [**Product Requirements (`devpost/prd.md`)**](devpost/prd.md) • [Visual PRD (`devpost/prd.html`)](devpost/prd.html)
- 📐 [**Technical Specification (`devpost/spec.md`)**](devpost/spec.md) • [Visual Spec (`devpost/spec.html`)](devpost/spec.html)
- ✅ [**Build Checklist & Revision Log (`devpost/checklist.md`)**](devpost/checklist.md)
- 🗺️ [**Interactive System App Map (`devpost/app-map.html`)**](devpost/app-map.html)
- ⚠️ [**Model Assumptions & Limitations (`docs/limitations.md`)**](docs/limitations.md)

---

## ⚡ What is SlipVector?

**SlipVector** is a browser-native kinetic UI misclick and motor-variability stress auditor. Modern UI builders and AI coding agents routinely generate cramped action bars where destructive actions (`Delete Workspace`, `Revoke Keys`, `Drop Database`) sit right next to primary actions (`Save Changes`, `Publish`, `Complete Order`).

Static accessibility checkers (like WCAG 2.2 AA at 24px and AAA at 44px) evaluate buttons in static isolation. They verify that an individual button provides sufficient surface area, but **they do not model the pointer's ballistic approach vector, directional overshoot, or hand tremor during tap actuation**.

SlipVector simulates hundreds to thousands ($500$, $2,000$, or $10,000$) of realistic human pointer trajectories running in an off-thread Web Worker with `Float32Array` buffers. It reports accidental destructive collisions alongside the **Wilson Score 95% Confidence Interval**, computes an automated **Auto-Heal layout fix** with before/after verification receipts, and compares spatial separation against non-spatial UX patterns (Undo Toast, 2-Step Overflow, and Confirmation Modals).

---

## 🚀 10-Second Guided Demo

1. **Launch Studio**: Open SlipVector in your browser.
2. **Observe Preset #1 (SaaS Settings Modal)**:
   - `Save Changes` (28px) sits adjacent to `Delete Workspace` (28px, 4px gap).
   - Static Check: Passes WCAG AA (24px), Fails AAA (44px).
   - Click **"⚡ Run Kinetic Swarm"** (or press `Space`). Watch 500 animated pointer trajectories trace from the text input anchor to the primary button.
   - Observe the crimson collision markers where trajectories clip `Delete Workspace`.
3. **Execute Auto-Heal**:
   - Click **"🛡️ Run Auto-Heal Constrained Solver"**.
   - The engine repositions the destructive target orthogonal to the approach vector, expands hitboxes to $\ge 44\text{px}$, and automatically re-simulates with the identical seed.
   - Verify the **Before vs. After Verification Receipt** showing collision rate dropping to **$0 / 500$ ($0.00\%$, 95% CI upper bound: $0.76\%$)**.
4. **Inspect the "48px WCAG AAA Stress Case" (Preset #5)**:
   - Select **Preset #5** from the dropdown. Both `Publish Release` and `Revoke Production Keys` are large `48x48px` targets (passing both WCAG AA and AAA).
   - Run the swarm: Observe that because `Revoke Production Keys` sits directly behind `Publish Release` along the approach vector, **directional overshoot still causes destructive collisions** ($3 / 500$, $0.60\%$).
   - This empirically defeats the "28px strawman" and proves that static target size alone is insufficient without approach-vector awareness.
5. **Dogfood SlipVector**:
   - Click **"🔍 Audit SlipVector's Own UI (Dogfood)"**. The app extracts its own live toolbar coordinates and proves $0 / 500$ collisions.

---

## 🔬 Mathematical Formulations

### 1. MacKenzie's (1992) Shannon Formulation of Fitts's Law
Target difficulty index ($ID$) and movement time ($MT$):

$$ID = \log_2\left(\frac{D}{W} + 1\right)$$

$$MT = a + b \cdot ID$$

$$\text{Throughput } (TP) = \frac{ID}{MT / 1000} \quad (\text{bits/s})$$

*Calibrated coefficients:* $a = 160\text{ ms}$, $b = 130\text{ ms/bit}$, resulting in Throughput $TP \in [3.0, 6.5]\text{ bits/s}$ matching empirical mouse pointing studies.

### 2. Meyer et al. (1988) / Schmidt et al. (1979) Impulse Variability
The approach vector from anchor $\mathbf{x}_{\text{anchor}}$ to target $\mathbf{x}_{\text{target}}$ defines an orthonormal frame:

$$\hat{\mathbf{u}} = \frac{\mathbf{x}_{\text{target}} - \mathbf{x}_{\text{anchor}}}{\|\mathbf{x}_{\text{target}} - \mathbf{x}_{\text{anchor}}\|}, \quad \hat{\mathbf{v}} = (-\hat{u}_y, \hat{u}_x)$$

Ballistic primary scatter scales with movement amplitude $D$ and urgency $u$, independent of target width $W$:

$$\sigma_\perp = k_{\text{aim}} \cdot D \cdot u, \quad \sigma_\parallel = \rho_{\text{overshoot}} \cdot \sigma_\perp$$

Where $\rho_{\text{overshoot}} = 1.5$ by default (user-adjustable $1.0 - 2.5$, badged as **Model Assumption**). Expanding target width $W$ strictly increases geometric capture without paradoxically inflating cursor noise.

### 3. Continuous Ornstein-Uhlenbeck Stochastic Tremor
During transit and tap actuation dwell ($t_{\text{dwell}} \approx 90\text{ms}$), continuous hand tremor oscillates:

$$\mathbf{\eta}(t) = \mathbf{\eta}_{\text{osc}}(t) + \mathbf{\eta}_{\text{OU}}(t)$$

$$d\mathbf{\eta}_{\text{OU}} = -\theta \mathbf{\eta}_{\text{OU}} dt + \sigma_{\text{OU}} d\mathbf{W}_t$$

$$\mathbf{\eta}_{\text{osc}}(t) = A_{\text{tremor}} \cdot \left[ \sin(2\pi f t + \phi_x)\hat{\mathbf{v}} + \cos(2\pi f t + \phi_y)\hat{\mathbf{u}} \right]$$

### 4. Wilson Score 95% Confidence Interval
For $k$ collisions in $n$ trials with $z = 1.959964$:

$$\hat{p} = \frac{k}{n}, \quad \text{Center} = \frac{\hat{p} + \frac{z^2}{2n}}{1 + \frac{z^2}{n}}, \quad \text{Margin} = \frac{z}{1 + \frac{z^2}{n}} \sqrt{\frac{\hat{p}(1 - \hat{p})}{n} + \frac{z^2}{4n^2}}$$

When $k = 0$, SlipVector never claims "0% risk"; it displays `"0 / 500 collisions (0.00%, 95% CI upper bound: 0.76%)"`.

---

## 📊 Mitigation Trade-Off Matrix

| Mitigation Pattern | Residual Hazard ($k/N$ + Wilson 95% CI) | Added Routine Time | Recovery Friction | Recommended Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Spatial Separation + Hitbox Expansion (Auto-Heal)** | **`0 / 500 (0.00%, CI: [0.00%, 0.76%])`** | **`0 ms`** | **`0 clicks`** | Standard modals and toolbars where container dimensions permit $\ge 24\text{px}$ spatial margin. |
| **Soft Delete + Undo Toast (5s Window)** | `Baseline raw rate (Reversible)` | `0 ms` | `+1 click` | High-frequency productivity workflows (email, notes, issues) where routine friction must stay zero. |
| **2-Step Overflow Menu (`...`)** | **`0 / 500 (0.00%, CI: [0.00%, 0.76%])`** | `0 ms` (primary) | `+1 click` (destructive) | Cramped toolbars, card footers, or mobile bottom sheets with insufficient spatial margin. |
| **Explicit Confirmation Dialog** | `~ (k/N)² compound probability` | `0 ms` (primary) | `+1 click` (modal) | Irreversible catastrophic operations (e.g. drop database, revoke production SSL keys). |

---

## 🛠️ Local Installation & Development

```bash
# Clone the repository
git clone https://github.com/ArulMurugan2905/slipvector.git
cd slipvector

# Install dependencies
npm install

# Run automated verification suite (13 non-circular tests)
npm test

# Build production bundle
npm run build

# Start local preview server
npm run preview
```

Open `http://localhost:4173/` in your browser.

---

## 📚 References

1. **Fitts, P. M. (1954)**. *The information capacity of the human motor system in controlling the amplitude of movement*. Journal of Experimental Psychology, 47(6), 381–391.
2. **Schmidt, R. A., Zelaznik, H., Hawkins, B., Frank, J. S., & Quinn, J. T. (1979)**. *Motor-output variability: A theory for the accuracy of rapid motor acts*. Psychological Review, 86(5), 415–451.
3. **Meyer, D. E., Abrams, R. A., Kornblum, S., Wright, C. E., & Smith, J. E. (1988)**. *Optimality in human motor performance: Ideal rapidly aimed movements, alternative mechanisms, and new models*. Psychological Review, 95(3), 340–370.
4. **MacKenzie, I. S. (1992)**. *Fitts' law as a research and design tool in human-computer interaction*. Human-Computer Interaction, 7(1), 91–139.
5. **Wilson, E. B. (1927)**. *Probable inference, the law of bias, and the log of the odds*. Journal of the American Statistical Association, 22(158), 209–212.

---

> **Non-Clinical Disclaimer**: Model-based ergonomic screening tool using parametric pointing models; not a clinical diagnostic instrument or a substitute for usability testing with human participants.
