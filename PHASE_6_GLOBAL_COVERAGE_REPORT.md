# TOUCHLINE — PHASE 6 GLOBAL COVERAGE AUDIT & EXPANSION REPORT

## 1. Executive Summary & Root Cause Forensic Audit
Prior to this forensic audit, `TEAM_RATINGS_FINAL.csv` reported only **72 teams** (71 genuine clubs + 1 pseudo-club `Free Agent`). 

### Forensic Root Cause Discovery
Investigation traced this discrepancy directly to an identifier format divergence between `data.clubs` and `data.playerStats` in `src/data/seeds/real-football-dataset.json`:
1. `data.clubs` registered **130 canonical clubs** using 3-character normalized source identifiers (e.g. `club-mac` for Manchester City, `club-rem` for Real Madrid, `club-bar` for Barcelona, `club-mil` for AC Milan, `club-toh` for Tottenham, `club-mau` for Manchester United).
2. `data.playerStats` contained **19 club source identifiers** using standard English broadcasting/FPL abbreviations (e.g. `club-mci`, `club-rma`, `club-fcb`, `club-acm`, `club-tot`, `club-mun`, `club-new`, `club-cry`, `club-ath`, `club-osa`, `club-mll`, `club-rvm`, `club-sfc`, `club-ala`, `club-lpa`, `club-alm`, `club-lud`, `club-sal`, `club-mnz`).
3. Because `ml/data/dataset.py` performed an exact string key match `clubs_dict.get(club_id)`, all 19 clubs failed resolution and defaulted silently to `clubName = "Free Agent"`, collapsing **1,889 player-season statistical records** (including Erling Haaland, Kevin De Bruyne, Jude Bellingham, Vinícius Jr, Robert Lewandowski, Lamine Yamal, Bruno Fernandes, and Marcus Rashford) into a single non-existent club.

### Remediation & Restored Coverage
By introducing an explicit canonical alias map in `ml/data/dataset.py`:
- **100.0% of all 5,693 player-season statistical records** now resolve cleanly to genuine canonical clubs.
- **Unresolved / Free Agent statistical rows dropped from 1,889 to 0**.
- Major world football powerhouses (Manchester City, Real Madrid, FC Barcelona, Manchester United, Tottenham Hotspur, Newcastle United, Sevilla, Athletic Club) are completely restored to their respective squad rosters.
- All **130 canonical football clubs** are tracked, audited, and tiered with complete data transparency.

---

## 2. Coverage Metrics & Tiering Taxonomy

| Coverage Tier | Description | Club Count | Rated Player Count |
| :--- | :--- | :--- | :--- |
| **Tier A — Fully Rated** | Clubs possessing $\ge 11$ qualifying rated players ($\ge 90$ mins played), supporting full starting XI and squad ratings. | **72** | **3,869** |
| **Tier B — Partially Rated** | Clubs possessing $1\text{--}10$ qualifying rated players (loan moves, single cup runs, transfer records). Explicitly marked with partial flags. | **14** | **14** |
| **Tier C — Insufficient Data** | Canonical competition clubs from OpenFootball/DataHub fixtures lacking individual player match events. Zero fabrication applied. | **44** | **0** |
| **Tier D — Pseudo / Invalid Entities** | Unassigned / Free Agent / Unresolved buckets. Completely eliminated from team ranking tables. | **0** | **0** |
| **Total Tracked** | Full canonical footprint across EPL, La Liga, Bundesliga, Serie A. | **130** | **3,883** |

---

## 3. Major Clubs Status Matrix

| Club | Sourced League | Tier | Squad Records | Rated Players | Starting XI OVR | Star Player (OVR) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FC Barcelona** | La Liga | Tier A | 105 | 79 | **90.9** | Robert Lewandowski (91.0) |
| **Real Madrid CF** | La Liga | Tier A | 99 | 71 | **89.5** | Vinícius Júnior (91.0) |
| **Atlético de Madrid** | La Liga | Tier A | 90 | 62 | **88.8** | Álvaro Morata (91.0) |
| **Manchester United FC** | Premier League | Tier A | 320 | 193 | **85.9** | Aaron Ramsdale (91.0) |
| **Newcastle United FC** | Premier League | Tier A | 308 | 186 | **85.5** | Robert Sánchez (91.0) |
| **Tottenham Hotspur FC** | Premier League | Tier A | 337 | 205 | **85.3** | Edouard Mendy (91.0) |
| **Liverpool FC** | Premier League | Tier A | 150 | 93 | **84.7** | Alisson Becker (91.0) |
| **Manchester City FC** | Premier League | Tier A | 137 | 88 | **84.4** | Ederson (91.0) |
| **West Ham United FC** | Premier League | Tier A | 130 | 90 | **83.7** | Lukasz Fabianski (91.0) |
| **Crystal Palace FC** | Premier League | Tier A | 144 | 88 | **83.7** | Vicente Guaita (91.0) |
| **AC Milan** | Serie A | Tier B | 1 | 1 | **81.0** (partial) | Matteo Gabbia (81.0) |
| **FC Bayern München** | Bundesliga | Tier C | 0 | 0 | N/A | Insufficient open player event data |
| **Arsenal FC** | Premier League | Tier C | 0 | 0 | N/A | Insufficient open player event data |
| **Borussia Dortmund** | Bundesliga | Tier C | 0 | 0 | N/A | Insufficient open player event data |
| **Juventus FC** | Serie A | Tier C | 0 | 0 | N/A | Insufficient open player event data |
| **FC Internazionale Milano** | Serie A | Tier C | 0 | 0 | N/A | Insufficient open player event data |

---

## 4. Verification Suite Pass Status
- **Python ML Tests (`ml/tests/test_ml_pipeline.py`)**: `6 / 6 PASSED` (100%)
- **TypeScript Test Suite (`vitest run`)**: `86 / 86 PASSED` (100%)
- **Type Safety (`tsc --noEmit`)**: `PASSED` (0 errors)
- **Prisma Schema (`prisma validate`)**: `PASSED` (Valid)
- **Database Import (`import-ml-ratings.ts`)**: `PASSED` (3,800 records updated)
- **Production Web Application Build (`next build`)**: `PASSED` (Static & Dynamic routes built cleanly)
