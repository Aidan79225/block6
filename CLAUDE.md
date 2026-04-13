# CLAUDE.md

## Project: BLOCK6 Time Manager

Web-based implementation of the "6區塊黃金比例時間分配法" (BLOCK6 Golden Ratio Time Allocation Method).

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Frontend:** Next.js (App Router)
- **Backend/DB:** Supabase (PostgreSQL + Auth)
- **Package Manager:** pnpm
- **Lint:** ESLint (flat config) + @typescript-eslint
- **Formatter:** Prettier
- **Testing:** Vitest + React Testing Library
- **CI/CD:** GitHub Actions (lint, type-check, test on push/PR)
- **Deployment:** Vercel

## Architecture (Clean Architecture)

```
src/
  domain/            # Core business logic — zero framework imports
    entities/        # Block, WeekPlan, DiaryEntry, WeekReview
    usecases/        # CreateWeekPlan, UpdateBlockStatus, WriteDiary, etc.
    repositories/    # Interface definitions (abstractions only)

  infrastructure/    # Concrete implementations — swappable
    supabase/        # Supabase implementation of repository interfaces

  presentation/      # Next.js pages and React components
    components/      # React components
    app/             # Next.js App Router pages
```

**Rules:**
- `domain/` must NEVER import from Supabase, Next.js, or any external framework.
- All external dependencies are injected through `repositories/` interfaces.
- Swapping Supabase only requires a new implementation in `infrastructure/`.

## Theme System

- All colors defined as CSS custom properties (`--color-bg-primary`, `--color-accent`, etc.)
- Theme switching via `<html data-theme="dark|light">`
- Dark theme is the primary/default theme, using GitHub Dark Default palette
- Theme preference stored in `localStorage`
- Block type colors (dark theme):
  - Core (核心): #3fb950 (green)
  - Rest (休息): #d29922 (yellow)
  - Buffer (緩衝): #f85149 (red)

## DB Tables (3NF)

`users`, `block_types`, `week_plans`, `blocks`, `diary_entries`, `week_reviews`

Full schema in `docs/superpowers/specs/2026-04-13-block6-time-manager-design.md`.
