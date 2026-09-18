# TOUCHLINE — PHASE 6 PLAYER COUNT RECONCILIATION

## AUDIT OF PLAYER COUNT DISCREPANCY (3,584 vs 3,669)

---

### 1. Discrepancy Statement
- **Phase 5 Reported Canonical Players**: `3,584`
- **Phase 6 Dataset Loader Unique Player IDs**: `3,669`
- **Net Discrepancy**: `+85` unique player IDs

---

### 2. Forensic Code Trace & Root Cause Analysis
1. In `src/data/seeds/real-football-dataset.json`, the `players` array contains **3,584** explicit canonical player identity objects.
2. The `playerStats` array in the same file contains **5,693** player-season statistical entries referencing **3,669** unique `playerSourceId` keys.
3. **The 85 Extra Player IDs**: Exactly 85 player IDs appear in seasonal match logs in `playerStats` (originating from historical La Liga / FPL CSV logs) whose primary demographic record was missing from the `players` array.
4. When `ml/data/dataset.py` parses `playerStats`, it looks up each player ID in `players_dict`. If missing, it constructs a fallback player representation (`firstName: 'Unknown'`, `lastName: 'Player'`) to ensure statistical records are preserved rather than silently dropped.

---

### 3. Category Breakdown

| Category | Player Count | Description |
| :--- | :--- | :--- |
| **Explicit Canonical Players** | `3,584` | Full demographic records in `players` array |
| **Stats-Only Fallback Players** | `85` | Player IDs referenced in `playerStats` without explicit `players` entry |
| **Total Unique Player IDs** | **`3,669`** | Total unique player IDs present in dataset |

---

### 4. Audit Conclusion
- Status: **LEGITIMATE & RECONCILED**.
- Action: Documented in all reports. No data was fabricated or corrupted.
