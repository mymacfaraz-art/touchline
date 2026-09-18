# TOUCHLINE — PHASE 6 TARGET & FEATURE OVERLAP AUDIT

## CRITICAL CIRCULARITY & LATENT RECONSTRUCTION ANALYSIS

---

### 1. Executive Summary
Because no legitimate external proprietary ratings (EA FC/FIFA, Football Manager) were used or copied, Phase 6 constructs statistically grounded latent domain target labels ($T$) directly from verified Phase 5 performance metrics, smoothed with Empirical-Bayes sample-size shrinkage.

The ML models take the 23-feature input vector $X$ (which contains raw per-90 metrics) and learn the mapping $f(X) \rightarrow T$.

This document audits the exact overlap between target formulas and feature inputs.

---

### 2. Domain Overlap Matrix

| Target Domain | Target Formula Inputs | Overlapping Feature Inputs | Overlap Severity | System Function Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| `target_shooting` | `goals_per_90`, `conversion_rate`, `shot_accuracy`, `shots_on_target_per_90` | `goals_per_90`, `conversion_rate`, `shot_accuracy`, `shots_on_target_per_90`, `shots_per_90` | **HIGH (Expected)** | Latent domain score reconstruction & position-aware model compression |
| `target_passing` | `assists_per_90`, `key_passes_per_90`, `passes_completed_per_90` | `assists_per_90`, `key_passes_per_90`, `passes_completed_per_90` | **HIGH (Expected)** | Latent domain score reconstruction & position-aware model compression |
| `target_defending` | `tackles_per_90`, `interceptions_per_90`, `clearances_per_90`, `aerial_duels_per_90` | `tackles_per_90`, `interceptions_per_90`, `clearances_per_90`, `aerial_duels_per_90` | **HIGH (Expected)** | Latent domain score reconstruction & position-aware model compression |
| `target_dribbling` | `starts_ratio`, `shot_accuracy`, `key_passes_per_90` | `starts_ratio`, `shot_accuracy`, `key_passes_per_90` | **MEDIUM (Expected)** | Latent domain score reconstruction & position-aware model compression |
| `target_physical` | `minutesPlayed`, `height`, `starts_ratio` | `minutes_weight`, `height`, `weight`, `starts_ratio` | **MEDIUM (Expected)** | Latent domain score reconstruction & position-aware model compression |
| `target_goalkeeping` | `save_pct`, `clean_sheet_rate`, `goals_conceded_per_90` | `save_pct`, `clean_sheet_rate`, `goals_conceded_per_90`, `saves_per_90` | **HIGH (Expected)** | Latent domain score reconstruction & position-aware model compression |

---

### 3. Methodological Interpretation
1. **Nature of the Model**: The ML regressors perform **predictive reconstruction of statistically constructed latent performance targets**.
2. **Why This Architecture Was Chosen**: In the absence of proprietary ground-truth labels, direct rule-based hardcoding of ratings is prohibited. The ML regressors learn position-specific weighting, non-linear interaction terms, and empirical-Bayes shrinkage smoothing across multi-dimensional feature space.
3. **Validation Metrics Scope**: Evaluation metrics ($R^2$, MAE) measure how accurately the model reconstructs the position-adjusted latent target, **NOT** predictive accuracy against an external proprietary commercial rating.

---

### 4. Audit Conclusion
- Circularity Status: **ACKNOWLEDGED & INTENTIONAL**.
- System Classification: **Statistical Latent Score Reconstruction & Feature Compression Engine**.
- Documentation Alignment: **VERIFIED**. Documentation updated to prevent misrepresentation of validation $R^2$ values.
