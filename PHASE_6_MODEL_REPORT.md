# TOUCHLINE — PHASE 6 MODEL REPORT
## AI/ML PLAYER ATTRIBUTE & OVERALL RATING ENGINE

### 1. Dataset & Partition Summary
- **Total Rows Ingested**: 5693
- **Train Rows (<=2023)**: 3345 (Seasons: [2022, 2023])
- **Validation Rows (2024)**: 1544 (Seasons: [2024])
- **Held-Out Test Rows (2025)**: 804 (Seasons: [2025])
- **Total Unique Players**: 3669

### 2. Latent Target & Position-Aware Architecture
- **Target Strategy**: Statistically grounded latent domain targets constructed from per-90 metrics, conversion rates, and empirical-Bayes shrinkage ($w = \text{mins}/(\text{mins}+450)$).
- **Position Groups**: `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `ATTACKER`.

### 3. Validation & Model Selection Results (2023/24)
#### Position Group: GOALKEEPER
- **target_shooting**: Selected `RandomForest` (Validation MAE: 0.0675)
- **target_passing**: Selected `ElasticNet` (Validation MAE: 0.5240)
- **target_defending**: Selected `HistGradientBoosting` (Validation MAE: 0.5786)
- **target_dribbling**: Selected `RandomForest` (Validation MAE: 0.3998)
- **target_physical**: Selected `RandomForest` (Validation MAE: 0.1390)
- **target_goalkeeping**: Selected `RandomForest` (Validation MAE: 2.3543)
#### Position Group: DEFENDER
- **target_shooting**: Selected `HistGradientBoosting` (Validation MAE: 0.0833)
- **target_passing**: Selected `RandomForest` (Validation MAE: 0.2594)
- **target_defending**: Selected `HistGradientBoosting` (Validation MAE: 0.4544)
- **target_dribbling**: Selected `HistGradientBoosting` (Validation MAE: 0.3967)
- **target_physical**: Selected `RandomForest` (Validation MAE: 0.1230)
- **target_goalkeeping**: Selected `RandomForest` (Validation MAE: 0.2890)
#### Position Group: MIDFIELDER
- **target_shooting**: Selected `HistGradientBoosting` (Validation MAE: 0.1465)
- **target_passing**: Selected `RandomForest` (Validation MAE: 0.3129)
- **target_defending**: Selected `HistGradientBoosting` (Validation MAE: 0.2332)
- **target_dribbling**: Selected `HistGradientBoosting` (Validation MAE: 0.1610)
- **target_physical**: Selected `RandomForest` (Validation MAE: 0.0535)
- **target_goalkeeping**: Selected `HistGradientBoosting` (Validation MAE: 0.2290)
#### Position Group: ATTACKER
- **target_shooting**: Selected `HistGradientBoosting` (Validation MAE: 0.4784)
- **target_passing**: Selected `RandomForest` (Validation MAE: 0.3696)
- **target_defending**: Selected `HistGradientBoosting` (Validation MAE: 0.2865)
- **target_dribbling**: Selected `HistGradientBoosting` (Validation MAE: 0.3733)
- **target_physical**: Selected `HistGradientBoosting` (Validation MAE: 0.0678)
- **target_goalkeeping**: Selected `HistGradientBoosting` (Validation MAE: 0.3410)

### 4. Held-Out Test Evaluation Results (2024/25)
| Position Group | Attribute Domain | Selected Model | Test MAE | Test RMSE | Test R² | Sample Count |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GOALKEEPER | target_shooting | `RandomForest` | 0.2076 | 0.2076 | -874182247952788104780001050624.0000 | 82 |
| GOALKEEPER | target_passing | `ElasticNet` | 0.8409 | 0.9059 | 0.5602 | 82 |
| GOALKEEPER | target_defending | `HistGradientBoosting` | 0.3822 | 0.4285 | 0.8952 | 82 |
| GOALKEEPER | target_dribbling | `RandomForest` | 0.6518 | 0.6582 | -0.1363 | 82 |
| GOALKEEPER | target_physical | `RandomForest` | 0.0869 | 0.1087 | 0.9911 | 82 |
| GOALKEEPER | target_goalkeeping | `RandomForest` | 2.5376 | 2.5863 | -24.6612 | 82 |
| MIDFIELDER | target_shooting | `HistGradientBoosting` | 0.2276 | 0.3834 | 0.8226 | 722 |
| MIDFIELDER | target_passing | `RandomForest` | 0.4919 | 0.6284 | 0.4687 | 722 |
| MIDFIELDER | target_defending | `HistGradientBoosting` | 0.4935 | 0.6253 | 0.5251 | 722 |
| MIDFIELDER | target_dribbling | `HistGradientBoosting` | 0.3352 | 0.4094 | 0.7754 | 722 |
| MIDFIELDER | target_physical | `RandomForest` | 0.0690 | 0.0948 | 0.9906 | 722 |
| MIDFIELDER | target_goalkeeping | `HistGradientBoosting` | 0.2862 | 0.4098 | 0.3308 | 722 |

### 5. Final Ratings Distribution Statistics
- **Total Players Evaluated**: 5693
- **Total Rated Players**: 3883
- **Total Unrated Players**: 1810
- **OVR Range**: Min = 51 | Max = 91 | Mean = 73.9 | Median = 74.0 | Std = 7.75
- **Confidence Range**: Min = 0.22 | Max = 0.99 | Mean = 0.78

#### OVR Distribution Bands
- **1-49**: 0 players
- **50-59**: 174 players
- **60-69**: 966 players
- **70-79**: 1767 players
- **80-84**: 724 players
- **85-89**: 173 players
- **90-91**: 79 players
