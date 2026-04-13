# BLOCK6 Time Manager — Design Spec

## Overview

A web-based implementation of the "6區塊黃金比例時間分配法" (BLOCK6 Golden Ratio Time Allocation Method) from the book by 鄭智荷 (ISBN: 9786267173206). The app helps users plan their week in 42 blocks (6 per day × 7 days), track daily execution, write emotion diaries, and review weekly progress.

## Goals

- **MVP scope:** Weekly plan editing, daily execution tracking, 3-line emotion diary, weekly review
- **Future scope:** Monthly rhythm analysis, A/B plan mechanism
- **Out of scope (for now):** Onboarding/guided tutorial

## Target Users

- Phase A (now): Personal tool — single user
- Phase B (mid-term): Small group of friends/peers
- Phase C (long-term): Public registration

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript (strict mode) |
| Frontend | Next.js (App Router) |
| Backend/DB | Supabase (PostgreSQL + Auth) |
| Architecture | Clean Architecture |
| Lint | ESLint (flat config) + @typescript-eslint |
| Formatter | Prettier |
| Testing | Vitest + React Testing Library |
| CI/CD | GitHub Actions (lint, type-check, test on push/PR) |
| Package Manager | pnpm |
| Deployment | Vercel |

## Architecture (Clean Architecture)

```
src/
  domain/
    entities/        # Block, WeekPlan, DiaryEntry, WeekReview
    usecases/        # CreateWeekPlan, UpdateBlockStatus, WriteDiary, etc.
    repositories/    # Interface definitions (abstractions)

  infrastructure/
    supabase/        # Supabase implementation of repository interfaces

  presentation/
    components/      # React components
    app/             # Next.js App Router pages
```

**Key principle:** `domain/` has zero imports from Supabase, Next.js, or any external framework. All external dependencies are injected through `repositories/` interfaces. Swapping Supabase only requires a new implementation in `infrastructure/`.

## Database Design (3NF)

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | TEXT | UNIQUE NOT NULL |
| name | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### block_types

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PK |
| name | TEXT | NOT NULL — 'core', 'rest', 'buffer' |

### week_plans

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| week_start | DATE | NOT NULL (Monday of the week) |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(user_id, week_start) |

### blocks

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| week_plan_id | UUID | FK → week_plans.id |
| day_of_week | SMALLINT | NOT NULL, 1(Mon)–7(Sun) |
| slot | SMALLINT | NOT NULL, 1–6 |
| block_type_id | INT | FK → block_types.id |
| title | TEXT | Task name (e.g. "專案開發") |
| description | TEXT | Sub-task details |
| status | TEXT | NOT NULL DEFAULT 'planned' — planned / in_progress / completed / skipped |
| | | UNIQUE(week_plan_id, day_of_week, slot) |

### diary_entries

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| entry_date | DATE | NOT NULL |
| line_1 | TEXT | NOT NULL |
| line_2 | TEXT | NOT NULL |
| line_3 | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(user_id, entry_date) |

### week_reviews

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| week_plan_id | UUID | FK → week_plans.id, UNIQUE |
| reflection | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**3NF notes:**
- `block_types` is a separate lookup table, no string enums
- `blocks` does not store redundant `user_id` (derivable via `week_plan_id`)
- `diary_entries` is per-day, not per-block
- All non-key columns depend only on the primary key

## UI Design

### Approach: Dashboard-based

The 42-block week grid is the central view. Clicking a block opens a side panel for editing. This preserves the method's core philosophy: feeling the constraint of 42 blocks drives prioritization.

### Theme System

- CSS custom properties define all color tokens (`--color-bg-primary`, `--color-accent`, etc.)
- Theme switching via `<html data-theme="dark|light">`
- MVP: dark theme only, but CSS structure supports switching from day one
- Theme preference stored in `localStorage`, later synced to user profile

### Color Coding

| Block Type | Color |
|------------|-------|
| Core (核心) | Green (#4ecca3) |
| Rest (休息) | Yellow (#ffd369) |
| Buffer (緩衝) | Red/Pink (#e94560) |

### Desktop Layout

```
┌─────────────────────────────────────────────────┐
│  Header: Week title + ← → nav + Theme Toggle    │
├───────────────────────────────────┬──────────────┤
│                                  │              │
│   WeekGrid (7 cols × 6 rows)     │  SidePanel   │
│                                  │              │
│   Each cell shows:               │  On click:   │
│   - Color (by block_type)        │  - Task edit │
│   - Title                        │  - Status    │
│   - Status icon                  │  - Subtasks  │
│                                  │  - Diary     │
│                                  │              │
├───────────────────────────────────┴──────────────┤
│  Footer: Weekly completion progress bar          │
└─────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────┐
│ Header: Date + ← →   │
├──────────────────────┤
│  DayView (6 blocks)  │
│  Vertical, tappable  │
├──────────────────────┤
│  Diary entry point   │
├──────────────────────┤
│ BottomNav:           │
│ Overview | Today |   │
│ Review               │
└──────────────────────┘
```

### Responsive Strategy

- **Desktop:** Full 7×6 week grid + side panel
- **Mobile:** Day view (6 blocks vertical), swipe to change day. Simplified week overview available (color-block matrix, no text) for the global picture.

## Component Tree

```
App
├── Header
│   ├── WeekNavigator          -- ← This Week (4/7-4/13) →
│   └── ThemeToggle
├── WeekGrid                   -- Desktop: 7×6 matrix
│   └── BlockCell × 42
├── DayView                    -- Mobile: today's 6 blocks
│   └── BlockCard × 6
├── SidePanel                  -- Desktop: slides from right
│   ├── BlockEditor            -- Edit task name, description
│   ├── StatusToggle           -- planned → in_progress → completed
│   └── DiaryForm              -- 3-line emotion diary
├── WeekOverview               -- Mobile: simplified week grid
└── WeekReviewPage             -- Standalone page
    ├── CompletionStats        -- Pie/bar chart
    ├── BlockTypeBreakdown     -- Core/rest/buffer distribution
    └── ReflectionEditor       -- Reflection text editor
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Main dashboard — 42-block week grid + side panel |
| `/review` | Weekly review page |
| `/login` | Auth page (skip initially, use localStorage) |

## Interaction Flows

### Weekly Plan Editing
1. Enter main view → see empty grid (or copied from last week)
2. Click any cell → SidePanel slides open
3. Select block type (core/rest/buffer) → enter task name → save
4. Cell updates color and title in real time

### Daily Execution Tracking
1. Click a block → SidePanel shows task details
2. Toggle status: planned → in_progress → completed (or skipped)
3. Week grid cell reflects status change (icon/opacity)

### 3-Line Emotion Diary
1. Click any block of the current day → diary section at bottom of SidePanel
2. Or on mobile, tap the diary entry point
3. Write 3 lines → save

### Weekly Review
1. Navigate to `/review` → see current week stats
2. Completion rate, block type distribution visualized as charts
3. Write reflection text at the bottom

## Development Infrastructure

### ESLint + Prettier
- ESLint flat config with `@typescript-eslint`
- Prettier integrated with ESLint (no conflicts)

### Testing Strategy
- **Unit tests:** Domain entities and use cases (Vitest)
- **Component tests:** React components (React Testing Library)
- **No E2E in MVP** — add later with Playwright if needed

### CI/CD (GitHub Actions)
On every push and PR:
1. `pnpm lint` — ESLint check
2. `pnpm type-check` — TypeScript strict compilation
3. `pnpm test` — Vitest suite
4. Deploy to Vercel on merge to `main`

## Future Scope (Not in MVP)

- **Monthly rhythm analysis:** Cross-week trend charts, energy cycle visualization
- **A/B plan mechanism:** Set backup plans, switch when energy is low
- **Onboarding tutorial:** Guided first-time experience explaining the BLOCK6 method
- **Multi-user features:** Sharing plans, group accountability
