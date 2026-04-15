# SidePanel Follows Selected Block — Design Spec

## Overview

Today, the dashboard tracks the open SidePanel by `(dayOfWeek, slot)`. When the user drag-drops a block to a different cell, the SidePanel content silently changes to whatever block now occupies the original cell — confusing.

Switch to tracking the panel by **block id** so the panel follows the block to its new cell after a swap or move. Empty cells (which have no id) keep position-based selection.

## Goals

- After a swap or move, SidePanel keeps showing the originally selected block at its new position
- Other blocks moving around does not affect the current selection
- Empty-cell editing still works (open SidePanel to add a new block to a slot)
- If the selected block disappears (e.g., week switch, future delete), the panel auto-closes

## Out of Scope

- A future "delete block" operation
- Multi-selection
- Visual indicator that "the panel followed the block" (no animation, just the existing accent outline already shows where it is)

---

## Selection Model

Replace the current `SelectedCell = { dayOfWeek; slot }` type with a discriminated union:

```typescript
type Selection =
  | { kind: "block"; blockId: string }
  | { kind: "empty"; dayOfWeek: number; slot: number };
```

### Selection rules

| User action | Resulting selection |
|-------------|---------------------|
| Click a filled cell | `{ kind: "block", blockId: <that block's id> }` |
| Click an empty cell | `{ kind: "empty", dayOfWeek, slot }` |
| Save a new block in an empty cell | After `saveBlock` resolves, switch to `{ kind: "block", blockId: <new id> }` so further interactions follow the block |
| Click X (close panel) | `null` |

### Derived values for SidePanel

```typescript
const selectedBlock =
  selection?.kind === "block"
    ? blocks.find((b) => b.id === selection.blockId) ?? null
    : null;

const selectedDayOfWeek =
  selection?.kind === "block"
    ? selectedBlock?.dayOfWeek ?? null
    : selection?.dayOfWeek ?? null;

const selectedSlot =
  selection?.kind === "block"
    ? selectedBlock?.slot ?? null
    : selection?.slot ?? null;
```

The grid's selected-outline reads `selectedDayOfWeek` and `selectedSlot`. After a swap, the block's dayOfWeek/slot change → outline moves automatically.

### Auto-close when selected block disappears

```typescript
useEffect(() => {
  if (selection?.kind === "block" && !blocks.find((b) => b.id === selection.blockId)) {
    setSelection(null);
  }
}, [selection, blocks]);
```

This handles:
- Week switch (different `weekKey` → `blocks` changes → no matching id → close)
- Future delete operations
- If the block somehow vanishes from local state for any reason

---

## SaveBlock Flow Update

Currently, when the user is editing an empty cell and saves:

1. Existing code calls `saveBlock(weekKey, dayOfWeek, slot, ...)` — this inserts and returns to local state
2. Side panel `selected` stays `{ kind: "empty", dayOfWeek, slot }`
3. After save, the empty cell now has a block, but selection still points by position

We need: after a successful save from an empty selection, switch the selection to the newly created block's id.

The current `saveBlock` returns `void`. We need to either:
- **A)** Make it return the saved block, then the page can update selection
- **B)** Use an effect that watches for "the empty cell now has a block, and selection is empty for that cell → switch to block selection"

**Option A** is cleaner. Update `saveBlock` to return `Promise<Block | void>` (returns block when authenticated, void in localStorage mode). The dashboard page does:

```typescript
const handleSaveBlock = async (title, description, blockType) => {
  if (!selection) return;
  const dayOfWeek =
    selection.kind === "block" ? selectedBlock!.dayOfWeek : selection.dayOfWeek;
  const slot =
    selection.kind === "block" ? selectedBlock!.slot : selection.slot;

  const saved = await saveBlock(weekKey, dayOfWeek, slot, title, description, blockType);
  if (saved && selection.kind === "empty") {
    setSelection({ kind: "block", blockId: saved.id });
  }
};
```

Local mode (no Supabase) — `saveBlock` writes to localStorage and the local state already includes the new block. Selection follow-up: in this case we can find the block by `(weekKey, dayOfWeek, slot)` after the save resolves and switch selection to its id.

To keep the surface tidy, the dashboard's `handleSaveBlock` can do:

```typescript
await saveBlock(...);
if (selection?.kind === "empty") {
  // Find the new block by position (always set after saveBlock returns, in both modes)
  const newBlock = getBlocksForWeek(weekKey).find(
    (b) => b.dayOfWeek === dayOfWeek && b.slot === slot,
  );
  if (newBlock) setSelection({ kind: "block", blockId: newBlock.id });
}
```

But there's a stale closure problem — `getBlocksForWeek` returns the snapshot from when handleSaveBlock was created. In React, by the time the await resolves, the state might not have updated yet because saveBlock's optimistic update is batched.

**Cleanest approach:** Make `saveBlock` return the block (in both modes). It already has the new block object internally — just return it.

---

## Affected Files

| File | Change |
|------|--------|
| `src/app/page.tsx` | `Selection` type, `selection` state, `handleBlockClick`, `handleSaveBlock`, `handleStatusChange`, `handleSaveDiary`, `selectedDayOfWeek`/`selectedSlot` derivation, auto-close effect |
| `src/presentation/providers/app-state-provider.tsx` | `saveBlock` returns the saved/updated `Block` (both Supabase and localStorage paths) |
| (No other files need changes) | SidePanel still receives `dayOfWeek`/`slot`/`block` props; its rendering doesn't care how selection works upstream |

No new files. No DB migration. No new tests required for the selection logic itself (it's integration behavior best verified manually). Existing tests stay the same since they don't test the selection model.

---

## Manual Verification

- Click block A → side panel opens for A
- Drag A onto B (swap) → side panel still shows A, now positioned at B's old cell. Selected outline moved with A.
- Drag a non-selected block C onto D → A still selected, no change to side panel
- Click an empty cell → side panel opens with empty editor → fill and save → side panel transitions to showing the newly created block (selection now follows id)
- Switch to next week → side panel closes (selected block id not in new week's blocks)
- Click block A → click X to close → side panel disappears

---

## Branch

`feature/sidepanel-follow-block` (already created).
