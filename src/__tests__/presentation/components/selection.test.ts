import { describe, it, expect } from "vitest";
import {
  daySelection,
  reconcileSelection,
  selectionAfterClick,
} from "@/presentation/components/dashboard/selection";
import type { Selection } from "@/presentation/components/dashboard/selection";
import { rhythmBlockId } from "@/domain/usecases/project-rhythm-onto-week";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";

const WEEK = "2026-09-07";

function block(id: string, dayOfWeek = 3, slot = 2) {
  return createBlock({
    id,
    weekPlanId: WEEK,
    dayOfWeek,
    slot,
    blockType: BlockType.Core,
    title: "",
    description: "",
    status: BlockStatus.Planned,
  });
}

describe("reconcileSelection", () => {
  it("keeps a selected block that is still there", () => {
    const selection: Selection = { kind: "block", blockId: "b1" };
    expect(reconcileSelection(selection, [block("b1")], WEEK)).toBe(selection);
  });

  it("keeps an empty-slot selection as it is", () => {
    const selection: Selection = { kind: "empty", dayOfWeek: 1, slot: 1 };
    expect(reconcileSelection(selection, [], WEEK)).toBe(selection);
  });

  it("closes the panel when a selected block is gone", () => {
    expect(
      reconcileSelection({ kind: "block", blockId: "b1" }, [], WEEK),
    ).toBeNull();
  });

  it("follows a rhythm cell to the real block that replaced it", () => {
    const selection: Selection = {
      kind: "block",
      blockId: rhythmBlockId(WEEK, 3, 2),
    };
    expect(reconcileSelection(selection, [block("real", 3, 2)], WEEK)).toEqual({
      kind: "block",
      blockId: "real",
    });
  });

  it("does not follow a rhythm cell from another week", () => {
    const selection: Selection = {
      kind: "block",
      blockId: rhythmBlockId("2026-08-31", 3, 2),
    };
    expect(
      reconcileSelection(selection, [block("real", 3, 2)], WEEK),
    ).toBeNull();
  });

  it("keeps a range selection as it is", () => {
    const selection = daySelection(2);
    expect(reconcileSelection(selection, [], WEEK)).toBe(selection);
  });
});

describe("selectionAfterClick", () => {
  const at = (dayOfWeek: number, slot: number) => ({ dayOfWeek, slot });

  it("selects the clicked block or empty slot on a plain click", () => {
    const blocks = [block("b1", 3, 2)];
    expect(selectionAfterClick(null, blocks, at(3, 2), false)).toEqual({
      kind: "block",
      blockId: "b1",
    });
    expect(selectionAfterClick(null, blocks, at(4, 1), false)).toEqual({
      kind: "empty",
      dayOfWeek: 4,
      slot: 1,
    });
  });

  it("extends from the selected block to a rectangle on Shift+click", () => {
    const next = selectionAfterClick(
      { kind: "block", blockId: "b1" },
      [block("b1", 1, 2)],
      at(5, 2),
      true,
    );
    expect(next).toMatchObject({ kind: "range", anchor: at(1, 2) });
    expect(next.kind === "range" && next.slots).toHaveLength(5);
  });

  it("keeps the original anchor when a range is extended again", () => {
    const first = selectionAfterClick(
      { kind: "empty", dayOfWeek: 1, slot: 1 },
      [],
      at(2, 2),
      true,
    );
    const second = selectionAfterClick(first, [], at(3, 3), true);
    expect(second).toMatchObject({ kind: "range", anchor: at(1, 1) });
    expect(second.kind === "range" && second.slots).toHaveLength(9);
  });

  it("treats Shift+click without a selection as a plain click", () => {
    expect(selectionAfterClick(null, [], at(2, 2), true)).toEqual({
      kind: "empty",
      dayOfWeek: 2,
      slot: 2,
    });
  });

  it("treats Shift+click on the selected slot itself as a plain click", () => {
    const selection = { kind: "empty", dayOfWeek: 2, slot: 2 } as const;
    expect(selectionAfterClick(selection, [], at(2, 2), true)).toEqual(
      selection,
    );
  });
});

describe("daySelection", () => {
  it("is the whole day, anchored at its first slot", () => {
    const selection = daySelection(6);
    expect(selection).toMatchObject({
      kind: "range",
      anchor: { dayOfWeek: 6, slot: 1 },
    });
    expect(selection.kind === "range" && selection.slots).toHaveLength(6);
  });
});
