# TOUCHLINE — PHASE 6 HELD-OUT TEST ISOLATION PROOF

## FORENSIC VERIFICATION OF UNTOUCHED TEST SET (SEASON 2024/25)

---

### 1. Test Isolation Summary
- **Held-Out Test Partition**: `804` player-season rows (`seasonYearEnd` == `2025`, 2024/25 Premier League open dataset).
- **Test Access Classification**: **CATEGORY A — GENUINELY UNTOUCHED UNTIL FINAL EVALUATION**.

---

### 2. Execution Flow Evidence Chain
1. **Partitioning Stage** (`ml/data/dataset.py:65-75`):
   Dataset is split cleanly into `train_df` ($\le 2023$), `val_df` ($2024$), and `test_df` ($2025$). `test_df` is stored in a separate DataFrame variable.
2. **Scaler Fitting Stage** (`ml/exports/exporter.py:35`):
   `preprocessor.fit(train_df)` is executed ONLY on `train_df`. `test_df` is not passed.
3. **Model Selection & Hyperparameter Tuning Stage** (`ml/training/trainer.py:40-85`):
   `trainer.train_and_select(train_df, val_df)` fits estimators on `train_df` and selects best models based on `val_df` MAE. `test_df` is completely absent from the tuning loop.
4. **Calibration Stage** (`ml/calibration/calibrator.py:15-35`):
   Calibration maps are fixed parametric normal transformations ($z$-score to 1–99) and do not fit on test data distribution.
5. **Final Evaluation Stage** (`ml/evaluation/evaluator.py:15-40`):
   `evaluate_held_out_test(best_models, test_df)` is called ONCE after models are frozen. The results are logged to `PHASE_6_MODEL_REPORT.md` and are NOT fed back into model adjustments.

---

### 3. Assertion & Failure Safeguards
Automated pytest test `test_dataset_loading_and_split()` in `ml/tests/test_ml_pipeline.py` asserts:
```python
assert train_seasons.isdisjoint(val_seasons)
assert val_seasons.isdisjoint(test_seasons)
assert max(train_seasons) < min(val_seasons) < min(test_seasons)
```
Any accidental inclusion of test season data into training or validation throws an immediate assertion failure.

---

### 4. Audit Finding
- **Test Contamination**: `FALSE`.
- **Test Set Status**: **100% UNTOUCHED & FROZEN UNTIL EVALUATION**.
