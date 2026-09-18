# Touchline Final Architecture Specification (Phases 1–10)

## System Overview

Touchline is a comprehensive, production-grade football management simulation platform built on a deterministic TypeScript simulation engine, real-world data foundation, scikit-learn machine-learning rating models, and explainable AI systems.

```
                                    TOUCHLINE ARCHITECTURE
                                    
        ┌─────────────────────────────────────────────────────────────────────────────┐
        │                          USER INTERFACE & API LAYER                         │
        │              Next.js 15 App Router · REST API Endpoints · Dashboard          │
        └──────────────────────────────────────┬──────────────────────────────────────┘
                                               │
        ┌──────────────────────────────────────┴──────────────────────────────────────┐
        │                       BUSINESS & MANAGEMENT SERVICES                        │
        │  CareerService · SeasonProgressionService · TransferService · Development   │
        │  BoardObjectivesService · DressingRoomService · PressConferenceService      │
        └───────┬──────────────────────────────┬──────────────────────────────┬───────┘
                │                              │                              │
                ▼                              ▼                              ▼
  ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
  │      AI & SCOUTING        │  │   DETERMINISTIC ENGINE    │  │    NARRATIVE & EVENTS     │
  │ ManagerAIService          │  │ MatchdayOrchestrator      │  │ DomainEventBus            │
  │ SubstitutionAIService     │  │ MatchService              │  │ NarrativeService          │
  │ OppositionAnalysisService │  │ SimulationEngine (36-attr)│  │ NewsService               │
  │ RecruitmentAIService      │  │ SeededRNG (Reproducible)  │  │ DomainEventLog            │
  │ ScoutingService           │  │ StatAccumulators          │  │ Template Fallbacks        │
  └─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────────┬─────────────┘
                │                              │                              │
                └──────────────────────────────┼──────────────────────────────┘
                                               ▼
        ┌─────────────────────────────────────────────────────────────────────────────┐
        │                         AUTHORITATIVE DATA LAYER                            │
        │             PostgreSQL Database · Prisma ORM · 28 Relational Models          │
        │             Multi-Save Career Sandboxing · Immutable Match Snapshots        │
        └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Complete Phase Lineage (Phases 1–10)

1. **Phase 1: Project Foundation**: Setup Next.js, TypeScript, Vitest, Prisma, Tailwind CSS design system.
2. **Phase 2: Data Model & World Architecture**: Multi-save career isolation, 28 Prisma models, flat attribute taxonomy (36 columns), contract history.
3. **Phase 3: Deterministic Simulation Engine**: Seeded RNG match simulation, tactical document processing, xG modeling, event extraction.
4. **Phase 4: Matchday Orchestration**: Pre-match validation, eligibility checks, squad validation, tactics resolution.
5. **Phase 5: Real Football Data Foundation**: Ingestion pipeline, FBref & open-data sources, data lineage mapping.
6. **Phase 6: AI/ML Player Attributes & OVR Calibration**: Scikit-Learn regression models, position-weighted attribute prediction, 1–91 calibrated OVR scale.
7. **Phase 7: Career & Season Progression**: Career lifecycle, matchweek advancement, standings tiebreaker hierarchy, season rollover, promotion/relegation.
8. **Phase 8: Transfers, Contracts & Squad Building**: Transactional transfers, wage/transfer budget enforcement, loans, free agents, squad availability.
9. **Phase 9: Training, Player Development & Club Systems**: Attribute clamping [1, 99], Touchline OVR bounds [1, 91], non-linear age curves, attribute snapshots.
10. **Phase 10: Advanced Football AI, Immersion & Production**: Adaptive manager AI, substitution heuristics, opposition analysis, recruitment AI, scouting confidence tiers, board objectives, dressing room morale, fact-grounded narrative layer, domain event bus.

---

## 2. Key Architectural Guarantees

1. **Absolute Match Simulation Authority**:
   - The TypeScript simulation engine is the sole source of truth for scores, goals, cards, xG, and standings.
   - LLMs, AI narratives, and press interfaces CANNOT mutate match outcomes or core player attributes.

2. **Multi-Save Career Isolation**:
   - All progression state is scoped to `Career` $\to$ `GameSeason`.
   - Independent playthroughs never leak data or interfere with database baseline templates.

3. **Explainable AI & Auditability**:
   - Every AI manager tactical adaptation persists a `ManagerDecisionTrace` documenting trigger, options, selected action, confidence, and concise rationale.

4. **Clamped Numerical Boundaries**:
   - Individual attributes strictly clamped to $[1, 99]$.
   - Touchline Overall Rating (OVR) strictly clamped to $[1, 91]$.

5. **Fact-Grounded Narrative Safety**:
   - The narrative layer accepts structured facts (`NarrativeContext`) and operates strictly in output mode.
   - Automatic fallback (`DETERMINISTIC_TEMPLATE_FALLBACK`) ensures Touchline runs seamlessly offline or when LLM services are unattached.
