# Block Drag-and-Drop Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 500ms long-press drag-and-drop reorder to the desktop WeekGrid; drop on another block to swap, drop on empty cell to move.

**Architecture:** Postgres RPC `swap_blocks` with deferred unique constraint lets two blocks exchange `(day_of_week, slot)` atomically. Frontend uses `@dnd-kit/core` (already installed) with a long-press sensor; each `BlockCell` is both draggable and droppable. Subtasks and timer sessions follow automatically because they reference `block_id`, which never changes.

**Tech Stack:** TypeScript, Next.js, Supabase (Postgres RPC), @dnd-kit/core, Vitest + RTL.

---

## File Structure

```
supabase/migrations/004_swap_blocks.sql                                 (new)

src/
  infrastructure/
    supabase/
      database.ts                                                       (modify: add swap/move wrappers)
  presentation/
    providers/
      app-state-provider.tsx                                            (modify: add swapBlocks, moveBlock)
    components/
      week-grid/
        week-grid.tsx                                                   (modify: DndContext + DragOverlay)
        block-cell.tsx                                                  (modify: useDraggable + useDroppable)
  app/
    page.tsx                                                            (modify: pass swap/move handlers)
```

---

## Task 1: DB Migration — Deferred Unique + swap_blocks RPC

**Files:**
- Create: `supabase/migrations/004_swap_blocks.sql`

- [ ] **Step 1: Write the SQL migration**

Create `supabase/migrations/004_swap_blocks.sql`:

```sql
alter table blocks
  drop constraint blocks_week_plan_id_day_of_week_slot_key;

alter table blocks
  add constraint blocks_week_plan_id_day_of_week_slot_key
  unique (week_plan_id, day_of_week, slot)
  deferrable initially deferred;

create or replace function swap_blocks(block_a uuid, block_b uuid)
returns void
language plpgsql
security invoker
as $$
declare
  a_week_plan uuid;
  a_day smallint;
  a_slot smallint;
  b_week_plan uuid;
  b_day smallint;
  b_slot smallint;
begin
  select week_plan_id, day_of_week, slot
    into a_week_plan, a_day, a_slot
    from blocks where id = block_a;

  select week_plan_id, day_of_week, slot
    into b_week_plan, b_day, b_slot
    from blocks where id = block_b;

  if a_week_plan is null or b_week_plan is null then
    raise exception 'One or both blocks not found';
  end if;

  if a_week_plan <> b_week_plan then
    raise exception 'Blocks must belong to the same week plan';
  end if;

  update blocks set day_of_week = b_day, slot = b_slot where id = block_a;
  update blocks set day_of_week = a_day, slot = a_slot where id = block_b;
end;
$$;
```

- [ ] **Step 2: Run it in Supabase Dashboard**

Tell the user: "Open Supabase Dashboard → SQL Editor → paste the file contents → Run. Expected result: `Success. No rows returned.`"

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_swap_blocks.sql
git commit -m "feat: add swap_blocks RPC with deferred unique constraint"
```

---

## Task 2: Supabase Wrappers for swap/move

**Files:**
- Modify: `src/infrastructure/supabase/database.ts`

- [ ] **Step 1: Append the new functions**

Append to `src/infrastructure/supabase/database.ts` (after the existing timer sessions section):

```typescript
// --- Block position operations ---

export async function swapBlocksInDb(
  idA: string,
  idB: string,
): Promise<void> {
  const { error } = await supabase.rpc("swap_blocks", {
    block_a: idA,
    block_b: idB,
  });
  if (error) throw new Error(error.message);
}

export async function moveBlockInDb(
  id: string,
  dayOfWeek: number,
  slot: number,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .update({ day_of_week: dayOfWeek, slot })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/supabase/database.ts
git commit -m "feat: add swapBlocksInDb and moveBlockInDb wrappers"
```

---

## Task 3: AppState swapBlocks + moveBlock

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Add imports**

In `src/presentation/providers/app-state-provider.tsx`, find the existing import block from `@/infrastructure/supabase/database` and add the two new functions:

```typescript
import {
  fetchBlocksForWeek,
  upsertBlock,
  updateBlockStatus,
  fetchDiary,
  upsertDiary,
  fetchReflection,
  fetchSubtasksForBlocks,
  addSubtask as dbAddSubtask,
  updateSubtaskTitle as dbUpdateSubtaskTitle,
  toggleSubtaskCompleted as dbToggleSubtask,
  deleteSubtask as dbDeleteSubtask,
  reorderSubtasks as dbReorderSubtasks,
  fetchTimerSessionsForBlocks,
  fetchActiveSession,
  startTimerForBlock,
  stopActiveSession,
  addManualSession as dbAddManualSession,
  deleteSessionsForBlock as dbDeleteSessionsForBlock,
  swapBlocksInDb,
  moveBlockInDb,
} from "@/infrastructure/supabase/database";
```

(Keep the existing imports; just append `swapBlocksInDb` and `moveBlockInDb` to the list.)

- [ ] **Step 2: Extend AppState interface**

In the `AppState` interface, add these two entries near the existing block operations:

```typescript
  swapBlocks: (idA: string, idB: string) => Promise<void>;
  moveBlock: (id: string, dayOfWeek: number, slot: number) => Promise<void>;
```

- [ ] **Step 3: Implement the two operations**

Find the existing `updateStatus` useCallback. Right after it, add:

```typescript
  const swapBlocks = useCallback(
    async (idA: string, idB: string) => {
      // Optimistic: swap day/slot locally
      setSupaBlocks((prev) => {
        const a = prev.find((b) => b.id === idA);
        const b = prev.find((b) => b.id === idB);
        if (!a || !b) return prev;
        return prev.map((block) => {
          if (block.id === idA) {
            return createBlock({
              ...block,
              dayOfWeek: b.dayOfWeek,
              slot: b.slot,
            });
          }
          if (block.id === idB) {
            return createBlock({
              ...block,
              dayOfWeek: a.dayOfWeek,
              slot: a.slot,
            });
          }
          return block;
        });
      });
      if (user) {
        try {
          await swapBlocksInDb(idA, idB);
        } catch (err) {
          console.error(err);
          notify.error("區塊交換失敗");
        }
      }
    },
    [user, notify],
  );

  const moveBlock = useCallback(
    async (id: string, dayOfWeek: number, slot: number) => {
      setSupaBlocks((prev) =>
        prev.map((block) =>
          block.id === id
            ? createBlock({ ...block, dayOfWeek, slot })
            : block,
        ),
      );
      if (user) {
        try {
          await moveBlockInDb(id, dayOfWeek, slot);
        } catch (err) {
          console.error(err);
          notify.error("區塊移動失敗");
        }
      }
    },
    [user, notify],
  );
```

- [ ] **Step 4: Expose in context value**

Find the `<AppStateContext.Provider value={{...}}>` object. After `updateStatus,`, add:

```typescript
        swapBlocks,
        moveBlock,
```

- [ ] **Step 5: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/providers/app-state-provider.tsx
git commit -m "feat: add swapBlocks and moveBlock to AppStateProvider"
```

---

## Task 4: Make BlockCell Draggable and Droppable

**Files:**
- Modify: `src/presentation/components/week-grid/block-cell.tsx`

- [ ] **Step 1: Replace the file**

Replace `src/presentation/components/week-grid/block-cell.tsx` entirely with:

```tsx
"use client";

import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface BlockCellProps {
  block: Block | null;
  dayOfWeek: number;
  slot: number;
  isSelected?: boolean;
  onClick: () => void;
}

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
  [BlockType.General]: "var(--color-block-general)",
};

const statusIcon: Record<BlockStatus, string> = {
  [BlockStatus.Planned]: "",
  [BlockStatus.InProgress]: "\u25B6",
  [BlockStatus.Completed]: "\u2713",
  [BlockStatus.Skipped]: "\u2013",
};

const SELECTED_OUTLINE = "2px solid var(--color-accent)";
const HOVER_OUTLINE = "2px dashed var(--color-accent)";
const OUTLINE_OFFSET = "1px";

export function BlockCell({
  block,
  dayOfWeek,
  slot,
  isSelected,
  onClick,
}: BlockCellProps) {
  const droppableId = `slot-${dayOfWeek}-${slot}`;
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: droppableId });

  const draggableId = block ? `block-${block.id}` : `empty-${droppableId}`;
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
    transform,
  } = useDraggable({
    id: draggableId,
    disabled: !block,
  });

  const outline = isOver
    ? HOVER_OUTLINE
    : isSelected
      ? SELECTED_OUTLINE
      : "none";

  const combinedRef = (node: HTMLButtonElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  if (!block) {
    return (
      <button
        ref={setDropRef}
        onClick={onClick}
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          padding: "8px",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          outline,
          outlineOffset: outline === "none" ? "0" : OUTLINE_OFFSET,
        }}
      >
        +
      </button>
    );
  }

  const borderColor = typeColorMap[block.blockType];
  const icon = statusIcon[block.status];

  return (
    <button
      ref={combinedRef}
      onClick={onClick}
      {...listeners}
      {...attributes}
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `3px solid ${borderColor}`,
        borderTop: "1px solid var(--color-border)",
        borderRight: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--color-text-primary)",
        cursor: "pointer",
        padding: "6px 8px",
        minHeight: "60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textAlign: "left",
        fontSize: "12px",
        opacity:
          isDragging || block.status === BlockStatus.Skipped ? 0.4 : 1,
        outline,
        outlineOffset: outline === "none" ? "0" : OUTLINE_OFFSET,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: "none",
      }}
    >
      <span style={{ fontWeight: 500, fontSize: "11px" }}>{block.title}</span>
      {icon && (
        <span
          style={{
            alignSelf: "flex-end",
            fontSize: "12px",
            color: borderColor,
          }}
        >
          {icon}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Run existing tests**

```bash
pnpm test -- src/__tests__/presentation/components/block-cell.test.tsx
```

Expected: The existing tests don't pass `dayOfWeek` or `slot` props, so they'll fail with TypeScript errors, BUT Vitest still runs them against JavaScript-only... actually TypeScript-strict tests will fail to compile. Check if `pnpm type-check` fails:

```bash
pnpm type-check
```

If the existing tests in `src/__tests__/presentation/components/block-cell.test.tsx` don't pass `dayOfWeek` and `slot`, update them. Open the file:

```bash
cat src/__tests__/presentation/components/block-cell.test.tsx
```

Find each `<BlockCell ... />` and add `dayOfWeek={1} slot={1}` so they compile.

- [ ] **Step 3: Run tests again**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass. (Drag-drop isn't exercised in tests; we just ensure the new props compile and existing behaviors still work.)

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/week-grid/block-cell.tsx src/__tests__/presentation/components/block-cell.test.tsx
git commit -m "feat: BlockCell is draggable and droppable"
```

---

## Task 5: Wrap WeekGrid in DndContext

**Files:**
- Modify: `src/presentation/components/week-grid/week-grid.tsx`

- [ ] **Step 1: Replace the file**

Replace `src/presentation/components/week-grid/week-grid.tsx` entirely with:

```tsx
"use client";

import { useState } from "react";
import type { Block } from "@/domain/entities/block";
import { BlockCell } from "./block-cell";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { BlockType } from "@/domain/entities/block";

interface WeekGridProps {
  blocks: Block[];
  selectedDayOfWeek?: number | null;
  selectedSlot?: number | null;
  onBlockClick: (dayOfWeek: number, slot: number) => void;
  onSwapBlocks: (idA: string, idB: string) => void;
  onMoveBlock: (id: string, dayOfWeek: number, slot: number) => void;
}

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const SLOTS = [1, 2, 3, 4, 5, 6];

const typeColorMap: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
  [BlockType.General]: "var(--color-block-general)",
};

function parseSlotId(id: string): { day: number; slot: number } | null {
  const m = /^slot-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  return { day: Number(m[1]), slot: Number(m[2]) };
}

function parseBlockId(id: string): string | null {
  const m = /^block-(.+)$/.exec(id);
  return m ? m[1] : null;
}

export function WeekGrid({
  blocks,
  selectedDayOfWeek,
  selectedSlot,
  onBlockClick,
  onSwapBlocks,
  onMoveBlock,
}: WeekGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 500, tolerance: 5 },
    }),
  );

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  function findBlock(day: number, slot: number): Block | null {
    return blocks.find((b) => b.dayOfWeek === day && b.slot === slot) ?? null;
  }

  const activeBlock = activeBlockId
    ? (blocks.find((b) => b.id === activeBlockId) ?? null)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = parseBlockId(String(event.active.id));
    if (id) setActiveBlockId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveBlockId(null);
    const { active, over } = event;
    if (!over) return;
    const sourceBlockId = parseBlockId(String(active.id));
    const target = parseSlotId(String(over.id));
    if (!sourceBlockId || !target) return;

    const source = blocks.find((b) => b.id === sourceBlockId);
    if (!source) return;
    if (source.dayOfWeek === target.day && source.slot === target.slot) return;

    const targetBlock = findBlock(target.day, target.slot);
    if (targetBlock) {
      onSwapBlocks(sourceBlockId, targetBlock.id);
    } else {
      onMoveBlock(sourceBlockId, target.day, target.slot);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveBlockId(null)}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          flex: 1,
        }}
      >
        {DAY_LABELS.map((label, i) => (
          <div
            key={`header-${i}`}
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              padding: "8px 0",
            }}
          >
            {label}
          </div>
        ))}
        {SLOTS.map((slot) =>
          DAY_LABELS.map((_, dayIndex) => {
            const dayOfWeek = dayIndex + 1;
            const block = findBlock(dayOfWeek, slot);
            return (
              <BlockCell
                key={`${dayOfWeek}-${slot}`}
                block={block}
                dayOfWeek={dayOfWeek}
                slot={slot}
                isSelected={
                  selectedDayOfWeek === dayOfWeek && selectedSlot === slot
                }
                onClick={() => onBlockClick(dayOfWeek, slot)}
              />
            );
          }),
        )}
      </div>
      <DragOverlay>
        {activeBlock && (
          <div
            style={{
              background: "var(--color-bg-secondary)",
              borderLeft: `3px solid ${typeColorMap[activeBlock.blockType]}`,
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-primary)",
              padding: "6px 8px",
              minHeight: "60px",
              fontSize: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              opacity: 0.9,
            }}
          >
            <span style={{ fontWeight: 500, fontSize: "11px" }}>
              {activeBlock.title}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 2: Update existing tests**

Check if `src/__tests__/presentation/components/week-grid.test.tsx` renders `<WeekGrid />` without the new `onSwapBlocks` and `onMoveBlock` props:

```bash
cat src/__tests__/presentation/components/week-grid.test.tsx
```

Add the missing props to each `<WeekGrid />` test render:

```tsx
<WeekGrid
  blocks={[]}
  onBlockClick={() => {}}
  onSwapBlocks={() => {}}
  onMoveBlock={() => {}}
/>
```

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/week-grid/week-grid.tsx src/__tests__/presentation/components/week-grid.test.tsx
git commit -m "feat: WeekGrid supports long-press drag to swap/move blocks"
```

---

## Task 6: Wire Handlers in Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Destructure the new operations**

Open `src/app/page.tsx`. Find the `useAppState()` destructuring. Add `swapBlocks` and `moveBlock`:

```typescript
  const {
    getBlocksForWeek,
    saveBlock,
    updateStatus,
    swapBlocks,
    moveBlock,
    saveDiary,
    getDiary,
    loadWeek,
    loadDiary,
    getSubtasksForBlock,
    addSubtask,
    editSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
    activeTimer,
    getElapsedSeconds,
    startTimer,
    stopTimer,
    addManualTimer,
    clearTimer,
  } = useAppState();
```

- [ ] **Step 2: Pass them to WeekGrid**

Find the `<WeekGrid />` JSX. Add the two new props:

```tsx
            <WeekGrid
              blocks={blocks}
              selectedDayOfWeek={selected?.dayOfWeek ?? null}
              selectedSlot={selected?.slot ?? null}
              onBlockClick={handleBlockClick}
              onSwapBlocks={swapBlocks}
              onMoveBlock={moveBlock}
            />
```

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire swapBlocks/moveBlock handlers to WeekGrid"
```

---

## Task 7: Final Verification & PR

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

Verify in a browser (desktop width):
- Long press (hold ~500 ms) on a block with content — ghost appears, follows cursor
- Release on another filled cell — the two swap positions (their subtasks/timer sessions travel with them; click into the moved block to verify)
- Release on an empty cell — the block moves there, original cell becomes empty
- Short click on a cell (< 500 ms) — SidePanel still opens as before
- Drop outside the grid / press Escape — nothing changes
- Drop on the same cell — nothing changes

Check page refresh — positions persist (DB round-trip succeeded).

- [ ] **Step 4: Commit any format changes**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: format block-drag-reorder files"
```

- [ ] **Step 5: Push**

```bash
git push -u origin feature/block-drag-reorder
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "feat: long-press drag-drop reorder for blocks" --body "$(cat <<'EOF'
## Summary

- 500ms long-press on a block starts a drag; drop on another block swaps positions; drop on empty cell moves
- Subtasks and timer sessions follow the block (stable block_id, only day/slot are updated)
- Short click still opens SidePanel (dnd-kit activation delay handles the separation)

## Database

Migration `supabase/migrations/004_swap_blocks.sql`:
- Relaxes the `blocks` unique constraint to DEFERRABLE INITIALLY DEFERRED
- Adds a `swap_blocks(block_a uuid, block_b uuid)` RPC that swaps two rows' day/slot in one transaction

## Test plan

- [ ] Long-press a filled block → ghost appears and follows pointer
- [ ] Drop on another filled block → positions swap, data consistent after refresh
- [ ] Drop on empty cell → block moves, original cell empties
- [ ] Short click → SidePanel opens (no drag started)
- [ ] Drop outside grid / Escape → no change
- [ ] Subtasks and timer sessions stay with the moved block

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Deferred unique constraint + `swap_blocks` RPC — Task 1 ✓
- Supabase wrappers `swapBlocksInDb`, `moveBlockInDb` — Task 2 ✓
- `AppState.swapBlocks` and `AppState.moveBlock` (optimistic + error notify) — Task 3 ✓
- `BlockCell` draggable + droppable with hover outline and reduced opacity while dragging — Task 4 ✓
- `WeekGrid` DndContext + 500ms PointerSensor + DragOverlay + onDragEnd resolving to swap/move — Task 5 ✓
- Dashboard page passes swap/move handlers — Task 6 ✓
- Final verification and PR — Task 7 ✓
- Subtasks/timer follow block: automatic because `block_id` is stable and only `day_of_week`/`slot` change
- Out-of-scope items (DayView drag, WeekOverview drag, cross-week, keyboard) not addressed — as specified in the spec

### 2. Placeholder scan

No "TBD" / "TODO" / "handle edge cases" / vague references. All steps have exact SQL, TypeScript, or commands.

### 3. Type consistency

- `swapBlocks(idA: string, idB: string) => Promise<void>` used consistently in Task 2 (DB wrapper `swapBlocksInDb`), Task 3 (AppState method), Task 5 (WeekGrid prop `onSwapBlocks`), Task 6 (page.tsx wiring). ✓
- `moveBlock(id: string, dayOfWeek: number, slot: number) => Promise<void>` used consistently across tasks 2-6. ✓
- `BlockCell` prop `dayOfWeek` and `slot` added in Task 4 and supplied in Task 5. ✓
- Droppable id format `slot-${day}-${slot}` used consistently in BlockCell (Task 4) and parsed in WeekGrid (Task 5). ✓
- Draggable id format `block-${id}` used consistently. ✓

All checks pass.
