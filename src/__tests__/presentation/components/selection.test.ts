import { describe, it, expect } from "vitest";
import { reconcileSelection } from "@/presentation/components/dashboard/selection";
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
});
