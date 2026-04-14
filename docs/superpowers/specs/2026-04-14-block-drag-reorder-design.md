# Block Drag-and-Drop Reorder — Design Spec

## Overview

Add long-press drag-and-drop reordering to the desktop WeekGrid. Users can press and hold a block for 500 ms to pick it up, then drop it on another cell to swap positions. Dropping on an empty cell moves the block there.

## Goals

- Let users quickly rearrange their week without re-typing block details
- The block's subtasks and timer sessions travel with it (single source of truth: they relate to the block by `block_id`, which stays stable)
- No conflict with the existing short-click-to-open-SidePanel interaction

## Out of Scope

- Drag-and-drop on the mobile DayView (6 vertical cards) — future enhancement
- Drag-and-drop on WeekOverview (16px cells too small to grab)
- Cross-week dragging (moving a block from last week to this week)
- Keyboard-based reorder (dnd-kit supports it but not an MVP need)

---

## Interaction Summary

| Action | Result |
|--------|--------|
| Click on a cell (< 500 ms) | Opens SidePanel (existing behavior, unchanged) |
| Press and hold for 500 ms | Enters drag mode; ghost element follows pointer |
| Drop on another block | Swap the two blocks' positions (their rows' `day_of_week` + `slot` get swapped; `block_id`s are unchanged, so subtasks and sessions follow automatically) |
| Drop on an empty cell | Move the block there (single-row update) |
| Release without moving / outside grid | Drag cancels, no changes |
| Drop on the same cell (no change) | No-op |

The hover target is highlighted with a dashed 2 px accent outline (`var(--color-accent)`).

---

## Data Model

### No schema-level changes except a constraint relaxation

The existing `blocks` table has `UNIQUE(week_plan_id, day_of_week, slot)`. Swapping two rows would transiently violate it. We relax this to a **deferred** unique so Postgres checks it only at commit time — a single transaction can update both rows without intermediate conflicts.

Migration `supabase/migrations/004_swap_blocks.sql`:

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

RLS is honored because `security invoker` runs the function under the caller's identity. The caller's RLS policies on `blocks` still gate the UPDATE statements inside.

### Subtasks and timer sessions

Unchanged. Their FKs point to `blocks.id`, which is stable across the swap — they follow the block automatically.

---

## Frontend

### Library

Reuse `@dnd-kit/core` (already installed for subtask reorder).

### Sensor configuration

Single `PointerSensor` with:

```typescript
activationConstraint: { delay: 500, tolerance: 5 }
```

- `delay: 500` → 500 ms long-press to activate
- `tolerance: 5` → 5 px movement tolerance during the delay (accommodates hand jitter)

### Draggable/droppable IDs

- Draggable id for a block: `block-${block.id}`
- Droppable id for every cell (both filled and empty): `slot-${dayOfWeek}-${slot}`

Empty cells are droppable-only (not draggable). Filled cells are both draggable and droppable — dropping block A on block B resolves to a swap.

### Drop resolution

In `onDragEnd`:

1. Parse `active.id` → extract source `blockId`
2. Parse `over.id` → extract target `dayOfWeek` and `slot`
3. If the target cell contains a block, call `swapBlocks(sourceId, targetBlockId)`
4. If the target cell is empty, call `moveBlock(sourceId, targetDay, targetSlot)`
5. If `active.id === over.id` or `over === null`, no-op

### Visual feedback

- **Dragging:** `<DragOverlay>` renders a semi-transparent clone of the source block following the pointer (dnd-kit provides the mechanics).
- **Hover target:** the cell the pointer is over gets a `2px dashed var(--color-accent)` outline with `outlineOffset: 1px`. Takes precedence over the `isSelected` solid outline during drag.
- **Source cell while dragging:** reduced opacity (0.4) so the user can tell what's being moved.

### Component changes

**`WeekGrid`**

- Wraps its grid in `<DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={...} onDragEnd={...}>`
- Tracks `activeBlockId` state for the DragOverlay
- Renders `<DragOverlay>` showing a ghost of the active block

**`BlockCell`**

- Calls `useDraggable({ id: "block-..." })` only if a block is present
- Calls `useDroppable({ id: "slot-..." })` always
- Spreads the draggable's `listeners` + `attributes` on the `button` (or a wrapper div)
- Reads `isOver` from `useDroppable` to apply the dashed outline
- Reads `isDragging` from `useDraggable` to apply reduced opacity on the source

### AppState additions

```typescript
swapBlocks: (idA: string, idB: string) => Promise<void>;
moveBlock: (id: string, targetDay: number, targetSlot: number) => Promise<void>;
```

Both are optimistic:

1. Update local `supaBlocks` state immediately (swap their `dayOfWeek`/`slot` fields, or reassign one)
2. Call Supabase (`rpc('swap_blocks', ...)` or `update blocks set ... where id = ...`)
3. On error, the notification shows; the data re-syncs on next `loadWeek` call

### Supabase wrappers

New functions in `src/infrastructure/supabase/database.ts`:

```typescript
export async function swapBlocksInDb(idA: string, idB: string): Promise<void>;
export async function moveBlockInDb(
  id: string,
  dayOfWeek: number,
  slot: number,
): Promise<void>;
```

`swapBlocksInDb` calls `supabase.rpc('swap_blocks', { block_a: idA, block_b: idB })`.
`moveBlockInDb` does a plain `update blocks set day_of_week, slot where id`.

---

## Architecture

```
supabase/migrations/004_swap_blocks.sql                                 (new)

src/
  infrastructure/
    supabase/
      database.ts                                                       (modify: add swap/move)
  presentation/
    providers/
      app-state-provider.tsx                                            (modify: add swapBlocks, moveBlock)
    components/
      week-grid/
        week-grid.tsx                                                   (modify: wrap in DndContext, DragOverlay)
        block-cell.tsx                                                  (modify: draggable/droppable + hover style)
    ...
  app/
    page.tsx                                                            (modify: pass swapBlocks/moveBlock handlers to WeekGrid)
```

---

## Testing

### Database
- Manual: run migration in Supabase Dashboard SQL Editor, then call the RPC from SQL console to verify it swaps two rows.

### Unit / use case
- `swapBlocks` optimistic update: two blocks' day/slot fields get exchanged in local state
- `moveBlock` optimistic update: single block's day/slot updates; no other blocks change

### Component
- `BlockCell` with `isOver=true` renders dashed accent outline (data-attribute check)

### Not tested (manual verification in dev)
- The 500 ms activation delay
- The actual drag animation (jsdom doesn't simulate pointer events well for dnd-kit)
- DragOverlay ghost

---

## Development Process

- Branch: `feature/block-drag-reorder` (already created)
- Migration needs to be run manually in Supabase Dashboard
- Standard commit conventions + PR to `master`
