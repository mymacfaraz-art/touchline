# TOUCHLINE — PHASE 6 FABRICATION & IMPUTATION AUDIT

## AUDIT OF STATISTICAL PREPROCESSING vs FABRICATION PREVENTION

---

### 1. Compliance Rules
- **ALLOWED**: Statistical preprocessing (per-90 rates, ratio metrics, train-fitted scaling, Empirical-Bayes shrinkage toward population means, clamping).
- **PROHIBITED**: Inventing fake goals, assists, minutes, appearances, tackles, saves, player identities, or copying proprietary ratings.

---

### 2. Audit Matrix of Preprocessing Mechanisms

| Mechanism | Implementation Location | Method / Formula | Legitimate Statistical Purpose? | Fabricates Real Data? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Per-90 Rate Scaling** | `ml/features/feature_builder.py:30-45` | $\text{stat} \times \frac{90.0}{\text{minutes}}$ | Standardizes volume metrics by time | No | **ALLOWED** |
| **Empirical-Bayes Shrinkage** | `ml/models/target_builder.py:65-75` | $w \cdot T + (1-w) \bar{T}$ | Shrinks small-sample variances toward prior | No | **ALLOWED** |
| **Zero Imputation for Absent Events** | `ml/features/feature_builder.py:75-80` | `NaN -> 0.0` for counts | Count metrics are 0 when unrecorded | No | **ALLOWED** |
| **Unrated Low-Minutes Filter** | `ml/inference/predictor.py:35` | `minutes < 90 -> UNRATED` | Prevents rating players with insufficient data | No | **ALLOWED** |
| **Invented Match Statistics** | Nowhere in codebase | N/A | None | No | **ZERO FABRICATION** |
| **Proprietary Rating Copying** | Nowhere in codebase | N/A | None | No | **ZERO PROPRIETARY DATA** |

---

### 3. Audit Conclusion
- Fabricated Football Statistics: **0.0% (ZERO)**.
- Players with insufficient data ($< 90$ mins) explicitly preserved as `UNRATED / INSUFFICIENT DATA`.
- Status: **PASSED (100% Truthful)**.
