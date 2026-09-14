# Touchline Architecture Blueprint

## Overview

Touchline is designed as a **deep, long-term Football Manager Simulation platform**. It is **not** a playable match arcade game; matches are calculated by a sophisticated simulation engine based on player attributes, squad form, tactical setups, and controlled randomness.

To ensure long-term maintainability without requiring future rewrites, Touchline is structured as a clean **Modular Monolith**.

---

## 1. Modular Monolith Architecture

The application is structured into decoupled domain modules inside Next.js App Router:

```
src/
├── domain/       # Pure TypeScript entities, types, and interfaces (zero framework dependencies)
├── simulation/   # Deterministic & stochastic football simulation engine + RNG
├── narrative/    # AI storytelling & commentary contracts (strictly non-authoritative)
├── services/     # Application services orchestrating database and simulation pipelines
├── lib/          # Database connection (Prisma), Auth placeholders, and utility helpers
├── app/          # Next.js App Router pages and API routes (HTTP & Presentation Layer)
└── components/   # React components & UI design system
```

### Key Rule
Business and simulation logic MUST NOT leak into React components or API handlers. React components interact exclusively with Application Services via clean async signatures.

---

## 2. Strict Dependency Direction

The preferred architectural dependency flow is strictly unidirectional:

$$\text{UI Layer} \longrightarrow \text{Application Services} \longrightarrow \text{Simulation Interface } (IMatchEngine) \longrightarrow \text{Engine Adapters}$$

### Disallowed Patterns:
- ❌ **UI Components calling simulation engine internals directly.**
- ❌ **Simulation Engine importing React, Next.js, or UI rendering logic.**
- ❌ **Simulation Engine performing direct database queries.**

---

## 3. Simulation Boundary (`IMatchEngine`)

The simulation engine is completely isolated behind the `IMatchEngine` interface:

```typescript
export interface IMatchEngine {
  readonly engineId: string;
  readonly version: string;
  simulateMatch(input: MatchSimulationInput): Promise<MatchSimulationResult> | MatchSimulationResult;
}
```

### Domain Inputs & Outputs
- **Input (`MatchSimulationInput`)**: Contains full squad states (Starting XI, bench, attributes, fitness, morale, form, sharpness, fatigue, injuries, suspensions), tactical setups (formation, mentality, pressing, line height, passing style), home/away status, and seed.
- **Output (`MatchSimulationResult`)**: Authoritative match outcome containing final score, timeline events, team statistics, and player performance ratings.

---

## 4. Seeded Randomness & Reproducibility

Randomness in Touchline is controlled using the `SeededRNG` class (based on the Mulberry32 algorithm).

### Core Principle
$$\text{Input Data} + \text{Deterministic Seed} \Longrightarrow \text{100\% Identical Simulation Output}$$

This guarantees:
1. **Explainable Bug Diagnostics**: Any match anomaly can be reproduced instantly by re-running the engine with the match seed.
2. **ML Ground Truth Evaluation**: Future ML model outputs can be benchmarked directly against deterministic baseline runs.

---

## 5. Python ML Extension Point

The architecture explicitly supports replacing or augmenting the TypeScript match engine with an external Python ML engine in future phases:

```
IMatchEngine (Interface)
├── TypeScriptMatchEngine (Default pure TS implementation)
└── PythonMLMatchEngine (Placeholder adapter for future Python service)
```

The application services and UI layer are entirely agnostic of whether `TypeScriptMatchEngine` or `PythonMLMatchEngine` is active.

---

## 6. AI Narrative Boundary

Touchline incorporates LLMs for dynamic news, match reports, board objectives, and press conferences.

### Critical Rule
The AI Narrative engine is **strictly non-authoritative**. It receives structured facts *after* the match calculation completes and converts them into natural language text.

$$\text{Simulation Engine} \xrightarrow{\text{MatchResult}} \text{Narrative AI} \xrightarrow{\text{Text Story / Report}}$$

- ✅ **Correct**: Match Engine produces 2-1 win $\rightarrow$ AI generates match report text.
- ❌ **Incorrect**: AI LLM predicts match result directly.

---

## 7. Minimal Database Philosophy

The foundational database schema (PostgreSQL + Prisma ORM) models only core entities:
- `User` & `Manager`
- `Club`
- `Player` & `PlayerAttributes`
- `Contract`
- `Competition` & `Season`
- `Fixture`, `Match`, & `MatchEvent`

Additional features (youth academy, scouting networks, granular finances) will be introduced cleanly in subsequent development phases via additive Prisma migrations.
