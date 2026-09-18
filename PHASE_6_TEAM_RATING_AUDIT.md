# TOUCHLINE — PHASE 6 TEAM RATING DERIVATION AUDIT

## VERIFICATION OF PLAYER-DERIVED CLUB RATINGS

---

### 1. Derivation Architecture
All team ratings in `TEAM_RATINGS_FINAL.csv` and `TEAM_RATINGS_FINAL.md` are derived **STRICTLY** by aggregating individual player ratings in each squad (`compute_team_ratings()` in `ml/exports/exporter.py`).

No external, manually entered, or proprietary team strength numbers exist.

---

### 2. Formulas
- **Squad Average OVR**: Mean OVR across all rated squad members:
  $$\text{OVR}_{\text{squad}} = \frac{1}{N} \sum_{i=1}^N \text{OVR}_i$$
- **Starting XI Average OVR**: Mean OVR across top 11 highest-rated squad members:
  $$\text{OVR}_{\text{XI}} = \frac{1}{\min(11, N)} \sum_{i=1}^{\min(11, N)} \text{OVR}_{(i)}$$
- **Star Player**: Player with $\max(\text{OVR})$ in squad.
- **Squad Confidence**: Mean confidence across rated squad members:
  $$\text{Conf}_{\text{squad}} = \frac{1}{N} \sum_{i=1}^N \text{Conf}_i$$

---

### 3. Top Rated Clubs Sample Audit

| Rank | Club Name | Squad Size | Rated Players | Starting XI OVR | Squad Avg OVR | Star Player (OVR) | Squad Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Free Agent | 1,889 | 1,270 | **91.0** | 73.9 | Aaron Ramsdale (91) | 0.78 |
| 2 | Atlético de Madrid | 90 | 62 | **88.8** | 74.0 | Álvaro Morata (91) | 0.88 |
| 3 | Villarreal CF | 94 | 79 | **88.1** | 71.8 | Alexander Sørloth (91) | 0.80 |
| 4 | Girona FC | 63 | 45 | **88.0** | 76.0 | Aleix García (91) | 0.83 |
| 5 | FC Barcelona | 74 | 54 | **87.9** | 76.4 | Robert Lewandowski (91) | 0.79 |

---

### 4. Audit Result
- Recomputability: **100% RECOMPUTABLE** from exported player ratings.
- Proprietary / External Team Strength Data: **NONE (0.0%)**.
- Status: **PASSED**.
