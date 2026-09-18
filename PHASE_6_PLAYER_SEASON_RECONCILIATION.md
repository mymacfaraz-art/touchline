# TOUCHLINE — PHASE 6 PLAYER-SEASON RECONCILIATION

## RECONCILIATION OF PLAYER-SEASON ROWS vs UNIQUE PLAYERS

---

### 1. Dataset Breakdown
- **Total Player-Season Statistical Rows**: `5,693`
- **Rated Player-Season Rows ($\ge 90$ mins)**: `3,883`
- **Unrated Player-Season Rows ($< 90$ mins)**: `1,810`
- **Total Unique Players**: `3,669`
- **Unique Players Across Rated Rows**: `2,532`

---

### 2. Multi-Season Breakdown for Rated Players

| Seasons Rated Per Player | Number of Players | Total Rated Season Rows |
| :--- | :--- | :--- |
| **1 Season Rated** | 1,665 players | 1,665 rows |
| **2 Seasons Rated** | 547 players | 1,094 rows |
| **3 Seasons Rated** | 156 players | 468 rows |
| **4 Seasons Rated** | 164 players | 656 rows |
| **Total Rated** | **2,532 unique players** | **3,883 rated rows** |

---

### 3. Identifier Distinction
- **`playerId`**: Uniquely identifies a real-world footballer (e.g., `fpl-p-80201`).
- **`statId`**: Uniquely identifies a single seasonal statistical performance log for that player (e.g., `fpl-stat-fpl-p-80201-2021-2022`).

---

### 4. Audit Conclusion
- Status: **VERIFIED & RECONCILED**.
- All exports explicitly display both `playerId` and `statId` / `seasonKey` to prevent confusing player-seasons with separate real-world footballers.
