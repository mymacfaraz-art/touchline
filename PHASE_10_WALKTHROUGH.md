# Touchline Phase 10 Walkthrough

## Milestone Overview
**Phase 10 — Advanced Football AI + Immersion + Production** delivers an intelligent, explainable AI and narrative ecosystem on top of Touchline's deterministic simulation engine (Phases 1–9).

---

## 1. Core Architecture & System Map

```
                    TOUCHLINE
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   FOOTBALL WORLD   CAREER STATE   PLAYER STATE
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                MANAGER / CLUB AI
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        TACTICAL AI       RECRUITMENT AI
              │                 │
              └────────┬────────┘
                       ▼
                MATCH ORCHESTRATION
                       │
                       ▼
              DETERMINISTIC ENGINE
                       │
                       ▼
                  MATCH RESULT
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
         STATISTICS  CONDITION  EVENTS
             │         │         │
             └─────────┼─────────┘
                       ▼
                CAREER PROGRESSION
                       │
                       ▼
              DEVELOPMENT / CONTRACTS
                       │
                       ▼
                  NEXT MATCH
                       │
                       ▼
                 NARRATIVE LAYER
                       │
                       ▼
               NEWS / MEDIA / STORY
```

---

## 2. Key Components Implemented

### 1. Advanced Manager AI (`src/ai/manager/manager-ai.service.ts`)
- Implements `IManagerDecisionProvider`.
- Evaluates match dynamics at discrete checkpoints (halftime, late-game trailing/leading, red cards).
- Adapts tactical inputs (`mentality`, `defensiveLine`, `pressingIntensity`, `tempo`) cleanly.
- Explanations & Rationale: Generates structured decision traces persisted to `ManagerDecisionTrace` table (`minute`, `trigger`, `gameState`, `selectedAction`, `confidence`, `rationale`).
- Emits `ManagerDecisionMade` event on `DomainEventBus`.

### 2. AI Substitution System (`src/ai/manager/substitution-ai.ts`)
- Heuristic evaluation of player fatigue, injury state, yellow cards, match rating, and position compatibility.
- Validated against squad eligibility rules without violating substitution limits.

### 3. Opposition Analysis Service (`src/ai/scouting/opposition-analysis.service.ts`)
- Evaluates recent completed fixtures for opponent teams.
- Returns `INSUFFICIENT_DATA` if fewer than 3 matches exist, maintaining analytical integrity rather than fabricating numbers.

### 4. Recruitment AI & Scouting (`src/ai/recruitment/recruitment-ai.service.ts` & `src/ai/scouting/scouting.service.ts`)
- `IRecruitmentDecisionProvider`: Deterministic scoring based on transfer budget, player OVR, potential, asking fee, and positional need.
- `ScoutingService`: Evaluates player attributes with explicit confidence levels (`KNOWN`, `ESTIMATED`, `UNKNOWN`) and persists `ScoutingReport` records.

### 5. Board Objectives Service (`src/services/board/board-objectives.service.ts`)
- Initializes seasonal targets (`LEAGUE_POSITION`, `FINANCIAL_HEALTH`) based on club ambition.
- Tracks statuses (`NOT_STARTED`, `IN_PROGRESS`, `ACHIEVED`, `FAILED`, `CANCELLED`).
- Emits `BoardObjectiveUpdated` on `DomainEventBus`.

### 6. Dressing Room & Morale (`src/services/morale/dressing-room.service.ts`)
- Computes squad harmony metrics and updates `ClubSeasonState.squadMorale`.
- Tracks relationships (`PlayerRelationship` table: Manager, Teammate, Club).

### 7. Grounded LLM Narrative Layer (`src/narrative/narrative.service.ts`)
- Implements `INarrativeProvider`.
- Accepts `NarrativeContext` (authoritative facts only).
- Provides template fallback (`DETERMINISTIC_TEMPLATE_FALLBACK`) when LLM provider is offline.
- **Strict Immutability Rule**: Generates text only; cannot write to database tables (`Match`, `Standings`, `PlayerAttributes`, `Contract`).

### 8. News & Press Conferences (`src/services/news/news.service.ts` & `src/services/press/press-conference.service.ts`)
- Listens to domain events and records structured `NewsItem` entries.
- Context-driven press conferences: manager choices alter `boardConfidence` and `squadMorale` via explicit game rules.

### 9. Domain Event Bus (`src/events/event-bus.ts`)
- In-process typed event publisher/subscriber model.
- Automatically records event execution in `DomainEventLog`.

---

## 3. Verification & Test Execution

- **Prisma Validation**: `npx prisma validate` $\to$ **PASS**
- **Database Push**: `npx prisma db push` $\to$ **PASS** (Added `ManagerDecisionTrace`, `BoardObjective`, `ScoutingReport`, `NewsItem`, `DomainEventLog`, `PlayerRelationship`)
- **TypeScript Compilation**: `npx tsc --noEmit` $\to$ **PASS** (0 errors)
- **Vitest Suite**: `npm test` $\to$ **PASS** (**14 test files, 113/113 tests passed**)
- **Next.js Production Build**: `npm run build` $\to$ **PASS**
