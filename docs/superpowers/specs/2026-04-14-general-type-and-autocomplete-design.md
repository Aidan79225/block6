# General Block Type & Task Title Autocomplete — Design Spec

## Overview

Two related additions to block editing:

1. **"一般" (General) block type** — a fourth type alongside core/rest/buffer, set as the default for new blocks
2. **Task title autocomplete** — when editing a block's title, show a dropdown of previously used task names, sorted by frequency

Both features aim to reduce friction when capturing day-to-day tasks and pave the way for a future weekly "task × time" ranking in the review.

## Goals

- Make it easy to log routine, non-special tasks without forcing a classification decision (default to "一般")
- Let users re-select previously used task names quickly (no retyping)
- Keep the data model clean so a future week-review statistic (task × elapsed time) can be derived without schema changes

## Out of Scope

- Keyboard-arrow navigation of the autocomplete list (future enhancement)
- Manual deletion of suggestions (list is derived automatically from existing blocks)
- Per-block-type filtering of suggestions (spec choice: show all titles regardless of type)
- The week-review "task × time" UI itself (this spec only ensures the data supports it)

---

## Data Model

### New block_type row

`block_types` is an existing lookup table. Insert one row:

```sql
insert into block_types (name) values ('general');
```

The row will receive `id = 4` (existing: 1 core, 2 rest, 3 buffer).

### Domain entity

`src/domain/entities/block.ts` — extend the enum:

```typescript
export enum BlockType {
  Core = "core",
  Rest = "rest",
  Buffer = "buffer",
  General = "general",
}
```

### Supabase mapper

`src/infrastructure/supabase/database.ts`:

```typescript
const BLOCK_TYPE_MAP: Record<BlockType, number> = {
  [BlockType.Core]: 1,
  [BlockType.Rest]: 2,
  [BlockType.Buffer]: 3,
  [BlockType.General]: 4,
};

const BLOCK_TYPE_REVERSE: Record<number, BlockType> = {
  1: BlockType.Core,
  2: BlockType.Rest,
  3: BlockType.Buffer,
  4: BlockType.General,
};
```

No new table and no new column. The autocomplete list is derived from existing `blocks.title`.

### No denormalized suggestion cache

Suggestions are computed client-side from `allBlocks` via `useMemo`. This keeps the model simple and ensures the list always reflects reality (including optimistic updates).

---

## Default Block Type

New blocks default to `BlockType.General`. This affects:

- `BlockEditor` — `blockType={block?.blockType ?? BlockType.General}` (was `BlockType.Core`)
- `AppStateProvider.saveBlock` — when creating a new block without explicit type, default to General
- Existing blocks are unchanged (their `block_type_id` stays what it was)

---

## Color for "一般"

Add a new CSS custom property in `src/app/theme.css`:

```css
--color-block-general: #7d8590;  /* dark theme: GitHub neutral grey */
```

For light theme:

```css
--color-block-general: #656d76;  /* light theme counterpart */
```

Chose a neutral grey tone (low saturation) to signal "no particular emphasis" — contrasts with the vibrant green/yellow/red of the other three types.

All places that map `BlockType → color` must include the new entry:

- `src/presentation/components/week-grid/block-cell.tsx` (`typeColorMap`)
- `src/presentation/components/day-view/block-card.tsx` (`typeColorMap`)
- `src/presentation/components/week-overview/week-overview.tsx` (`typeColorMap`)
- `src/presentation/components/side-panel/block-editor.tsx` (`typeOptions` array — add 4th button)
- `src/presentation/components/review/block-type-breakdown.tsx` (`typeConfig` array — add 4th row)

### Week summary interface

`src/domain/usecases/get-week-summary.ts` — extend `WeekSummary.byType`:

```typescript
byType: {
  core: TypeStats;
  rest: TypeStats;
  buffer: TypeStats;
  general: TypeStats;  // new
}
```

Update tests accordingly.

---

## Task Title Autocomplete

### Data Source

A derived list computed from `allBlocks`:

```typescript
interface TitleSuggestion {
  title: string;
  count: number;  // number of blocks using this title
}

function buildSuggestions(blocks: Block[]): TitleSuggestion[] {
  const counts = new Map<string, number>();
  for (const block of blocks) {
    const title = block.title.trim();
    if (!title) continue;
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
}
```

Exposed from `AppStateProvider` as `taskTitleSuggestions: TitleSuggestion[]`, memoized on `allBlocks`.

### New Component: `TaskTitleAutocomplete`

File: `src/presentation/components/side-panel/task-title-autocomplete.tsx`

**Props:**

```typescript
interface Props {
  value: string;
  suggestions: TitleSuggestion[];
  onChange: (value: string) => void;
  placeholder?: string;
}
```

**Behavior:**

| Event | Result |
|-------|--------|
| Focus on input | Show dropdown with full suggestion list (unfiltered) |
| Type characters | Filter list by `title.toLowerCase().includes(query.toLowerCase())`; dropdown stays visible |
| Click a suggestion | Fill `value` with that title, close dropdown |
| Escape key | Close dropdown, keep current value |
| Blur (with 150 ms delay) | Close dropdown (delay lets click events fire first) |

### Visual

```
┌─────────────────────────────────────┐
│ 任務名稱 [閱_______________________] │ ← input (styled like other inputs)
├─────────────────────────────────────┤
│  閱讀                          ×5   │ ← suggestion row: title + greyed count
│  閱讀論文                      ×2   │
│  閱讀書籍                      ×1   │
│  ...                                │
└─────────────────────────────────────┘
   (max-height ≈ 160px, scrolls if more)
```

- Dropdown container uses `position: absolute` relative to a wrapper div
- z-index above other SidePanel content
- Each row: `padding: 6px 10px`, hover background = `var(--color-bg-tertiary)`
- Count shown in `var(--color-text-muted)`, small font
- Dropdown hidden when no suggestions to show

### Integration

`BlockEditor` (`src/presentation/components/side-panel/block-editor.tsx`) replaces its title `<input>` with `<TaskTitleAutocomplete>`, passing `suggestions` from `useAppState()`.

---

## Migration

`supabase/migrations/003_general_block_type.sql`:

```sql
insert into block_types (name) values ('general');
```

Run in Supabase Dashboard SQL Editor. No data backfill needed.

---

## Architecture

New file:

```
supabase/migrations/003_general_block_type.sql               (new)

src/
  presentation/
    components/
      side-panel/
        task-title-autocomplete.tsx                          (new)
```

Modified:

- `src/domain/entities/block.ts` — add `BlockType.General`
- `src/domain/usecases/get-week-summary.ts` — add `general` to `byType`
- `src/infrastructure/supabase/database.ts` — extend type map/reverse
- `src/app/theme.css` — add `--color-block-general` for both themes
- `src/presentation/providers/app-state-provider.tsx` — expose `taskTitleSuggestions`
- `src/presentation/components/side-panel/block-editor.tsx` — default type = General, use autocomplete, add 4th type button
- `src/presentation/components/week-grid/block-cell.tsx` — color map
- `src/presentation/components/day-view/block-card.tsx` — color map
- `src/presentation/components/week-overview/week-overview.tsx` — color map
- `src/presentation/components/review/block-type-breakdown.tsx` — 4th type row

---

## Testing

### Unit tests

- `buildSuggestions` function (extracted or tested via provider): de-duplication, count, sort order
- `GetWeekSummaryUseCase`: `byType.general` counts correctly

### Component tests

- `TaskTitleAutocomplete`:
  - Focus shows suggestion list
  - Typing filters the list
  - Clicking a suggestion sets value and closes list
  - Escape closes list, keeps value
- `BlockEditor`: default type is General for new blocks

### Not tested

- Hover styles (CSS-only)
- Keyboard arrow navigation (out of scope)
- Blur timing (relies on async; manual verification sufficient)

---

## Development Process

- Branch: `feature/general-type-and-autocomplete` (already created)
- Follow existing commit conventions
- Open PR to `master` when complete
