# TOUCHLINE — PHASE 6 WALKTHROUGH

## AI/ML PLAYER ATTRIBUTE & OVERALL RATING ENGINE — COMPLETE IMPLEMENTATION

---

### 1. Executive Summary & Objective
Phase 6 — AI/ML Player Attribute & Overall Rating Engine builds a professional, reproducible machine-learning system that converts real football performance data into Touchline player attributes ($1\text{--}99$), Touchline Overall Ratings ($1\text{--}91$), and confidence scores ($0.00\text{--}1.00$).

No proprietary game ratings (EA FC/FIFA, Football Manager, PES/eFootball) were used or identified in code or data. All training and inference operate strictly on the verified Phase 5 open football data foundation.

---

### 2. Conceptual Architecture
```text
Verified Real Football Data (Phase 5)
        ↓
Historical Player-Season Data (5,693 rows)
        ↓
Feature Engineering (per-90 rates, ratio metrics, age, physicals)
        ↓
Position-Grouped Dataset (GK, DEF, MID, ATT)
        ↓
TRAIN SET (3,345 rows | <= 2023)
        ↓
MODEL TRAINING (ElasticNet, RandomForest, HistGradientBoosting)
        ↓
VALIDATION (1,544 rows | 2024) -> Model Selection & Tuning
        ↓
HELD-OUT TEST (804 rows | 2025) -> Unseen Final Evaluation
        ↓
Attribute Calibration (1–99) & Touchline OVR (1–91)
        ↓
Sample-Size Reliability & Confidence Scoring (0.00–1.00)
        ↓
Database Persistence (PlayerAttributes & PlayerAttributeSnapshot)
        ↓
Simulation Engine Integration & Complete Rating Exports
```

---

### 3. Data Source & Dataset Construction
- Sourced from Phase 5 seed dataset `src/data/seeds/real-football-dataset.json`.
- Total player-season statistical rows: **5,693**.
- Total unique players: **3,669**.

---

### 4. Target Construction Strategy
Because no proprietary true rating labels exist, we constructed statistically valid latent domain performance targets:
- **Shooting Domain**: $0.45 \cdot \text{goals/90} + 0.25 \cdot \text{conversion\_rate} + 0.15 \cdot \text{shot\_accuracy} + 0.15 \cdot \text{shots\_on\_target/90}$.
- **Passing Domain**: $0.40 \cdot \text{assists/90} + 0.35 \cdot \text{key\_passes/90} + 0.25 \cdot \text{passes\_completed/90}$.
- **Defending Domain**: $0.35 \cdot \text{tackles/90} + 0.35 \cdot \text{interceptions/90} + 0.15 \cdot \text{clearances/90} + 0.15 \cdot \text{aerial\_duels/90}$.
- **Dribbling Domain**: $0.40 \cdot \text{starts\_ratio} + 0.30 \cdot \text{shot\_accuracy} + 0.30 \cdot \text{key\_passes/90}$.
- **Physical Domain**: $0.50 \cdot (\text{mins}/2700) + 0.30 \cdot (\text{height}/200) + 0.20 \cdot \text{starts\_ratio}$.
- **Goalkeeping Domain**: $0.45 \cdot \text{save\_pct} + 0.35 \cdot \text{clean\_sheet\_rate} + 0.20 \cdot (1 / (\text{goals\_conceded/90} + 0.5))$.

#### Empirical-Bayes Shrinkage:
To prevent low-minute players from receiving extreme unreliable latent scores, raw targets are shrunk toward the position group mean using:
$$T_{\text{shrunk}} = w \cdot T_{\text{raw}} + (1 - w) \cdot \bar{T}_{\text{pos}}$$
where $w = \frac{\text{minutes}}{\text{minutes} + 450.0}$.

---

### 5. Position-Grouped Modeling
Players are mapped from 15 canonical positions (`GK`, `CB`, `LB`, `RB`, `LWB`, `RWB`, `CDM`, `CM`, `CAM`, `LM`, `RM`, `LW`, `RW`, `ST`, `CF`) into 4 model families:
1. **`GOALKEEPER`**: Specialized shot-stopping, saves, goals conceded, clean sheets.
2. **`DEFENDER`**: Tackling, interceptions, clearances, aerial duels, physical.
3. **`MIDFIELDER`**: Short/long passing, vision, chance creation, ball control, tackles.
4. **`ATTACKER`**: Finishing, shot power, positioning, dribbling, pace.

---

### 6. Strict Non-Overlapping Temporal Split
- **Train Set**: `3,345` rows (Seasons 2021/22 & 2022/23 | `seasonYearEnd` $\le 2023$).
- **Validation Set**: `1,544` rows (Season 2023/24 | `seasonYearEnd` == `2024`).
- **Held-Out Test Set**: `804` rows (Season 2024/25 | `seasonYearEnd` == `2025`).

#### Preprocessor Leakage Guard:
`Preprocessor` fits `StandardScaler` **EXCLUSIVELY** on the Train Set ($\le 2023$). Scalers are transformed on Validation and Test sets without refitting.

---

### 7. Model Selection & Tuning Results
For each position group and attribute domain, 3 model candidates were trained and evaluated on the Validation Set:
1. Baseline `ElasticNet(alpha=0.1, l1_ratio=0.5)`
2. `RandomForestRegressor(n_estimators=100, max_depth=8)`
3. `HistGradientBoostingRegressor(max_iter=100, max_depth=6)`

Selected models achieved low validation MAE (~0.12 – 0.32) and high $R^2$ (~0.82 – 0.94).

---

### 8. Held-Out Test Evaluation (Season 2024/25)
Final models were evaluated **ONCE** on the held-out 804 test set rows:
- **Mean Test MAE**: `0.2415`
- **Mean Test R²**: `0.8140`
- The test set remained strictly unseen during feature selection, model selection, and calibration.

---

### 9. Attribute Calibration, Touchline OVR & Confidence
- **Attributes**: $1 \le \text{attr} \le 99$ (clamped).
- **Touchline OVR**: $1 \le \text{OVR} \le 91$ (position-weighted combination of key attributes).
- **Confidence**: $0.05 \le \text{conf} \le 0.99$ based on minutes played and sample size. Players with $< 90$ minutes are marked `UNRATED` with confidence `0.05`.

---

### 10. Database Persistence & Prisma Integration
Executing `scripts/import-ml-ratings.ts`:
- Updated **3,800** `PlayerAttributes` flat records in PostgreSQL.
- Created **3,800** `PlayerAttributeSnapshot` audit entries (`modelVersion: "touchline-ml-v1"`).

---

### 11. Complete Rating Exports Inventory
- `PLAYER_RATINGS_FINAL.csv`: CSV table of all player ratings and attributes.
- `PLAYER_RATINGS_FINAL.json`: JSON output with full metadata.
- `PLAYER_RATINGS_FINAL.md`: Markdown summary of top-rated players and unrated players.
- `TEAM_RATINGS_FINAL.csv` & `TEAM_RATINGS_FINAL.md`: Club squad ratings (130 clubs rated, squad average OVR, starting XI average OVR, star player).
- `TOUCHLINE_RATINGS_COMPLETE.md`: Structured plain text directory grouped by competition and club.
- `PHASE_6_MODEL_REPORT.md`: Comprehensive model diagnostic and evaluation report.
- `PHASE_6_FINAL_AUDIT.txt`: Plain-text audit report.
- `PHASE_6_WALKTHROUGH.md`: Complete technical walkthrough.

---

### 12. Verification Matrix Results
- `npx prisma validate`: **PASS** (Schema valid 🚀)
- `npx tsc --noEmit`: **PASS** (0 errors)
- `npx vitest run`: **PASS** (86/86 TS engine tests passed)
- `npm run build`: **PASS** (Next.js 15.5 production build compiled clean)
- `pytest ml/tests/`: **PASS** (6/6 Python ML tests passed)

---

### 13. Phase 7 Boundary
Phase 6 is **100% COMPLETE, VERIFIED, AND LOCKED**. No Phase 7 features (career progression, age decline, training, transfers) were started.
