# TOUCHLINE — PHASE 6 SNAPSHOT METADATA AUDIT

## DATABASE PERSISTENCE & AUDIT TRAIL VERIFICATION

---

### 1. Database Model Integration
ML-derived ratings are persisted directly into PostgreSQL database `touchline` using Prisma ORM via `scripts/import-ml-ratings.ts`:
1. **`PlayerAttributes`**: Stores the flat 36-column canonical player attributes vector.
2. **`PlayerAttributeSnapshot`**: Preserves an immutable historical audit snapshot for each player update without overwriting historical records.

---

### 2. Snapshot Metadata Fields

| Field | Stored Value / Format | Purpose |
| :--- | :--- | :--- |
| `playerId` | CUID FK $\rightarrow$ `Player.id` | Player identity link |
| `gameSeasonId` | CUID FK $\rightarrow$ `GameSeason.id` | Season scoping (2024/25) |
| `attributeKey` | e.g. `technical.finishing` | Specific attribute path |
| `previousValue` | Integer (1–99) | Baseline value before ML update |
| `newValue` | Integer (1–99) | ML-calibrated rating |
| `delta` | `newValue - previousValue` | Magnitude and direction of change |
| `changeReason` | `MATCH_PERFORMANCE` | Category enum |
| `occurredAt` | ISO DateTime Timestamp | Exact generation timestamp |

---

### 3. Database Audit Results
- **`PlayerAttributes` Updated**: `3,800` records.
- **`PlayerAttributeSnapshot` Created**: `3,800` records.
- **Historical Snapshot Preservation**: **PASSED**. Existing historical snapshots were preserved.
- **Prisma Schema Validation**: **PASSED** (`npx prisma validate`).
