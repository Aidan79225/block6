# General Block Type & Task Title Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "一般" (General) as a 4th default block type and a task-title autocomplete dropdown that suggests previously used titles sorted by frequency.

**Architecture:** Extend the existing `BlockType` enum and its color/mapping sites. Add a single new presentational component `TaskTitleAutocomplete` used inside `BlockEditor`. Suggestions are derived in-memory from `allBlocks` — no new tables or columns.

**Tech Stack:** TypeScript (strict), Next.js App Router, Supabase, Vitest + RTL.

---

## File Structure

```
supabase/migrations/003_general_block_type.sql                          (new)

src/
  domain/
    entities/
      block.ts                                                          (modify: enum)
    usecases/
      get-week-summary.ts                                               (modify: byType.general)
  infrastructure/
    supabase/
      database.ts                                                       (modify: type maps)
  app/
    theme.css                                                           (modify: add color token)
  presentation/
    providers/
      app-state-provider.tsx                                            (modify: expose suggestions)
    components/
      side-panel/
        task-title-autocomplete.tsx                                     (new)
        block-editor.tsx                                                (modify: default + 4th button + autocomplete)
      week-grid/
        block-cell.tsx                                                  (modify: color map)
      day-view/
        block-card.tsx                                                  (modify: color map)
      week-overview/
        week-overview.tsx                                               (modify: color map)
      review/
        block-type-breakdown.tsx                                        (modify: 4th row)

src/__tests__/
  domain/
    usecases/
      get-week-summary.test.ts                                          (modify: add general)
  presentation/
    components/
      task-title-autocomplete.test.tsx                                  (new)
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/003_general_block_type.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/003_general_block_type.sql`:

```sql
insert into block_types (name) values ('general');
```

- [ ] **Step 2: Ask user to run in Supabase Dashboard**

Tell user: "Open Supabase Dashboard → SQL Editor → paste the contents of `supabase/migrations/003_general_block_type.sql` → Run. Expected: `Success. No rows returned.`"

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_general_block_type.sql
git commit -m "feat: add general block type to block_types lookup"
```

---

## Task 2: Extend BlockType Enum

**Files:**
- Modify: `src/domain/entities/block.ts`

- [ ] **Step 1: Add General to enum**

Edit `src/domain/entities/block.ts`. Replace the `BlockType` enum:

```typescript
export enum BlockType {
  Core = "core",
  Rest = "rest",
  Buffer = "buffer",
  General = "general",
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: One or more errors in `get-week-summary.ts` and `database.ts` about missing map entries (that's the next tasks). Don't commit yet — continue to Task 3 which will also use this change.

Actually, type-check will fail because `Record<BlockType, ...>` requires all keys. Resolve this by doing Tasks 2, 3, 4 as a single commit after all three are done. Proceed to Task 3.

---

## Task 3: Update Supabase Type Mappers

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

- [ ] **Step 1: Find the type maps**

Run:
```bash
grep -n "BLOCK_TYPE_MAP\|BLOCK_TYPE_REVERSE" src/infrastructure/supabase/database.ts
```

- [ ] **Step 2: Update both maps**

Replace `BLOCK_TYPE_MAP`:

```typescript
const BLOCK_TYPE_MAP: Record<BlockType, number> = {
  [BlockType.Core]: 1,
  [BlockType.Rest]: 2,
  [BlockType.Buffer]: 3,
  [BlockType.General]: 4,
};
```

Replace `BLOCK_TYPE_REVERSE`:

```typescript
const BLOCK_TYPE_REVERSE: Record<number, BlockType> = {
  1: BlockType.Core,
  2: BlockType.Rest,
  3: BlockType.Buffer,
  4: BlockType.General,
};
```

- [ ] **Step 3: Continue to Task 4** (don't commit yet)

---

## Task 4: Update GetWeekSummaryUseCase

**Files:**
- Modify: `src/domain/usecases/get-week-summary.ts`
- Modify: `src/__tests__/domain/usecases/get-week-summary.test.ts`

- [ ] **Step 1: Update the use case**

Replace `src/domain/usecases/get-week-summary.ts` with:

```typescript
import { BlockType, BlockStatus } from "@/domain/entities/block";
import { BlockRepository } from "@/domain/repositories/block-repository";

export interface TypeStats {
  total: number;
  completed: number;
}

export interface WeekSummary {
  totalBlocks: number;
  completedBlocks: number;
  completionRate: number;
  byType: Record<BlockType, TypeStats>;
}

export class GetWeekSummaryUseCase {
  constructor(private readonly repo: BlockRepository) {}

  async execute(weekPlanId: string): Promise<WeekSummary> {
    const blocks = await this.repo.findByWeekPlan(weekPlanId);

    const byType: Record<BlockType, TypeStats> = {
      [BlockType.Core]: { total: 0, completed: 0 },
      [BlockType.Rest]: { total: 0, completed: 0 },
      [BlockType.Buffer]: { total: 0, completed: 0 },
      [BlockType.General]: { total: 0, completed: 0 },
    };

    let completedBlocks = 0;

    for (const block of blocks) {
      byType[block.blockType].total++;
      if (block.status === BlockStatus.Completed) {
        byType[block.blockType].completed++;
        completedBlocks++;
      }
    }

    const totalBlocks = blocks.length;
    const completionRate =
      totalBlocks === 0 ? 0 : completedBlocks / totalBlocks;

    return { totalBlocks, completedBlocks, completionRate, byType };
  }
}
```

- [ ] **Step 2: Update tests**

Open `src/__tests__/domain/usecases/get-week-summary.test.ts`. Find the existing test that asserts `byType: { core: ..., rest: ..., buffer: ... }` and update it to include `general: { total: 0, completed: 0 }`.

The expected object inside the "calculates completion stats for a week plan" test should become:

```typescript
expect(result.byType).toEqual({
  core: { total: 2, completed: 1 },
  rest: { total: 1, completed: 1 },
  buffer: { total: 1, completed: 0 },
  general: { total: 0, completed: 0 },
});
```

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 4: Commit (combined with Tasks 2 and 3)**

```bash
git add src/domain/entities/block.ts src/domain/usecases/get-week-summary.ts src/infrastructure/supabase/database.ts src/__tests__/domain/usecases/get-week-summary.test.ts
git commit -m "feat: add BlockType.General with mapping and summary support"
```

---

## Task 5: Add Color Token

**Files:**
- Modify: `src/app/theme.css`

- [ ] **Step 1: Add tokens to both themes**

In `src/app/theme.css`, add `--color-block-general` to both the dark and light theme blocks.

In the `:root, [data-theme="dark"]` block, add this line (alongside the other block-type color lines):

```css
--color-block-general: #7d8590;
```

In the `[data-theme="light"]` block, add:

```css
--color-block-general: #656d76;
```

- [ ] **Step 2: Verify type-check, lint**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/theme.css
git commit -m "feat: add --color-block-general CSS token for general type"
```

---

## Task 6: Apply Color in Grid/Card Components

**Files:**
- Modify: `src/presentation/components/week-grid/block-cell.tsx`
- Modify: `src/presentation/components/day-view/block-card.tsx`
- Modify: `src/presentation/components/week-overview/week-overview.tsx`

- [ ] **Step 1: Update `block-cell.tsx`**

Find the `typeColorMap` object and add the General entry:

```typescript
const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
  [BlockType.General]: "var(--color-block-general)",
};
```

- [ ] **Step 2: Update `block-card.tsx`**

Same change — find `typeColorMap` and add:

```typescript
[BlockType.General]: "var(--color-block-general)",
```

- [ ] **Step 3: Update `week-overview.tsx`**

Same change — find `typeColorMap` and add the General entry.

- [ ] **Step 4: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/week-grid/block-cell.tsx src/presentation/components/day-view/block-card.tsx src/presentation/components/week-overview/week-overview.tsx
git commit -m "feat: render general block type with its color in grid/card views"
```

---

## Task 7: Update BlockEditor Type Selector

**Files:**
- Modify: `src/presentation/components/side-panel/block-editor.tsx`

- [ ] **Step 1: Change default and add 4th button**

Open `src/presentation/components/side-panel/block-editor.tsx`. Find the `typeOptions` array and change it to:

```tsx
const typeOptions: { value: BlockType; label: string; color: string }[] = [
  { value: BlockType.Core, label: "核心", color: "var(--color-block-core)" },
  { value: BlockType.Rest, label: "休息", color: "var(--color-block-rest)" },
  { value: BlockType.Buffer, label: "緩衝", color: "var(--color-block-buffer)" },
  { value: BlockType.General, label: "一般", color: "var(--color-block-general)" },
];
```

- [ ] **Step 2: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/side-panel/block-editor.tsx
git commit -m "feat: add 一般 option to block type selector"
```

---

## Task 8: Change New-Block Default Type to General

**Files:**
- Modify: `src/presentation/components/side-panel/side-panel.tsx`

- [ ] **Step 1: Change default in SidePanel**

Find the line passing `blockType` to `BlockEditor`. Currently:

```tsx
blockType={block?.blockType ?? BlockType.Core}
```

Change to:

```tsx
blockType={block?.blockType ?? BlockType.General}
```

- [ ] **Step 2: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/side-panel/side-panel.tsx
git commit -m "feat: default new blocks to 一般 type"
```

---

## Task 9: Update BlockTypeBreakdown for Review Page

**Files:**
- Modify: `src/presentation/components/review/block-type-breakdown.tsx`

- [ ] **Step 1: Extend the interface and config**

Open `src/presentation/components/review/block-type-breakdown.tsx`. Update the props interface to add `general`:

```tsx
interface BlockTypeBreakdownProps {
  byType: {
    core: TypeData;
    rest: TypeData;
    buffer: TypeData;
    general: TypeData;
  };
}
```

And update the `typeConfig` array:

```tsx
const typeConfig = [
  { key: "core" as const, label: "核心", color: "var(--color-block-core)" },
  { key: "rest" as const, label: "休息", color: "var(--color-block-rest)" },
  { key: "buffer" as const, label: "緩衝", color: "var(--color-block-buffer)" },
  { key: "general" as const, label: "一般", color: "var(--color-block-general)" },
];
```

- [ ] **Step 2: Update the review page where byType is constructed**

Open `src/app/review/page.tsx`. Find:

```tsx
const byType = {
  core: { total: 0, completed: 0 },
  rest: { total: 0, completed: 0 },
  buffer: { total: 0, completed: 0 },
};
```

Change to:

```tsx
const byType = {
  core: { total: 0, completed: 0 },
  rest: { total: 0, completed: 0 },
  buffer: { total: 0, completed: 0 },
  general: { total: 0, completed: 0 },
};
```

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/review/block-type-breakdown.tsx src/app/review/page.tsx
git commit -m "feat: include general type in weekly review breakdown"
```

---

## Task 10: TaskTitleAutocomplete Component (TDD)

**Files:**
- Create: `src/presentation/components/side-panel/task-title-autocomplete.tsx`
- Create: `src/__tests__/presentation/components/task-title-autocomplete.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/presentation/components/task-title-autocomplete.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskTitleAutocomplete } from "@/presentation/components/side-panel/task-title-autocomplete";

const SUGGESTIONS = [
  { title: "閱讀", count: 5 },
  { title: "閱讀論文", count: 2 },
  { title: "運動", count: 3 },
];

describe("TaskTitleAutocomplete", () => {
  it("does not show dropdown initially", () => {
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText("閱讀")).not.toBeInTheDocument();
  });

  it("shows full dropdown on focus", async () => {
    const user = userEvent.setup();
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole("textbox"));
    expect(screen.getByText("閱讀")).toBeInTheDocument();
    expect(screen.getByText("運動")).toBeInTheDocument();
    expect(screen.getByText("閱讀論文")).toBeInTheDocument();
  });

  it("filters dropdown by case-insensitive includes", async () => {
    const user = userEvent.setup();
    let currentValue = "";
    const { rerender } = render(
      <TaskTitleAutocomplete
        value={currentValue}
        suggestions={SUGGESTIONS}
        onChange={(v) => {
          currentValue = v;
        }}
      />,
    );
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "閱");

    rerender(
      <TaskTitleAutocomplete
        value={currentValue}
        suggestions={SUGGESTIONS}
        onChange={(v) => {
          currentValue = v;
        }}
      />,
    );

    expect(screen.getByText("閱讀")).toBeInTheDocument();
    expect(screen.getByText("閱讀論文")).toBeInTheDocument();
    expect(screen.queryByText("運動")).not.toBeInTheDocument();
  });

  it("calls onChange with clicked suggestion title", async () => {
    const user = userEvent.setup();
    let picked: string | null = null;
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={(v) => {
          picked = v;
        }}
      />,
    );
    await user.click(screen.getByRole("textbox"));
    await user.click(screen.getByText("運動"));
    expect(picked).toBe("運動");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    const input = screen.getByRole("textbox");
    await user.click(input);
    expect(screen.getByText("閱讀")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("閱讀")).not.toBeInTheDocument();
  });

  it("shows count next to each suggestion", async () => {
    const user = userEvent.setup();
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole("textbox"));
    expect(screen.getByText("×5")).toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/presentation/components/task-title-autocomplete.test.tsx
```

Expected: FAIL — cannot resolve `@/presentation/components/side-panel/task-title-autocomplete`.

- [ ] **Step 3: Implement the component**

Create `src/presentation/components/side-panel/task-title-autocomplete.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";

export interface TitleSuggestion {
  title: string;
  count: number;
}

interface Props {
  value: string;
  suggestions: TitleSuggestion[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TaskTitleAutocomplete({
  value,
  suggestions,
  onChange,
  placeholder = "任務名稱",
}: Props) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = value.trim()
    ? suggestions.filter((s) =>
        s.title.toLowerCase().includes(value.toLowerCase()),
      )
    : suggestions;

  const handleFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const handlePick = (title: string) => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    onChange(title);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "2px",
            maxHeight: "160px",
            overflowY: "auto",
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            listStyle: "none",
            padding: "4px 0",
            margin: 0,
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {filtered.map((s) => (
            <li
              key={s.title}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                // Use mousedown instead of click so it fires before blur
                e.preventDefault();
                handlePick(s.title);
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                cursor: "pointer",
                color: "var(--color-text-primary)",
                fontSize: "13px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "var(--color-bg-tertiary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span>{s.title}</span>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "11px",
                  marginLeft: "12px",
                }}
              >
                ×{s.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test -- src/__tests__/presentation/components/task-title-autocomplete.test.tsx
```

Expected: PASS (6 tests).

- [ ] **Step 5: Run full checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/side-panel/task-title-autocomplete.tsx src/__tests__/presentation/components/task-title-autocomplete.test.tsx
git commit -m "feat: add TaskTitleAutocomplete component"
```

---

## Task 11: Expose Suggestions from AppStateProvider

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Add a TitleSuggestion type import and memo**

At the top of `src/presentation/providers/app-state-provider.tsx`, add an import from React for `useMemo`:

```typescript
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
} from "react";
```

Import the type from the new component:

```typescript
import type { TitleSuggestion } from "@/presentation/components/side-panel/task-title-autocomplete";
```

- [ ] **Step 2: Extend `AppState` interface**

Find the `AppState` interface and add:

```typescript
  taskTitleSuggestions: TitleSuggestion[];
```

- [ ] **Step 3: Compute suggestions with useMemo**

Inside the `AppStateProvider` function, after the variables `blocks`, `diaryEntries`, `reflection` are declared (where `blocks = isLoggedIn ? supaBlocks : localData.blocks`), add:

```typescript
  const taskTitleSuggestions = useMemo<TitleSuggestion[]>(() => {
    const counts = new Map<string, number>();
    for (const b of blocks) {
      const title = b.title.trim();
      if (!title) continue;
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
  }, [blocks]);
```

- [ ] **Step 4: Expose in context value**

In the `<AppStateContext.Provider value={{...}}>` object, add:

```typescript
        taskTitleSuggestions,
```

- [ ] **Step 5: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: expose taskTitleSuggestions from AppStateProvider"
```

---

## Task 12: Wire Autocomplete into BlockEditor

**Files:**
- Modify: `src/presentation/components/side-panel/block-editor.tsx`

- [ ] **Step 1: Read existing component**

Run:
```bash
cat src/presentation/components/side-panel/block-editor.tsx
```

- [ ] **Step 2: Update imports**

At the top of `src/presentation/components/side-panel/block-editor.tsx`, add:

```typescript
import { TaskTitleAutocomplete } from "./task-title-autocomplete";
import { useAppState } from "@/presentation/providers/app-state-provider";
```

- [ ] **Step 3: Replace the plain title input with the autocomplete**

Find the JSX for the title input — it looks like:

```tsx
<input
  type="text"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="任務名稱"
  style={{ ... }}
/>
```

Replace it with:

```tsx
<TaskTitleAutocomplete
  value={title}
  suggestions={taskTitleSuggestions}
  onChange={setTitle}
/>
```

- [ ] **Step 4: Fetch suggestions from context**

Inside the `BlockEditor` function, near the top (after the `useState` calls), add:

```typescript
  const { taskTitleSuggestions } = useAppState();
```

- [ ] **Step 5: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Manual smoke test**

Run `pnpm dev`, open a block's SidePanel, focus the 任務名稱 input:
- If blocks already exist with titles, the dropdown should appear showing them, sorted by count
- Typing filters the dropdown
- Clicking a suggestion fills the input
- Escape closes the dropdown

- [ ] **Step 7: Commit**

```bash
git add src/presentation/components/side-panel/block-editor.tsx
git commit -m "feat: use TaskTitleAutocomplete in BlockEditor"
```

---

## Task 13: Final Verification & PR

**Files:** none (verification + PR)

- [ ] **Step 1: Format**

```bash
pnpm format
```

- [ ] **Step 2: Full quality check**

```bash
pnpm lint && pnpm type-check && pnpm format:check && pnpm test
```

Expected: all pass.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Verify:
- New blocks default to 一般 (grey neutral color)
- All 4 type buttons visible in BlockEditor
- Existing blocks keep their type
- Week grid / day view / week overview show general blocks with grey color
- Review page shows 一般 row with counts
- Focus title input — dropdown appears
- Type characters — list filters
- Click suggestion — fills input
- Escape — closes dropdown

- [ ] **Step 4: Commit any format changes**

```bash
git add -A
git commit -m "chore: format" --allow-empty
```

- [ ] **Step 5: Push**

```bash
git push -u origin feature/general-type-and-autocomplete
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "feat: add 一般 block type and task title autocomplete" --body "$(cat <<'EOF'
## Summary

- Adds 一般 (General) as the 4th block type, now the default for new blocks
- Adds task-title autocomplete dropdown — focus to see all, type to filter
- Suggestions sorted by most-used; derived from existing blocks (no new table)

## Database

Migration `supabase/migrations/003_general_block_type.sql`:
- Inserts `general` into `block_types`

## Test plan

- [ ] Create new block → defaults to 一般 type (grey)
- [ ] Switch existing blocks to 一般 type → grey color shows in grid/day/overview
- [ ] Review page shows 一般 row in block type breakdown
- [ ] Focus on empty 任務名稱 input → dropdown shows all past titles
- [ ] Type characters → filtered suggestions appear
- [ ] Click a suggestion → fills input
- [ ] Press Escape → closes dropdown

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Migration to insert `general` into `block_types` — Task 1 ✓
- `BlockType.General` enum entry — Task 2 ✓
- Supabase type maps updated — Task 3 ✓
- `GetWeekSummaryUseCase.byType.general` — Task 4 ✓
- CSS color token (dark + light) — Task 5 ✓
- Color maps in block-cell, block-card, week-overview — Task 6 ✓
- 4th type button in BlockEditor — Task 7 ✓
- Default new blocks to General — Task 8 ✓
- BlockTypeBreakdown 4th row + review page byType — Task 9 ✓
- TaskTitleAutocomplete component (focus-show, filter, pick, Escape, count badge) — Task 10 ✓
- AppStateProvider exposes `taskTitleSuggestions` (sorted by count) — Task 11 ✓
- BlockEditor uses the autocomplete — Task 12 ✓
- Verification + PR — Task 13 ✓

### 2. Placeholder scan

No "TBD" / "TODO" / "handle edge cases" / "etc." that require filling in. Every step has exact code or exact command.

### 3. Type consistency

- `TitleSuggestion` interface defined in Task 10, imported in Task 11 — consistent shape (`title: string, count: number`)
- `BlockType.General = "general"` used as string literal key in Tasks 3, 4, 6, 7, 9 — consistent
- `byType` object keys `general` used in Tasks 4 (test), 9 (props, review page) — consistent

All checks pass.
