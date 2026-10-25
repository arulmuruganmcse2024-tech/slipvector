# SlipVector Pre-Submission Empirical Audit: N=10,000 Results Table

**Fixed Pseudorandom Seed:** `42`  
**Sample Size:** `N = 10,000` trials per preset  
**Engine Aim Noise Coefficient:** `k_aim = 0.026` (calibrated against MacKenzie 1992 baseline)  
**Effective Width Formulation:** `W_e = 4.133 * SD_parallel` (ISO 9241-9 / Soukoreff & MacKenzie 2004)  

| # | Preset Layout | Profile | Primary Hits | Destructive Collisions (k/N, 95% CI) | Neutral Misses | Sum Check (P+D+M) | Nominal MT | Nominal ID | Nominal TP | Effective TP (We=4.133·SD) | Solver Status | Healed Collisions | Healed MT | Delta MT |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **SaaS Settings Modal** | Essential-Tremor-Like Oscillation | 8278 (82.8%) | **128** (1.28%, [1.08%, 1.52%]) | 1594 (15.9%) | **10000 / 10000** | 538 ms | 2.91 bits | 5.40 b/s | **5.13 b/s** | `SOLVED` | 0 / 10000 | 524 ms | **-14 ms** |
| 2 | **Mobile Commuter Checkout** | Transit Sway & Jolt | 8591 (85.9%) | **260** (2.60%, [2.31%, 2.93%]) | 1149 (11.5%) | **10000 / 10000** | 538 ms | 2.91 bits | 5.40 b/s | **4.65 b/s** | `SOLVED` | 0 / 10000 | 538 ms | **+0 ms** |
| 3 | **Clinical Infusion Keypad [illustrative, not a medical device, not validated]** | Parkinsonian Postural/Action Approximation [illustrative, not a medical device, not validated] | 8502 (85.0%) | **0** (0.00%, [0.00%, 0.04%]) | 1498 (15.0%) | **10000 / 10000** | 439 ms | 2.14 bits | 4.89 b/s | **6.06 b/s** | `NO_CHANGE_NEEDED` | 0 / 10000 | 439 ms | **+0 ms** |
| 4 | **Git Pull Request Bar** | Essential-Tremor-Like Oscillation | 9140 (91.4%) | **0** (0.00%, [0.00%, 0.04%]) | 860 (8.6%) | **10000 / 10000** | 433 ms | 2.10 bits | 4.85 b/s | **6.34 b/s** | `NO_CHANGE_NEEDED` | 0 / 10000 | 433 ms | **+0 ms** |
| 5 | **48px WCAG AAA Stress Case** | Essential-Tremor-Like Oscillation | 9586 (95.9%) | **81** (0.81%, [0.65%, 1.01%]) | 333 (3.3%) | **10000 / 10000** | 517 ms | 2.75 bits | 5.31 b/s | **5.36 b/s** | `SOLVED` | 0 / 10000 | 517 ms | **+0 ms** |

### Invariant Verifications
- **Partition Strict Invariant:** $\text{Primary Hits} + \text{Destructive Collisions} + \text{Neutral Misses} = N$ identically for all presets.
- **Dynamic Throughput:** Both Nominal Throughput and Effective Throughput ($W_e = 4.133 \cdot SD_\parallel$) are computed dynamically from actual trajectory endpoints.
- **Dynamic Movement Time:** $\Delta MT$ is recomputed dynamically from the post-heal target geometry.