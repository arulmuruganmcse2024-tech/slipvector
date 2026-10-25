# 🎙️ Pitch Video Script & Verification Telemetry

> **Purpose:** Exact verified numbers to read aloud during the Devpost pitch video demonstration.  
> **Source of Truth:** Runtime evaluation on branch `final-audit` (`docs/audit/results.json`).  
> **Fixed PRNG Seed:** `42` (Mulberry32 generator, deterministic across runs).  
> **Sample Size:** $N = 10,000$ trials (or studio preset $N=500$ for rapid interactive demo).  

---

## 🔢 1. SaaS Settings Modal (Preset #1)

### What to show on screen:
- Select **Preset #1 (SaaS Settings Modal)**. Target: `Save Changes` (28px). Adjacent Destructive: `Delete Workspace` (28px, 4px gap).
- Motor Profile: **Essential-Tremor-Like Oscillation (6 Hz)**.

### Numbers to read aloud:
- **Seed:** `42`
- **Baseline Trials:** $N = 10,000$
- **Destructive Collisions:** **$128 / 10,000$** ($1.28\%$)
- **Wilson 95% Confidence Interval:** **$[1.08\%, 1.52\%]$**
- **Primary Hits:** $8,278 / 10,000$ ($82.78\%$)
- **Neutral Misses:** $1,594 / 10,000$ ($15.94\%$)
- **Exact Partition Sum:** $8,278 + 128 + 1,594 = 10,000$ ($100.00\%$)
- **Baseline Movement Time ($MT$):** $538\text{ ms}$ (Difficulty $ID = 2.91\text{ bits}$, Throughput = $5.40\text{ bits/s}$)
- **Click "Run Auto-Heal"**:
  - **Status:** **`SOLVED`**
  - **Healed Collisions:** **$0 / 10,000$** ($0.00\%$, Wilson 95% CI upper bound: $0.04\%$)
  - **Primary Hit Rate Post-Heal:** $82.78\% \rightarrow 94.65\%$ (+$11.87\%$ boost due to $44\text{px}$ target expansion)
  - **Movement Time Delta ($\Delta MT$):** **$-14\text{ ms}$** ($538\text{ ms} \rightarrow 524\text{ ms}$)

---

## 🔢 2. Mobile Commuter Checkout (Preset #2)

### What to show on screen:
- Select **Preset #2 (Mobile Commuter Checkout)**. Target: `Complete Order` (44px). Adjacent Destructive: `Cancel & Clear Cart` (36px, 8px gap).
- Motor Profile: **Transit Sway & Jolt (~2.5 Hz)**.

### Numbers to read aloud:
- **Destructive Collisions:** **$260 / 10,000$** ($2.60\%$)
- **Wilson 95% Confidence Interval:** **$[2.31\%, 2.93\%]$**
- **Primary Hits:** $8,591 / 10,000$ ($85.91\%$)
- **Neutral Misses:** $1,149 / 10,000$ ($11.49\%$)
- **Exact Partition Sum:** $8,591 + 260 + 1,149 = 10,000$
- **Baseline Movement Time ($MT$):** $538\text{ ms}$
- **Click "Run Auto-Heal"**:
  - **Status:** **`SOLVED`**
  - **Healed Collisions:** **$0 / 10,000$** ($0.00\%$, Wilson 95% CI upper bound: $0.04\%$)
  - **Movement Time Delta ($\Delta MT$):** **$0\text{ ms}$** (no routine slowdown)

---

## 🔢 3. Clinical Infusion Keypad (Preset #3)
*(Illustrative, not a medical device, not validated)*

### What to show on screen:
- Select **Preset #3 (Clinical Infusion Keypad)**.
- Motor Profile: **Parkinsonian Postural/Action Approximation [illustrative, not a medical device, not validated] (5 Hz)**.

### Numbers to read aloud:
- **Destructive Collisions:** **$0 / 10,000$** ($0.00\%$, Wilson 95% CI upper bound: $0.04\%$)
- **Primary Hits:** $8,502 / 10,000$ ($85.02\%$)
- **Neutral Misses:** $1,498 / 10,000$ ($14.98\%$)
- **Exact Partition Sum:** $8,502 + 0 + 1,498 = 10,000$
- **Auto-Heal Status:** **`NO_CHANGE_NEEDED`** (honest solver reports baseline already meets zero-collision target)
- **Movement Time Delta ($\Delta MT$):** **$0\text{ ms}$**

---

## 🔢 4. Git Pull Request Bar (Preset #4)

### What to show on screen:
- Select **Preset #4 (Git Pull Request Bar)**. Target: `Merge Pull Request` (28px).
- Motor Profile: **Essential-Tremor-Like Oscillation (6 Hz)**.

### Numbers to read aloud:
- **Destructive Collisions:** **$0 / 10,000$** ($0.00\%$, Wilson 95% CI upper bound: $0.04\%$)
- **Primary Hits:** $9,140 / 10,000$ ($91.40\%$)
- **Neutral Misses:** $860 / 10,000$ ($8.60\%$)
- **Exact Partition Sum:** $9,140 + 0 + 860 = 10,000$
- **Auto-Heal Status:** **`NO_CHANGE_NEEDED`**
- **Movement Time Delta ($\Delta MT$):** **$0\text{ ms}$**

---

## 🔢 5. 48px WCAG AAA Stress Case (Preset #5)

### What to show on screen:
- Select **Preset #5 (48px WCAG AAA Stress Case)**. Both `Publish Release` and `Revoke Production Keys` are large $48\times 48\text{px}$ targets.
- Static Check: **WCAG AA (PASS) & WCAG AAA (PASS)**.
- Motor Profile: **Essential-Tremor-Like Oscillation (6 Hz)**.

### Numbers to read aloud:
- **The Core Paradox:** Despite passing WCAG 2.2 AAA with $48\text{px}$ targets, placing the destructive button directly behind the primary action along the approach vector creates kinetic hazard.
- **Destructive Collisions:** **$81 / 10,000$** ($0.81\%$)
- **Wilson 95% Confidence Interval:** **$[0.65\%, 1.01\%]$**
- **Primary Hits:** $9,586 / 10,000$ ($95.86\%$)
- **Neutral Misses:** $333 / 10,000$ ($3.33\%$)
- **Exact Partition Sum:** $9,586 + 81 + 333 = 10,000$
- **Click "Run Auto-Heal"**:
  - **Status:** **`SOLVED`**
  - **Healed Collisions:** **$0 / 10,000$** ($0.00\%$, Wilson 95% CI upper bound: $0.04\%$)
  - **Movement Time Delta ($\Delta MT$):** **$0\text{ ms}$** ($517\text{ ms} \rightarrow 517\text{ ms}$)

---

## 🔬 Out-of-Sample Calibration Point to Mention
- **Configuration:** $W = 20\text{px}, D = 500\text{px}$ under Steady Baseline.
- **Empirical Hit Rate:** $2,860 / 10,000$ ($28.60\%$).
- **Unassisted Miss Rate:** $7,140 / 10,000$ ($71.40\%$).
- **Scientific Rationale:** Demonstrates honest physical modeling without artificial constant clamping; at $D=500\text{px}$, open-loop ballistic impulse scatter $\sigma_\parallel \approx 15.6\text{px}$ naturally disperses beyond small $20\text{px}$ targets without closed-loop visual submovements.
