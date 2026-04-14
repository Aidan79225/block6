# Diary Fields Rename — Design Spec

## Overview

Replace the generic diary field names `line_1 / line_2 / line_3` with semantically meaningful names `bad / good / next`, and reorder the UI to display them in **Bad → Good → Next** order.

## Goals

- Give the diary fields explicit meaning (what went badly, what went well, what to change next)
- Match the order in which users naturally reflect: vent first, then acknowledge wins, then plan forward
- Keep the change minimal: semantics only — no new functionality

## Out of Scope

- Longer-term diary features (monthly aggregation, analytics)
- Emoji or tag categorization
- Editing tone guidance / prompts

---

## Data Migration

Existing rows keep their stored content. The mapping is:

| Before | After |
|--------|-------|
| `line_1` | `bad` |
| `line_2` | `good` |
| `line_3` | `next` |

**Trade-off acknowledged:** Users who previously wrote without a fixed semantic meaning may find old entries don't match the new labels perfectly. This is unavoidable with a semantic rename. No attempt is made to "re-interpret" past entries.

### SQL migration

`supabase/migrations/006_rename_diary_fields.sql`:

```sql
alter table diary_entries rename column line_1 to bad;
alter table diary_entries rename column line_2 to good;
alter table diary_entries rename column line_3 to next;
```

Column ordering on disk is preserved (Postgres keeps physical order), but the SQL column references used by the app change.

---

## Domain Entity

`src/domain/entities/diary-entry.ts`:

```typescript
export interface DiaryEntry {
  readonly id: string;
  readonly userId: string;
  readonly entryDate: Date;
  readonly bad: string;
  readonly good: string;
  readonly next: string;
  readonly createdAt: Date;
}

export interface CreateDiaryEntryInput {
  id: string;
  userId: string;
  entryDate: Date;
  bad: string;
  good: string;
  next: string;
  createdAt: Date;
}

export function createDiaryEntry(input: CreateDiaryEntryInput): DiaryEntry {
  if (!input.bad.trim() || !input.good.trim() || !input.next.trim()) {
    throw new Error("All three diary fields are required");
  }
  return { ...input };
}
```

## Use Case

`src/domain/usecases/write-diary.ts` — update `WriteDiaryInput` and `execute` so they pass `bad / good / next` instead of `line1 / line2 / line3`.

## Repository Interface

`src/domain/repositories/diary-repository.ts` keeps its methods (`findByUserAndDate`, `save`, `update`, `findByUserAndDateRange`); they operate on `DiaryEntry` which now has the new fields.

## Supabase Data Layer

`src/infrastructure/supabase/database.ts`:

- `DiaryLines` type becomes `{ bad: string; good: string; next: string }`
- `fetchDiary` selects `bad, good, next` and returns them under the same field names
- `upsertDiary` inserts/updates with `bad / good / next` column names

```typescript
export interface DiaryLines {
  bad: string;
  good: string;
  next: string;
}
```

## AppState

`src/presentation/providers/app-state-provider.tsx`:

- The exported `DiaryLines` type updates (via re-export from the DB module)
- `saveDiary(dateKey, bad, good, next)` — parameters rename, call sites updated
- Local-mode (localStorage) `diaryEntries` keyed by `dateKey` keep the same shape; they just use new field names

**localStorage data migration:** Existing users who stored diary entries in localStorage while logged out will have `{ line1, line2, line3 }` shaped data. `loadFromStorage` will tolerate both shapes:

```typescript
function migrateStoredDiaryEntries(
  raw: Record<string, Record<string, string>>,
): Record<string, DiaryLines> {
  const result: Record<string, DiaryLines> = {};
  for (const [date, v] of Object.entries(raw)) {
    if ("bad" in v || "good" in v || "next" in v) {
      result[date] = {
        bad: v.bad ?? "",
        good: v.good ?? "",
        next: v.next ?? "",
      };
    } else {
      result[date] = {
        bad: v.line1 ?? "",
        good: v.line2 ?? "",
        next: v.line3 ?? "",
      };
    }
  }
  return result;
}
```

This runs once when loading from storage.

## UI Components

### `DiaryForm`

Labels and input order change to **Bad → Good → Next**. The label text uses English directly (`Bad`, `Good`, `Next`).

Props:

```typescript
interface Props {
  bad: string;
  good: string;
  next: string;
  onSave: (bad: string, good: string, next: string) => void;
}
```

### `DiaryWeekView`

Each day cell lists three labeled rows (`Bad`, `Good`, `Next`) in that order, each with its text or an em-dash if empty.

Entry prop type:

```typescript
interface Entry {
  dayOfWeek: number;
  bad: string;
  good: string;
  next: string;
}
```

---

## Testing

All existing diary-related tests update to use the new field names:

- `DiaryEntry` entity test: `bad / good / next` required, error message `"All three diary fields are required"`
- `WriteDiaryUseCase` test: updates existing entry with new fields
- `DiaryForm` component test: three labeled inputs in Bad/Good/Next order; onSave receives `(bad, good, next)`
- `DiaryWeekView` component test: renders labels and content from the three fields

---

## Migration Process

1. Run `006_rename_diary_fields.sql` in Supabase SQL Editor
2. Merge the rename PR; Vercel deploys new code
3. Existing users with localStorage data: automatic shape migration on next load

The deployment order (migration first, then code) is important. If code deploys first, existing rows still have `line_1` columns and queries fail. If SQL runs first, old code breaks immediately. Since this is a personal app with very few users, brief downtime is acceptable — we run the SQL just before merging the PR.

---

## Branch

`feature/diary-fields-rename` (already created).
