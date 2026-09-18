# TOUCHLINE — PHASE 6 EXPORT COMPLETENESS AUDIT

## PROGRAMMATIC AUDIT OF RATING EXPORT FILES

---

### 1. File Inventory & Column Completeness

| File Path | Total Rows / Records | Mandatory Columns / Keys Present | Status |
| :--- | :--- | :--- | :--- |
| `PLAYER_RATINGS_FINAL.csv` | `5,694` lines (5,693 data rows + header) | `statId`, `playerId`, `playerName`, `primaryPosition`, `positionGroup`, `clubName`, `seasonKey`, `status`, `ovr`, `confidence`, `minutesPlayed`, `appearances`, + 31 attribute columns | **PASSED** |
| `PLAYER_RATINGS_FINAL.json` | `5,693` JSON objects | Full metadata, `ovr`, `confidence`, `attributes`, `modelVersion`, `datasetVersion` | **PASSED** |
| `PLAYER_RATINGS_FINAL.md` | `500` top rated + `100` unrated rows | Rank, Player, Pos, Club, Season, OVR, Confidence, Key Attributes | **PASSED** |
| `TEAM_RATINGS_FINAL.csv` | `131` lines (130 clubs + header) | `clubName`, `squadSize`, `ratedCount`, `squadAverageOvr`, `startingXiAverageOvr`, `highestPlayer`, `highestOvr`, `squadConfidence`, `status` | **PASSED** |
| `TEAM_RATINGS_FINAL.md` | `130` clubs | Rank, Club, Squad Size, Rated Count, Starting XI OVR, Squad Avg OVR, Star Player, Confidence | **PASSED** |
| `TOUCHLINE_RATINGS_COMPLETE.md` | `4` Competitions, `130` Clubs | Grouped by competition and club with full player attributes | **PASSED** |

---

### 2. Consistency Cross-Validation
- Number of rated player-seasons in JSON = `3,883`.
- Number of rated player-seasons in CSV = `3,883`.
- Number of unrated player-seasons in JSON = `1,810`.
- Number of unrated player-seasons in CSV = `1,810`.
- Sum of squad sizes in `TEAM_RATINGS_FINAL.csv` = `5,693` (matches total dataset rows).
- Cross-file consistency: **100% MATCH**.
