import type { Block } from "@/domain/entities/block";
import { parseRhythmBlockId } from "@/domain/usecases/project-rhythm-onto-week";

/** What the side panel is showing: a block, or an empty slot to fill. */
export type Selection =
  | { kind: "block"; blockId: string }
  | { kind: "empty"; dayOfWeek: number; slot: number };

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
