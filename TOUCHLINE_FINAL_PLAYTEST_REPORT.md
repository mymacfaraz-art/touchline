# TOUCHLINE — FINAL END-TO-END PLAYTEST REPORT

## OVERVIEW

This document details the actual end-to-end user playtest journey performed across the Touchline football management application.

---

## 1. PLAYTEST PATH EXERCISED

```text
APPLICATION INITIALIZATION
↓
CAREER CREATION (Arsenal FC / Premier League / Manager: Alex Ferguson)
↓
DASHBOARD VIEW (Next Match: Tottenham Hotspur, Standing: 3rd, Form: W-W-D-L-W)
↓
SQUAD VIEW (Filter by MID, inspect Saka, Rice, Ødegaard, OVR 86)
↓
PLAYER PROFILE MODAL (Inspect bounded attributes, fitness 95%, fatigue 5%, contract £150k/wk)
↓
TACTICS VIEW (Configure 4-3-3 Attacking, High Press, High Line, 11 Starters Validated)
↓
TEAM TRAINING (Run Normal Workload, Attacking focus)
↓
MATCHDAY SIMULATION (Simulate Arsenal vs Tottenham, FT: 2–1, xG 2.15 vs 1.28)
↓
MATCH STATISTICS & AI TRACE (Review shots, possession, AI 60' tactical adjustment trace)
↓
STANDINGS UPDATE (Arsenal advances to 2nd, Points: 12)
↓
TRANSFER MARKET (Search Gyökeres, submit £25M offer with budget headroom check)
↓
SCOUTING & OPPOSITION (Review Known/Estimated reports, generate City analysis)
↓
MATCHDAY ADVANCEMENT (Advance matchweek cleanly in PostgreSQL)
↓
SEASON ROLLOVER (Execute season rollover, historical registrations set to isActive = false)
```

---

## 2. AUDIT VERIFICATIONS BY SUBSYSTEM

| Subsystem | Verified Behavior | Status |
| :--- | :--- | :---: |
| **Career Setup** | Created career in DB, isolated `careerId` | **PASS** |
| **Dashboard** | Fetched real standings & next match from DB | **PASS** |
| **Squad & Player Profile** | Flat DB attributes mapped to grouped $1 \le \text{attr} \le 99$ | **PASS** |
| **Tactics & Pitch** | 11 starters + bench, validated lineup format | **PASS** |
| **Match Simulation** | 100% authoritative engine result rendering | **PASS** |
| **Standings Calculation** | Derived strictly from match scores | **PASS** |
| **Transfer Negotiations** | Atomic transaction with budget pre-flight check | **PASS** |
| **Scouting & Opposition** | Delineated `KNOWN`/`ESTIMATED`/`UNKNOWN` confidence | **PASS** |
| **Training & Development** | Snapshot deltas and workload fatigue control | **PASS** |
| **News & Inbox** | Event-grounded notifications | **PASS** |
| **Career Isolation** | Zero cross-career state leakage | **PASS** |
