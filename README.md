# Touchline — Football Manager Simulation Engine

Welcome to **Touchline**! Touchline is a deep, long-term football management simulation web application. 

Instead of controlling players with a gamepad, you act as the club manager. Match outcomes are calculated by a sophisticated simulation engine based on player attributes, squad form, tactical decisions, fitness, and controlled randomness.

---

## 1. Required Software

Before starting, make sure your computer has the following tools installed:

1. **Node.js** (v18.0.0 or newer) — Download from [nodejs.org](https://nodejs.org/).
2. **Git** — Download from [git-scm.com](https://git-scm.com/).
3. **PostgreSQL** — Download from [postgresql.org](https://www.postgresql.org/) or run via Docker.

---

## 2. Step-by-Step Beginner Setup Guide

### Step 1: Install Dependencies
Open your terminal inside the project folder and run:

```bash
npm install
```
This installs Next.js, React, TypeScript, Tailwind CSS, Prisma, Vitest, and all required packages.

---

### Step 2: Configure Environment Variables
Copy the template `.env.example` file to create your personal local `.env` file:

```bash
cp .env.example .env
```

Open `.env` in any text editor and update your PostgreSQL database URL if necessary:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/touchline?schema=public"
```

---

### Step 3: Start PostgreSQL & Setup Database

Make sure your local PostgreSQL database service is running:

- **macOS (Homebrew)**: `brew services start postgresql`
- **Linux**: `sudo systemctl start postgresql`
- **Docker**: `docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

Once PostgreSQL is running, sync the Prisma database schema:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

---

### Step 4: Run the Development Server

Start the local development server by running:

```bash
npm run dev
```

Open your browser and navigate to:
[http://localhost:3000](http://localhost:3000)

You will see the Touchline foundation dashboard, complete with live simulation pipeline smoke test results!

---

## 3. Testing and Code Verification Commands

### Run Unit Tests
Run unit tests (including SeededRNG reproducibility tests) with Vitest:

```bash
npm run test
```

### Run TypeScript Checks
Verify strict TypeScript compilation across the entire project:

```bash
npx tsc --noEmit
```

### Build for Production
Build the production bundle to verify that everything compiles cleanly:

```bash
npm run build
```

---

## 4. Basic Git Workflow Commands

```bash
# Check modified files and repository status
git status

# View recent commit history
git log --oneline -n 5

# Stage modified files for a new commit
git add .

# Create a new commit
git commit -m "your commit message"
```

---

## 5. Project Folder Structure

```
Touchline/
├── src/
│   ├── domain/        # Player, Club, Tactics, Match domain types
│   ├── simulation/    # SeededRNG & IMatchEngine simulation engine
│   ├── narrative/     # AI Narrative & commentary contracts
│   ├── services/      # Application services (MatchService)
│   ├── lib/           # Prisma client singleton & Auth placeholders
│   └── app/           # Next.js App Router pages & styles
├── prisma/            # Database schema (schema.prisma)
├── tests/             # Unit tests (rng.test.ts)
├── ARCHITECTURE.md    # Detailed technical architecture manifesto
└── README.md          # Beginner-friendly setup guide
```
