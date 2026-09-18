# TOUCHLINE — PHASE 6 CONFIDENCE SCORE AUDIT

## SAMPLE SIZE RELIABILITY & DATA-QUALITY CONFIDENCE AUDIT

---

### 1. Confidence Formula Architecture
Confidence scores evaluate the **sample-size reliability and data completeness** of a player-season record:

$$C = \text{clip}\left(0.40 + 0.40 \cdot w_{\text{mins}} + 0.20 \cdot w_{\text{apps}}, 0.05, 0.99\right)$$

where:
- $w_{\text{mins}} = \min\left(1.0, \frac{\text{minutesPlayed}}{1800.0}\right)$
- $w_{\text{apps}} = \min\left(1.0, \frac{\text{appearances}}{20.0}\right)$

---

### 2. Penalty Rules
- **Low Minutes Penalty ($< 300$ minutes)**: If $\text{minutesPlayed} < 300$, confidence is scaled down by $0.50 \times$.
- **Unrated Penalty ($< 90$ minutes)**: If $\text{minutesPlayed} < 90$, status is set to `UNRATED` and confidence is pinned to `0.05`.

---

### 3. Classification Distinction
- **Classification**: **Data-Quality & Sample-Size Reliability Confidence**.
- **Scope**: Measures whether the available playing time and match statistics provide a reliable baseline for attribute estimation. It does NOT represent posterior variance from a Bayesian neural network.

---

### 4. Empirical Distribution
- Rated Players Confidence Range: `0.22` to `0.99` (Mean = `0.78`).
- Unrated Players Confidence: `0.05`.
