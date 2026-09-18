# TOUCHLINE — PHASE 6 PREPROCESSING ISOLATION AUDIT

## AUDIT OF FEATURE PREPROCESSING & DATA LEAKAGE GUARDS

---

### 1. Preprocessing Isolation Matrix

| Component / Preprocessing Step | Fit Dataset | Transform Dataset | Leakage Status | Evidence / Code Location |
| :--- | :--- | :--- | :--- | :--- |
| **StandardScaler (Feature Scaling)** | `Train` (`seasonEnd <= 2023`) | `Train`, `Val`, `Test` | **PASSED (No Leakage)** | `ml/features/preprocessor.py:18-28` (`fit` called only on train_df) |
| **Feature Rate Calculations (per-90)** | Row-local | Row-local | **PASSED (No Leakage)** | `ml/features/feature_builder.py:30-75` (Strictly season-local per row) |
| **Empirical-Bayes Shrinkage ($w$)** | Row-local | Row-local | **PASSED (No Leakage)** | `ml/models/target_builder.py:65-75` ($w = \text{mins}/(\text{mins}+450)$) |
| **Target Standard Deviation Normalization** | `Train` (`seasonEnd <= 2023`) | `Train`, `Val`, `Test` | **PASSED (No Leakage)** | `ml/models/target_builder.py:76-80` |
| **Attribute Percentile Calibration** | `Train` & `Val` | Inference (`Full`) | **PASSED (No Leakage)** | `ml/calibration/calibrator.py:15-35` (Fixed parametric z-mapping) |
| **Model Selection & Tuning** | `Train` (fit) & `Val` (select) | `Test` (evaluated once) | **PASSED (No Leakage)** | `ml/training/trainer.py:45-85` |
| **Held-Out Test Set Evaluation** | None (Frozen) | `Test` (`2024/25`) | **PASSED (No Leakage)** | `ml/evaluation/evaluator.py:15-40` (Evaluated ONCE) |

---

### 2. Verification Proof
- `Preprocessor.fit()` is called exclusively on `train_df` inside `run_pipeline_and_export()` in `ml/exports/exporter.py`.
- No global dataset mean/std statistics are computed across the combined dataframe before partitioning.
- Automated unit test `test_preprocessor_leakage_prevention()` in `ml/tests/test_ml_pipeline.py` asserts that calling `transform()` on new datasets uses pre-fitted parameters without refitting.
