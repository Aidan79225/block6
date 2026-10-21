import { describe, it, expect } from "vitest";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";

describe("Block", () => {
  it("creates a block with required fields", () => {
    const block = createBlock({
      id: "block-1",
      weekPlanId: "wp-1",
      dayOfWeek: 1,
      slot: 1,
      blockType: BlockType.Core,
      title: "專案開發",
      description: "完成 API 設計",
      status: BlockStatus.Planned,
    });
    expect(block.id).toBe("block-1");
    expect(block.weekPlanId).toBe("wp-1");
    expect(block.dayOfWeek).toBe(1);
    expect(block.slot).toBe(1);
    expect(block.blockType).toBe(BlockType.Core);
    expect(block.title).toBe("專案開發");
    expect(block.description).toBe("完成 API 設計");
    expect(block.status).toBe(BlockStatus.Planned);
  });

  it("rejects invalid dayOfWeek", () => {
    expect(() =>
      createBlock({
        id: "block-1",
        weekPlanId: "wp-1",
        dayOfWeek: 0,
        slot: 1,
        blockType: BlockType.Core,
        title: "Test",
        description: "",
        status: BlockStatus.Planned,
      }),
    ).toThrow("dayOfWeek must be between 1 and 7");
  });

  it("rejects invalid slot", () => {
    expect(() =>
      createBlock({
        id: "block-1",
        weekPlanId: "wp-1",
        dayOfWeek: 1,
        slot: 7,
        blockType: BlockType.Core,
        title: "Test",
        description: "",
        status: BlockStatus.Planned,
      }),
    ).toThrow("slot must be between 1 and 6");
  });
});
