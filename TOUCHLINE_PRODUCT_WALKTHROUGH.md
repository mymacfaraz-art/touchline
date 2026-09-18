# TOUCHLINE — COMPLETE PRODUCT EXPERIENCE & USER JOURNEY WALKTHROUGH

## OVERVIEW

Touchline is a modern, information-dense, highly responsive football-management game experience built on Next.js 15, React, Tailwind CSS, Prisma, and PostgreSQL.

This document details the complete end-to-end playable manager journey across all 14 integrated UI views.

---

## 1. USER JOURNEY WALKTHROUGH

### Step 1: Career Setup & Real Football Ingestion
- **Manager Creation**: Specify manager name, nationality, and tactical philosophy (*High Press Possession*, *Fast Counter-Attack*, *Direct Wing Play*, or *Defensive Solidity*).
- **Club Selection**: Search real football database (130 clubs across premier European divisions). Filter by competition or country, view club reputation (1–100) and squad size.
- **Career Initialization**: Instantiates an isolated career in PostgreSQL via `CareerService.createCareer`, creating initial `GameSeason` (2024/25) and setting financial headroom (`transferBudget` and `wageBudget`).

### Step 2: Management Control Center (Dashboard)
- **Next Match Preview**: Displays upcoming matchday opponent, home/away designation, kickoff date, and quick action shortcuts (*Set Tactics*, *Kick Off Next Match*).
- **League Standing Widget**: Shows real-time league position (e.g. 3rd/20), Champions League qualification status, and last 5 match form badges (`W`, `D`, `L`).
- **Squad Readiness Widget**: Overview of fit, fatigued, injured, and suspended player counts.
- **Board Approval Meter**: Live board confidence percentage and operational stability rating.

### Step 3: Squad Roster & Player Profile Modal
- **Interactive Squad Table**: Filter by position (`GK`, `DEF`, `MID`, `FWD`), search by player name, inspect position, age, Touchline ML OVR rating, fitness/fatigue bars, morale, and contract wage.
- **Detailed Player Profile Modal**:
  - **Bounded Attribute Cards**: Grouped into *Technical*, *Physical*, *Mental*, and *Goalkeeping* ($1 \le \text{attr} \le 99$).
  - **Match Readiness**: Live condition metrics (Fitness, Fatigue, Sharpness, Morale).
  - **Contract Info**: Weekly wage, contract status.
  - **Development Trend**: Historical OVR progression snapshots.

### Step 4: Lineup & Tactical Pitch Builder
- **Visual Pitch Diagram**: Displays starting 11 player position tokens on a tactical pitch according to selected formation (`4-3-3`, `4-2-3-1`, `3-5-2`, `4-4-2`, `5-3-2`).
- **Tactical Directives**: Configure Mentality (*Attacking*, *Balanced*, *Defensive*), Pressing Intensity, Defensive Line height, and Tempo/Passing style.
- **Squad Validation**: Checks 11 starters, goalkeeper requirement, and availability before saving via `POST /api/tactics`.

### Step 5: Authoritative Live Matchday Center
- **Pre-Match Kickoff**: Team crests, lineups preview, and "Kick Off Match Simulation" trigger.
- **Live Match Simulation**: Executes match via `MatchdayOrchestrator` / `MatchService`.
- **Scoreboard & Event Timeline**: Displays full-time score, halftime score, and minute-by-minute timeline (Goals with scorer/assister, yellow/red cards, injuries, subs).
- **Match Statistics**: Detailed shots, shots on target, xG (Expected Goals), possession percentage, passes completed, and corners.
- **Adaptive AI Decision Trace**: Visualizes in-match AI manager tactical adaptations (e.g., 60' Trailing 0-2 $\to$ Sub Doku IN, High Pressing).

### Step 6: League Standings & Fixture Calendar
- **League Table**: Computes Played, Won, Drawn, Lost, Goals For, Goals Against, Goal Difference, and Points directly from match results. User's club highlighted in emerald.
- **Fixture List**: Browse past match results and upcoming fixtures.

### Step 7: Transfer Market & Contract Negotiations
- **Real Market Search**: Query real database players across positions, filter by estimated transfer value and OVR rating.
- **Transfer Bid Panel**: Submit official transfer bids with transfer fee, weekly wage, and contract duration. Validates transfer budget headroom before atomic database execution.

### Step 8: Scouting & Opposition Intelligence
- **Delineated Confidence Reports**: Displays scouting reports with explicit confidence levels (`KNOWN`, `ESTIMATED`, `UNKNOWN`) and tactical fit percentages.
- **Opposition Tactical Analysis**: Generates AI opposition analysis detailing opponent formation, key threats, and recommended tactical countermeasures.

### Step 9: Team Training & Player Development
- **Workload Selection**: Configure weekly workload intensity (`LIGHT`, `NORMAL`, `HEAVY`) and tactical focus area (`ATTACKING`, `DEFENSIVE`, `PHYSICAL`).
- **Development Dashboard**: Track OVR deltas (+1, -1) and attribute snapshot trends across youth, prime, and veteran players.

### Step 10: News, Inbox, Board & Club Infrastructure
- **News Feed**: Grounded headlines generated from domain events.
- **Manager Inbox**: Actionable messages from board, chief scout, and club office.
- **Board Objectives**: Seasonal target progress indicators.
- **Club Overview & Manager Profile**: Identity, facilities, stadium capacity, win ratios, and reputation.

---

## 2. SYSTEM BOUNDARIES

1. **Authoritative Simulation**: The simulation engine remains 100% authoritative for match outcomes, scores, cards, and injuries.
2. **Authoritative ML Ratings**: Player attributes and OVR ratings are derived strictly from ML pipeline models.
3. **No Production Fake Data**: All production UI views fetch actual state from PostgreSQL database via Next.js API endpoints.
4. **Career Isolation**: All queries filter by `careerId`, guaranteeing zero cross-career data leakage.
