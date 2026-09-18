# TOUCHLINE — PHASE 6 MODEL REPORT

## AI/ML PLAYER ATTRIBUTE & OVERALL RATING ENGINE

---

### 1. Dataset & Partition Summary
- **Total Player-Season Records**: `5,693`
- **Train Partition (<=2023)**: `3,345` rows (Seasons: `2021/22`, `2022/23` | 2,878 unique players)
- **Validation Partition (2024)**: `1,544` rows (Season: `2023/24` | 1,544 unique players)
- **Held-Out Test Partition (2025)**: `804` rows (Season: `2024/25` | 804 unique players)
- **Total Unique Players**: `3,669` (3,584 canonical demographic profiles + 85 stats-only fallback profiles)

---

### 2. Latent Target & Model Architecture
- **Target Construction**: Statistically grounded latent domain targets constructed from per-90 performance metrics, conversion rates, and Empirical-Bayes shrinkage ($w = \frac{\text{minutes}}{\text{minutes} + 450.0}$).
- **Nature of Predictive Modeling**: Models perform **predictive reconstruction of statistically constructed latent performance targets & feature space compression across position groups**, rather than predicting an independently observed commercial ground-truth rating.
- **Position Groups**: `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `ATTACKER`.

---

### 3. Validation Model Selection Results (Season 2023/24)
Evaluated `ElasticNet`, `RandomForestRegressor`, and `HistGradientBoostingRegressor` per position group and domain:
- **Goalkeeper Domains**: `HistGradientBoosting` / `RandomForest` (Val MAE: `0.0820` – `0.1420`)
- **Defender Domains**: `HistGradientBoosting` (Val MAE: `0.1650` – `0.1950`)
- **Midfielder Domains**: `HistGradientBoosting` (Val MAE: `0.1850` – `0.2100`)
- **Attacker Domains**: `HistGradientBoosting` (Val MAE: `0.1900` – `0.2250`)

---

### 4. Held-Out Test Evaluation Results (Season 2024/25)
Evaluated **ONCE** on the held-out test set (804 rows):
- **Mean Test MAE**: `0.2415`
- **Mean Test RMSE**: `0.3210`
- **Mean Test R²**: `0.8140`
- Test data remained strictly unseen during training, feature selection, model selection, and calibration.

---

### 5. Final Ratings Distribution Statistics (5,693 Player-Seasons)
- **Total Evaluated**: `5,693` player-seasons
- **Rated Player-Seasons ($\ge 90$ mins)**: `3,883`
- **Unrated Player-Seasons ($< 90$ mins)**: `1,810`
- **Touchline OVR Range**: Min = `51` | Max = `91` | Mean = `74.2` | Median = `75.0` | Std = `6.8`
- **Confidence Range**: Min = `0.05` | Max = `0.99` | Mean = `0.78`

#### Touchline OVR Distribution Bands
- **1–49**: 0 players
- **50–59**: 85 players
- **60–69**: 742 players
- **70–79**: 2,124 players
- **80–84**: 684 players
- **85–89**: 215 players
- **90–91**: 33 players

---

### 6. Limitations & Methodological Scope
- Evaluated models measure multi-metric latent reconstruction accuracy across position groups, not correlation against external commercial game ratings.
- Unrecorded metrics in open datasets (e.g. progressive carries, high claim %, sprint count, distance covered) are recorded explicitly as `UNAVAILABLE_FROM_CURRENT_SOURCES`.
