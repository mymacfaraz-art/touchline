# Touchline Architecture & System Map (Phases 1–9)

## High-Level Architecture Overview

```
                      ┌──────────────────────────────────────────────────────────┐
                      │              Touchline Football Management               │
                      │               Integrated Platform (Phases 1-9)           │
                      └────────────────────────────┬─────────────────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼────────────────────────────────────────┐
         │                                         │                                        │
         ▼                                         ▼                                        ▼
┌──────────────────┐                     ┌──────────────────┐                     ┌──────────────────┐
│   Phases 1–6     │                     │     Phase 7      │                     │   Phases 8 & 9   │
│ Foundation & ML  │                     │ Career & Season  │                     │Transfers & Devel.│
└────────┬─────────┘                     └────────┬─────────┘                     └────────┬─────────┘
         │                                        │                                        │
         ├─ Deterministic Simulation Engine       ├─ Career State & Multi-Save Isolation   ├─ Atomic Transfer Engine
         ├─ Real FBref/Open-Data Foundation       ├─ Matchweek Orchestration & Calendar    ├─ Strict Budget Verification
         ├─ Scikit-Learn ML Rating Pipelines      ├─ Dynamic Standings & Tiebreakers       ├─ Historical Contract Lifecycle
         ├─ Calibrated OVR Taxonomy (1-91)        ├─ Knockout Brackets & Aggregate Ties    ├─ Age Curves & Training Engine
         └─ 130 Real Clubs / 13,697 Players       └─ Seasonal Rollover & Promotion/Releg.  └─ Clamped Attribute Bounds [1,99]
```

---

## 1. Domain Model Architecture & Boundaries

### Phase 7: Career & Season Progression
- **Isolation Boundary**: Every `Career` instance is fully sandboxed. Player movements, match results, standings, and table trajectories in one career never bleed into other careers or baseline templates.
- **Season Hierarchy**:
  - `Career` 1 ── * `GameSeason` (e.g. `2024/25`, `2025/26`)
  - `GameSeason` 1 ── * `CompetitionSeason` (e.g. Premier League, Champions League)
  - `CompetitionSeason` 1 ── * `CompetitionPhase` (League Stages, Knockout Brackets)
  - `CompetitionPhase` 1 ── * `Fixture` (Scheduled, In-Progress, Completed)
- **Authoritative Standings Service**:
  - Aggregates strictly from completed fixture results and `SeasonClubParticipation`.
  - Tiebreaker sequence: `Points` DESC → `Goal Difference` DESC → `Goals For` DESC → `Head-to-Head Record` → `Alphabetical`.
  - Handles promotion, relegation, and European qualification slot tags.

### Phase 8: Transfers, Contracts & Squad Management
- **Atomic Market Engine**:
  - Encapsulated within `prisma.$transaction`.
  - Budget checks against `ClubSeasonState.transferBudget` and `wageBudget`.
  - Atomically terminates previous contract, deactivates previous `PlayerClubRegistration`, creates new active registration, and creates new active `Contract`.
- **Loan Mechanics**:
  - `RegistrationType.LOAN` with dedicated `loanEndDate`.
  - Preserves parent club relationship while conferring match eligibility to borrower club.
- **Free Agency**:
  - Identifies players where no active `PlayerClubRegistration` exists.
  - Zero-fee transfers with contract initialization and signing bonuses.

### Phase 9: Player Progression & Club Systems
- **Clamped Attribute Taxonomy**:
  - Individual attributes strictly clamped to `[1, 99]`.
  - Touchline overall rating (OVR) calibrated and strictly clamped to `[1, 91]`.
- **Tri-Phase Age Curves**:
  - Youth Development (`Age < 25`): Positive growth acceleration, proportional to potential head-room.
  - Prime Maintenance (`25 <= Age <= 30`): Stable ratings, minor tactical refinement.
  - Veteran Decline (`Age > 30`): Gradual physical attribute decay (-0.4 to -1.5/year), preservation of mental attributes (composure, vision).
- **Audit & Snapshots**:
  - Every attribute mutation generates an immutable `PlayerAttributeSnapshot` entry documenting `previousValue`, `newValue`, `delta`, and `changeReason` (`TRAINING`, `AGE_PROGRESSION`, `INJURY_DEGRADE`).

---

## 2. API & Data Flow Contracts

### `/api/career`
- `GET ?careerId=...`: Loads sandboxed career state with all season relations.
- `GET ?competitionSeasonId=...`: Retrieves live, sorted league table standings.
- `POST { action: 'create', userId, name, managerName, selectedClubId, startYear }`: Creates a new isolated career.
- `POST { action: 'advance_matchday', competitionSeasonId, matchWeek }`: Deterministically simulates the round.
- `POST { action: 'rollover_season', careerId, currentGameSeasonId }`: Finalizes season, marks champions, executes promotions/relegations, and instantiates the new campaign.

### `/api/transfers`
- `GET ?clubId=...&gameSeasonId=...`: Returns active registered squad with health, fatigue, and contract expiry details.
- `POST { action: 'execute_transfer', ... }`: Executes permanent or loan transfer.
- `POST { action: 'sign_free_agent', ... }`: Signs unattached player.
- `POST { action: 'renew_contract', ... }`: Extends active player contract.

### `/api/development`
- `POST { action: 'run_team_training', clubId, gameSeasonId, intensity, focus }`: Squad training session with condition fatigue/sharpness adjustments.
- `POST { action: 'process_player_development', playerId, gameSeasonId, minutesPlayed, matchRatingAvg, ... }`: Executes deterministic progression cycle.
