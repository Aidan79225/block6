import type { Block } from "@/domain/entities/block";
import { parseRhythmBlockId } from "@/domain/usecases/project-rhythm-onto-week";
import {
  daySlots,
  slotRange,
  type SlotPosition,
} from "@/domain/usecases/slot-range";

/**
 * What the side panel is showing: a block, an empty slot to fill, or a range
 * of slots to name at once (`anchor` is where the range was started from).
 */
export type Selection =
  | { kind: "block"; blockId: string }
  | { kind: "empty"; dayOfWeek: number; slot: number }
  | { kind: "range"; anchor: SlotPosition; slots: SlotPosition[] };

/** The single slot a selection points at, or null for none or a range. */
function selectedPosition(
  selection: Selection | null,
  blocks: readonly Block[],
): SlotPosition | null {
  if (selection?.kind === "empty") return selection;
  if (selection?.kind !== "block") return null;
  return blocks.find((b) => b.id === selection.blockId) ?? null;
}

/**
 * The selection after clicking a slot. A plain click selects that slot;
 * Shift+click (`extend`) selects the rectangle from the current selection —
 * or from where the current range was started — to the clicked slot.
 */
export function selectionAfterClick(
  selection: Selection | null,
  blocks: readonly Block[],
  clicked: SlotPosition,
  extend: boolean,
): Selection {
  const anchor =
    selection?.kind === "range"
      ? selection.anchor
      : selectedPosition(selection, blocks);
  if (extend && anchor) {
    const slots = slotRange(anchor, clicked);
    if (slots.length > 1) return { kind: "range", anchor, slots };
  }
  const block = blocks.find(
    (b) => b.dayOfWeek === clicked.dayOfWeek && b.slot === clicked.slot,
  );
  return block
    ? { kind: "block", blockId: block.id }
    : { kind: "empty", dayOfWeek: clicked.dayOfWeek, slot: clicked.slot };
}

/** A whole day as a range, anchored at its first slot. */
export function daySelection(dayOfWeek: number): Selection {
  const slots = daySlots(dayOfWeek);
  return { kind: "range", anchor: slots[0], slots };
}

/**
 * The selection to keep after the week's blocks change. A selected block that
 * is gone closes the panel — except a rhythm cell, which gets a real id the
 * first time it is written to (a status, a subtask, a timer): the panel then
 * stays on the block now holding that slot.
 */
export function reconcileSelection(
  selection: Selection | null,
  blocks: readonly Block[],
  weekKey: string,
): Selection | null {
  if (selection?.kind !== "block") return selection;
  if (blocks.some((b) => b.id === selection.blockId)) return selection;

  const projected = parseRhythmBlockId(selection.blockId);
  const successor =
    projected?.weekKey === weekKey
      ? blocks.find(
          (b) =>
            b.dayOfWeek === projected.dayOfWeek && b.slot === projected.slot,
        )
      : undefined;
  return successor ? { kind: "block", blockId: successor.id } : null;
}
