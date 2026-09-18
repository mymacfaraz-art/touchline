# TOUCHLINE — FRONTEND & UI ARCHITECTURE

## OVERVIEW

Touchline's frontend architecture is designed as a single-page management console built on Next.js 15 App Router, React client components, Tailwind CSS, and REST API routes.

---

## 1. UI COMPONENT MAP

```text
src/
├── app/
│   ├── layout.tsx         # Global HTML & CSS Root
│   ├── globals.css        # Tailwind setup & base styles
│   ├── page.tsx           # Main Touchline Management Shell
│   └── api/
│       ├── career/        # Career creation & matchday advancement
│       ├── clubs/         # Real club listing & details
│       ├── players/       # Market search & player profile
│       ├── matches/       # Matchday simulation & fixture results
│       ├── tactics/       # Tactical document get & save
│       ├── transfers/     # Atomic transfer bids & contract renewals
│       ├── scouting/      # Scouting reports & opposition analysis
│       ├── development/   # Team training & player development
│       ├── board/         # Board objectives
│       ├── news/          # Grounded news feed
│       └── inbox/         # Manager notifications
└── components/
    ├── Sidebar.tsx        # Persistent desktop navigation sidebar
    ├── Header.tsx         # Contextual top bar (date, season, budget)
    ├── CareerSetup.tsx    # 3-step career creation modal
    ├── DashboardView.tsx  # Central management dashboard
    ├── SquadView.tsx      # Roster table with position filters
    ├── PlayerProfileModal.tsx # Bounded attributes & condition modal
    ├── TacticsView.tsx    # Visual pitch & lineup builder
    ├── MatchdayView.tsx   # Live match simulation & statistics center
    ├── CompetitionsView.tsx # Premier League standings table
    ├── FixturesView.tsx   # Competition matchday calendar
    ├── TransfersView.tsx  # Transfer market search & negotiation panel
    ├── ScoutingView.tsx   # Scouting confidence reports & opp analysis
    ├── TrainingView.tsx   # Team training workload & focus selection
    ├── DevelopmentView.tsx# Attribute progression dashboard
    ├── NewsView.tsx       # Domain event grounded news feed
    ├── InboxView.tsx      # Manager notifications inbox
    ├── BoardView.tsx      # Board objectives tracker
    ├── ClubView.tsx       # Club infrastructure & reputation
    └── ManagerView.tsx    # Manager profile & career record
```

---

## 2. STATE MANAGEMENT & API BOUNDARIES

- **Client State**: Active tab navigation, modal state, search queries, and form inputs are managed in React state (`useState`).
- **Persistence State**: Authoritative state is persisted in PostgreSQL database via Prisma ORM and retrieved by Next.js API routes (`/api/...`).
- **Authorization & Validation**: Every API route validates input parameters and enforces budget headroom checks before mutating database state.

---

## 3. RESPONSIVE STRATEGY

- **Desktop (1440px+)**: Persistent 64-column sidebar, 3-column dashboard grid, full interactive pitch layout.
- **Tablet / Laptop (768px – 1024px)**: 2-column flex grids, auto-scrolling data tables.
- **Mobile (375px – 768px)**: Collapsible navigation controls, stacked card layouts for squad and transfer market tables.
