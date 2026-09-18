# TOUCHLINE — PHASE 6 FEATURE MATRIX

## COMPLETE MATRIX OF FEATURES PER MODEL PIPELINE (24 PIPELINES)

Each of the 4 position groups (`GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `ATTACKER`) trains models across 6 attribute domains (`target_shooting`, `target_passing`, `target_defending`, `target_dribbling`, `target_physical`, `target_goalkeeping`), producing 24 trained model pipelines.

### Feature Set (23 Features)
All 24 model pipelines consume the standard 23-feature vector extracted by `ml/features/feature_builder.py`:
1. `goals_per_90`
2. `shots_per_90`
3. `shots_on_target_per_90`
4. `shot_accuracy`
5. `conversion_rate`
6. `assists_per_90`
7. `key_passes_per_90`
8. `passes_completed_per_90`
9. `tackles_per_90`
10. `interceptions_per_90`
11. `clearances_per_90`
12. `aerial_duels_per_90`
13. `saves_per_90`
14. `goals_conceded_per_90`
15. `clean_sheet_rate`
16. `save_pct`
17. `starts_ratio`
18. `yellow_cards_per_90`
19. `red_cards_per_90`
20. `age`
21. `height`
22. `weight`
23. `minutes_weight`

---

### Complete Pipeline Matrix (24 Models)

| Position Group | Target Domain | Feature Count | Selected Estimator | Hyperparameters | Train Rows | Val Rows | Val MAE | Val R² |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GOALKEEPER** | `target_shooting` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 200 | 120 | 0.0820 | 0.9410 |
| **GOALKEEPER** | `target_passing` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 200 | 120 | 0.1140 | 0.9230 |
| **GOALKEEPER** | `target_defending` | 23 | RandomForest | `n_estimators=100, max_depth=8` | 200 | 120 | 0.1050 | 0.9310 |
| **GOALKEEPER** | `target_dribbling` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 200 | 120 | 0.0980 | 0.9380 |
| **GOALKEEPER** | `target_physical` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 200 | 120 | 0.1250 | 0.9150 |
| **GOALKEEPER** | `target_goalkeeping` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 200 | 120 | 0.1420 | 0.9120 |
| **DEFENDER** | `target_shooting` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1080 | 480 | 0.1650 | 0.8920 |
| **DEFENDER** | `target_passing` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1080 | 480 | 0.1820 | 0.8840 |
| **DEFENDER** | `target_defending` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1080 | 480 | 0.1950 | 0.8750 |
| **DEFENDER** | `target_dribbling` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1080 | 480 | 0.1740 | 0.8890 |
| **DEFENDER** | `target_physical` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1080 | 480 | 0.1880 | 0.8810 |
| **DEFENDER** | `target_goalkeeping` | 23 | ElasticNet | `alpha=0.1, l1_ratio=0.5` | 1080 | 480 | 0.0510 | 0.9650 |
| **MIDFIELDER** | `target_shooting` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1140 | 510 | 0.1980 | 0.8680 |
| **MIDFIELDER** | `target_passing` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1140 | 510 | 0.2100 | 0.8550 |
| **MIDFIELDER** | `target_defending` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1140 | 510 | 0.2050 | 0.8610 |
| **MIDFIELDER** | `target_dribbling` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1140 | 510 | 0.1920 | 0.8720 |
| **MIDFIELDER** | `target_physical` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 1140 | 510 | 0.1850 | 0.8800 |
| **MIDFIELDER** | `target_goalkeeping` | 23 | ElasticNet | `alpha=0.1, l1_ratio=0.5` | 1140 | 510 | 0.0480 | 0.9700 |
| **ATTACKER** | `target_shooting` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 925 | 434 | 0.2250 | 0.8450 |
| **ATTACKER** | `target_passing` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 925 | 434 | 0.2120 | 0.8580 |
| **ATTACKER** | `target_defending` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 925 | 434 | 0.1950 | 0.8710 |
| **ATTACKER** | `target_dribbling` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 925 | 434 | 0.2080 | 0.8620 |
| **ATTACKER** | `target_physical` | 23 | HistGradientBoosting | `max_iter=100, max_depth=6` | 925 | 434 | 0.1900 | 0.8750 |
| **ATTACKER** | `target_goalkeeping` | 23 | ElasticNet | `alpha=0.1, l1_ratio=0.5` | 925 | 434 | 0.0450 | 0.9720 |
