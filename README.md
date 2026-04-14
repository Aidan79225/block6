# The Block 6

A personal implementation inspired by Jeong Ji-ha's *6-Block Golden Ratio Time Allocation Method* (6區塊黃金比例時間分配法).

**Live:** <https://block6.aidan.tw>

---

## About

The methodology divides each day into **6 blocks** (42 per week) and plans time by blocks rather than by hours or minutes. The goal is to keep attention on *what you're doing and why*, not on *how long it takes*.

Block types:

| Type | Meaning |
|------|---------|
| Core (核心) | Must-do tasks that move you toward your goals |
| Rest (休息) | Deliberate downtime |
| Buffer (緩衝) | Slack for interruptions, catch-up, flexibility |
| General (一般) | Everyday tasks that don't fit the above (the default) |

## Features

- **Weekly plan:** 42-cell WeekGrid — click a cell to edit, long-press to drag-and-drop swap
- **Subtasks:** Per-block checklist with drag-to-reorder and inline edit
- **Timer:** Live stopwatch per block plus manual session entry; single-active-timer rule across the app
- **Emotion diary:** 3-line daily journal
- **Weekly review:** Completion rate, block-type breakdown, task × elapsed-time ranking, 7-day diary overview, reflection editor
- **Global weekly checklist:** Cross-week recurring goals (e.g. "exercise 3 times"), each check recorded against a specific week
- **Dual storage:** localStorage for guests; automatic migration to Supabase on login with multi-device sync
- **Dark / light themes** using GitHub's Primer color palette

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript (strict) + React 19
- **Data:** Supabase (PostgreSQL + Auth + Row-Level Security)
- **Architecture:** Clean Architecture (`domain` / `infrastructure` / `presentation` layers)
- **Drag & drop:** @dnd-kit
- **Testing:** Vitest + React Testing Library
- **CI/CD:** GitHub Actions → Vercel

## Local Development

```bash
pnpm install
cp .env.local.example .env.local   # fill in Supabase credentials
pnpm dev
```

Environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Apply the database schema by running each file in `supabase/migrations/` (in order) through the Supabase Dashboard SQL editor.

Common commands:

```bash
pnpm dev           # dev server
pnpm lint          # ESLint
pnpm type-check    # TypeScript strict check
pnpm test          # Vitest
pnpm format        # Prettier
pnpm build         # production build
```

## Project Structure

```
src/
  domain/            # Pure business logic, zero framework dependencies
    entities/
    usecases/
    repositories/    # Interfaces only
  infrastructure/
    supabase/        # Supabase implementations
  presentation/
    app/             # Next.js App Router pages
    components/
    providers/       # React context (Auth, AppState, Notification)
    hooks/

supabase/migrations/ # Versioned SQL migrations
docs/superpowers/    # Per-feature specs and implementation plans
```

## License

MIT — see [LICENSE](./LICENSE).

This project is a personal study and implementation of the methodology. The book's content and rights belong to its author and publisher; no text from the book is reproduced here.
