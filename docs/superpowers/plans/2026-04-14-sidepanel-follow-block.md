# SidePanel Follows Selected Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the SidePanel follow the selected block to its new cell after a swap or move, instead of staying tied to a fixed `(dayOfWeek, slot)` position.

**Architecture:** Replace `SelectedCell = { dayOfWeek; slot }` with a discriminated union `Selection = { kind: "block"; blockId } | { kind: "empty"; dayOfWeek; slot }`. Position is derived from the block when the selection is by id. `saveBlock` returns the saved block so the dashboard can transition empty→block selection after creating a new block. An effect auto-closes the panel when the selected block disappears (e.g. on week switch).

**Tech Stack:** TypeScript (strict), React, Next.js. No DB or test changes.

---

## File Structure

```
src/
  app/
    page.tsx                                                            (modify)
  presentation/
    providers/
      app-state-provider.tsx                                            (modify: saveBlock returns Block)
```

No new files. No tests added (the change is an integration behavior best verified manually; unit tests for selection model would over-couple to internals).

---

## Task 1: Update saveBlock to Return the Saved Block

**Files:**
- Modify: `src/presentation/providers/app-state-provider.tsx`

- [ ] **Step 1: Update AppState interface signature**

In `src/presentation/providers/app-state-provider.tsx`, find the `AppState` interface. Replace the `saveBlock` field:

```typescript
  saveBlock: (
    weekKey: string,
    dayOfWeek: number,
    slot: number,
    title: string,
    description: string,
    blockType: BlockType,
  ) => Block;
```

(Was `=> void`. Now `=> Block`.)

- [ ] **Step 2: Update implementation to return the block**

Find the `saveBlock = useCallback(...)` definition. Replace its entire body with:

```typescript
  const saveBlock = useCallback(
    (
      weekKey: string,
      dayOfWeek: number,
      slot: number,
      title: string,
      description: string,
      blockType: BlockType,
    ): Block => {
      const newBlockData = {
        weekPlanId: weekKey,
        dayOfWeek,
        slot,
        blockType,
        title,
        description,
      };

      if (user) {
        // Optimistic update to Supabase state — compute the resulting block
        let resultBlock: Block | null = null;
        setSupaBlocks((prev) => {
          const existing = prev.find(
            (b) =>
              b.weekPlanId === weekKey &&
              b.dayOfWeek === dayOfWeek &&
              b.slot === slot,
          );
          if (existing) {
            const updated = createBlock({
              ...existing,
              title,
              description,
              blockType,
            });
            resultBlock = updated;
            return prev.map((b) => (b.id === existing.id ? updated : b));
          }
          const created = createBlock({
            id: crypto.randomUUID(),
            ...newBlockData,
            status: BlockStatus.Planned,
          });
          resultBlock = created;
          return [...prev, created];
        });

        upsertBlock(
          user.id,
          weekKey,
          dayOfWeek,
          slot,
          blockType,
          title,
          description,
        )
          .then((saved) => {
            setSupaBlocks((prev) =>
              prev.map((b) =>
                b.weekPlanId === weekKey &&
                b.dayOfWeek === dayOfWeek &&
                b.slot === slot
                  ? saved
                  : b,
              ),
            );
          })
          .catch((err) => {
            console.error(err);
            notify.error("區塊儲存失敗");
          });

        // resultBlock is set synchronously inside the setSupaBlocks updater
        return resultBlock!;
      } else {
        // Local mode: update localStorage directly
        const current = loadFromStorage();
        const existing = current.blocks.find(
          (b) =>
            b.weekPlanId === weekKey &&
            b.dayOfWeek === dayOfWeek &&
            b.slot === slot,
        );
        let resultBlock: Block;
        if (existing) {
          resultBlock = createBlock({
            ...existing,
            title,
            description,
            blockType,
          });
          current.blocks = current.blocks.map((b) =>
            b.id === existing.id ? resultBlock : b,
          );
        } else {
          resultBlock = createBlock({
            id: crypto.randomUUID(),
            ...newBlockData,
            status: BlockStatus.Planned,
          });
          current.blocks.push(resultBlock);
        }
        saveToStorage(current);
        return resultBlock;
      }
    },
    [user, notify],
  );
```

Key changes:
- Function signature returns `Block`
- Both branches capture the resulting block in `resultBlock` and return it
- The Supabase branch uses `setSupaBlocks` updater function but assigns to a closure variable inside (React invokes the updater synchronously during state set, so `resultBlock` is populated before the function returns)

- [ ] **Step 3: Run checks**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: lint and tests pass. Type-check will fail in `page.tsx` because `handleSaveBlock` doesn't yet capture the return value — that's expected and fixed in Task 2.

If type-check shows ONLY errors in `src/app/page.tsx` related to `saveBlock` return type, proceed. If errors elsewhere, stop and investigate.

- [ ] **Step 4: Don't commit yet** — Task 2 fixes the consumer.

---

## Task 2: Refactor Dashboard Selection to Use Discriminated Union

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the SelectedCell type and selection state**

In `src/app/page.tsx`, find:

```typescript
interface SelectedCell {
  dayOfWeek: number;
  slot: number;
}
```

Replace with:

```typescript
type Selection =
  | { kind: "block"; blockId: string }
  | { kind: "empty"; dayOfWeek: number; slot: number };
```

Find the state declaration:

```typescript
const [selected, setSelected] = useState<SelectedCell | null>(null);
```

Replace with:

```typescript
const [selection, setSelection] = useState<Selection | null>(null);
```

(Renamed `selected` → `selection`.)

- [ ] **Step 2: Update handleBlockClick**

Find:

```typescript
  const handleBlockClick = (dayOfWeek: number, slot: number) => {
    setSelected({ dayOfWeek, slot });
  };
```

Replace with:

```typescript
  const handleBlockClick = (dayOfWeek: number, slot: number) => {
    const block = blocks.find(
      (b) => b.dayOfWeek === dayOfWeek && b.slot === slot,
    );
    if (block) {
      setSelection({ kind: "block", blockId: block.id });
    } else {
      setSelection({ kind: "empty", dayOfWeek, slot });
    }
  };
```

- [ ] **Step 3: Replace selectedBlock derivation**

Find:

```typescript
  const selectedBlock = selected
    ? (blocks.find(
        (b) => b.dayOfWeek === selected.dayOfWeek && b.slot === selected.slot,
      ) ?? null)
    : null;
```

Replace with:

```typescript
  const selectedBlock =
    selection?.kind === "block"
      ? (blocks.find((b) => b.id === selection.blockId) ?? null)
      : null;

  const selectedDayOfWeek =
    selection?.kind === "block"
      ? (selectedBlock?.dayOfWeek ?? null)
      : (selection?.dayOfWeek ?? null);

  const selectedSlot =
    selection?.kind === "block"
      ? (selectedBlock?.slot ?? null)
      : (selection?.slot ?? null);
```

- [ ] **Step 4: Add auto-close effect**

After the existing `useEffect` blocks (e.g. after the timer-tick effect), add:

```typescript
  // Auto-close panel if the selected block no longer exists
  // (happens on week switch or if a block is removed for any reason)
  useEffect(() => {
    if (
      selection?.kind === "block" &&
      !blocks.find((b) => b.id === selection.blockId)
    ) {
      setSelection(null);
    }
  }, [selection, blocks]);
```

- [ ] **Step 5: Update handleSaveBlock**

Find:

```typescript
  const handleSaveBlock = (
    title: string,
    description: string,
    blockType: BlockType,
  ) => {
    if (!selected) return;
    saveBlock(
      weekKey,
      selected.dayOfWeek,
      selected.slot,
      title,
      description,
      blockType,
    );
  };
```

Replace with:

```typescript
  const handleSaveBlock = (
    title: string,
    description: string,
    blockType: BlockType,
  ) => {
    if (!selection) return;
    const day =
      selection.kind === "block"
        ? selectedBlock?.dayOfWeek
        : selection.dayOfWeek;
    const slot =
      selection.kind === "block" ? selectedBlock?.slot : selection.slot;
    if (day == null || slot == null) return;

    const saved = saveBlock(weekKey, day, slot, title, description, blockType);

    if (selection.kind === "empty") {
      setSelection({ kind: "block", blockId: saved.id });
    }
  };
```

- [ ] **Step 6: Update handleStatusChange**

The existing code already uses `selectedBlock`, no change needed:

```typescript
  const handleStatusChange = (status: BlockStatus) => {
    if (!selectedBlock) return;
    updateStatus(selectedBlock.id, status);
  };
```

(Verify it still reads correctly. No edit needed.)

- [ ] **Step 7: Update handleSaveDiary**

Find:

```typescript
  const handleSaveDiary = (bad: string, good: string, next: string) => {
    if (!selected) return;
    const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
    saveDiary(dateKey, bad, good, next);
  };
```

Replace with:

```typescript
  const handleSaveDiary = (bad: string, good: string, next: string) => {
    if (selectedDayOfWeek == null) return;
    const dateKey = formatDateKey(weekStart, selectedDayOfWeek);
    saveDiary(dateKey, bad, good, next);
  };
```

- [ ] **Step 8: Update the diary loading effect**

Find:

```typescript
  useEffect(() => {
    if (selected) {
      const dateKey = formatDateKey(weekStart, selected.dayOfWeek);
      loadDiary(dateKey);
    }
  }, [selected, weekStart, loadDiary]);
```

Replace with:

```typescript
  useEffect(() => {
    if (selectedDayOfWeek != null) {
      const dateKey = formatDateKey(weekStart, selectedDayOfWeek);
      loadDiary(dateKey);
    }
  }, [selectedDayOfWeek, weekStart, loadDiary]);
```

- [ ] **Step 9: Update WeekGrid props**

Find:

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

Replace with:

```tsx
            <WeekGrid
              blocks={blocks}
              selectedDayOfWeek={selectedDayOfWeek}
              selectedSlot={selectedSlot}
              onBlockClick={handleBlockClick}
              onSwapBlocks={swapBlocks}
              onMoveBlock={moveBlock}
            />
```

- [ ] **Step 10: Update DayView props**

Find:

```tsx
              <DayView
                dayOfWeek={mobileDay}
                blocks={blocks}
                selectedDayOfWeek={selected?.dayOfWeek ?? null}
                selectedSlot={selected?.slot ?? null}
```

Replace the two selected lines with:

```tsx
                selectedDayOfWeek={selectedDayOfWeek}
                selectedSlot={selectedSlot}
```

(Keep `dayOfWeek={mobileDay}` and `blocks={blocks}` as they are.)

- [ ] **Step 11: Update SidePanel rendering**

Find the existing block:

```tsx
        {selected && (
          <SidePanel
            dayOfWeek={selected.dayOfWeek}
            slot={selected.slot}
            block={selectedBlock}
            diaryLines={getDiary(formatDateKey(weekStart, selected.dayOfWeek))}
            isToday={isTodayInWeek(weekStart, selected.dayOfWeek)}
            ...
            onClose={() => setSelected(null)}
          />
        )}
```

Replace with:

```tsx
        {selection && selectedDayOfWeek != null && selectedSlot != null && (
          <SidePanel
            dayOfWeek={selectedDayOfWeek}
            slot={selectedSlot}
            block={selectedBlock}
            diaryLines={getDiary(formatDateKey(weekStart, selectedDayOfWeek))}
            isToday={isTodayInWeek(weekStart, selectedDayOfWeek)}
            subtasks={
              selectedBlock ? getSubtasksForBlock(selectedBlock.id) : []
            }
            elapsedSeconds={
              selectedBlock
                ? getElapsedSeconds(selectedBlock.id, new Date())
                : 0
            }
            isTimerActive={
              !!(selectedBlock && activeTimer?.blockId === selectedBlock.id)
            }
            otherBlockIsActive={
              !!activeTimer &&
              !!selectedBlock &&
              activeTimer.blockId !== selectedBlock.id
            }
            onSaveBlock={handleSaveBlock}
            onStatusChange={handleStatusChange}
            onSaveDiary={handleSaveDiary}
            onAddSubtask={(title) => {
              if (selectedBlock) addSubtask(selectedBlock.id, title);
            }}
            onEditSubtask={editSubtask}
            onToggleSubtask={toggleSubtask}
            onDeleteSubtask={deleteSubtask}
            onReorderSubtasks={(orderedIds) => {
              if (selectedBlock) reorderSubtasks(selectedBlock.id, orderedIds);
            }}
            onStartTimer={() => {
              if (selectedBlock) startTimer(selectedBlock.id);
            }}
            onStopTimer={() => {
              stopTimer();
            }}
            onAddManualTimer={(s, e) => {
              if (selectedBlock) addManualTimer(selectedBlock.id, s, e);
            }}
            onClearTimer={() => {
              if (selectedBlock) clearTimer(selectedBlock.id);
            }}
            onClose={() => setSelection(null)}
          />
        )}
```

(All instances of `selected.dayOfWeek` → `selectedDayOfWeek`, `selected.slot` → `selectedSlot`, `setSelected(null)` → `setSelection(null)`.)

- [ ] **Step 12: Update FloatingChecklistButton's rightOffset**

Find:

```tsx
            rightOffset={selected ? "336px" : "16px"}
```

Replace with:

```tsx
            rightOffset={selection ? "336px" : "16px"}
```

- [ ] **Step 13: Run full quality check**

```bash
pnpm lint && pnpm type-check && pnpm test
```

Expected: all pass.

- [ ] **Step 14: Commit Tasks 1 and 2 together**

```bash
git add src/app/page.tsx src/presentation/providers/app-state-provider.tsx
git commit -m "feat: side panel follows selected block across swap/move"
```

---

## Task 3: Verify, Format, Push, Open PR

- [ ] **Step 1: Format**

```bash
pnpm format
```

- [ ] **Step 2: Final quality check**

```bash
pnpm lint && pnpm type-check && pnpm format:check && pnpm test
```

Expected: all pass.

- [ ] **Step 3: Commit format changes if any**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: format sidepanel-follow-block files"
```

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Verify in a browser (logged-in user, with a few blocks):

- Click block A → side panel opens for A
- Long-press drag A onto another filled block B → side panel still shows A's content, accent outline moved with A
- Drag a non-selected block C onto D → A still selected, no visible change to side panel
- Click an empty cell → side panel opens with empty editor (default General type, blank title)
- Fill in title and click 儲存 → side panel transitions to showing the newly created block (selected outline is at that cell, panel shows StatusToggle and other block-only sections)
- Switch to next week (a week without that block) → side panel auto-closes
- Click block → click X → panel closes

- [ ] **Step 5: Push**

```bash
git push -u origin feature/sidepanel-follow-block
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "feat: side panel follows selected block across swap/move" --body "$(cat <<'EOF'
## Summary

- Replace position-based selection with discriminated union (`{ kind: "block"; blockId } | { kind: "empty"; ... }`)
- Side panel follows the originally selected block when it moves via swap/drag
- Empty-cell selection still works (position-based)
- After saving a new block from an empty selection, selection transitions to the new block id
- Selected block disappearing (e.g., week switch) auto-closes the panel
- `saveBlock` now returns the saved `Block` so the dashboard can pick up the new id

## Test plan

- [ ] Click block, drag to swap → panel keeps showing same block at new position
- [ ] Drag a different block while one is selected → no change to selection
- [ ] Click empty cell → fill title → save → panel transitions to showing the new block
- [ ] Switch week → panel auto-closes
- [ ] Click X → panel closes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

- Discriminated union `Selection` type — Task 2, Step 1 ✓
- `selectedBlock` derived from blockId — Task 2, Step 3 ✓
- `selectedDayOfWeek` and `selectedSlot` derived (used for position-dependent UI) — Task 2, Step 3 ✓
- `handleBlockClick` creates appropriate Selection variant — Task 2, Step 2 ✓
- `handleSaveBlock` transitions empty→block selection — Task 2, Step 5 ✓
- `handleSaveDiary` uses derived `selectedDayOfWeek` — Task 2, Step 7 ✓
- Diary loading effect uses derived day — Task 2, Step 8 ✓
- WeekGrid / DayView / SidePanel / FloatingChecklistButton all updated — Task 2, Steps 9, 10, 11, 12 ✓
- Auto-close on missing selected block — Task 2, Step 4 ✓
- `saveBlock` returns `Block` (both modes) — Task 1 ✓

### 2. Placeholder scan

No "TBD" / "TODO" / vague references. All steps have concrete code or commands.

### 3. Type consistency

- `Selection` type definition matches usage in all consumers (`selection.kind`, `selection.blockId`, `selection.dayOfWeek`, `selection.slot`).
- `selectedDayOfWeek` and `selectedSlot` are `number | null` consistently used in WeekGrid props (already accept `number | null | undefined`), DayView props (same), and SidePanel rendering (guarded by `!= null` check).
- `saveBlock` return type `Block` matches existing import (`import type { Block } from "@/domain/entities/block"` is already in app-state-provider).
- `setSelection(null)` and `setSelection({ kind: ... })` match the state type `Selection | null`.

All checks pass.
