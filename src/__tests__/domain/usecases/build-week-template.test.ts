import { describe, it, expect } from "vitest";
import {
  buildWeekTemplate,
  getTemplateBlockType,
} from "@/domain/usecases/build-week-template";
import { BlockType } from "@/domain/entities/block";

describe("getTemplateBlockType", () => {
  it("gives weekdays the weekday rhythm", () => {
    expect(getTemplateBlockType(1, 1)).toBe(BlockType.Core);
    expect(getTemplateBlockType(5, 6)).toBe(BlockType.Rest);
  });

  it("gives weekends a rest-first rhythm", () => {
    expect(getTemplateBlockType(6, 1)).toBe(BlockType.Rest);
    expect(getTemplateBlockType(7, 1)).toBe(BlockType.Rest);
  });

  it("rejects out-of-range days and slots", () => {
    expect(() => getTemplateBlockType(0, 1)).toThrow();
    expect(() => getTemplateBlockType(8, 1)).toThrow();
    expect(() => getTemplateBlockType(1, 0)).toThrow();
    expect(() => getTemplateBlockType(1, 7)).toThrow();
  });
});

describe("buildWeekTemplate", () => {
  it("fills all 42 slots when the week is empty", () => {
    expect(buildWeekTemplate()).toHaveLength(42);
  });

  it("skips slots that already hold a block", () => {
    const result = buildWeekTemplate([
      { dayOfWeek: 1, slot: 1 },
      { dayOfWeek: 3, slot: 4 },
    ]);
    expect(result).toHaveLength(40);
    expect(
      result.find((s) => s.dayOfWeek === 1 && s.slot === 1),
    ).toBeUndefined();
    expect(
      result.find((s) => s.dayOfWeek === 3 && s.slot === 4),
    ).toBeUndefined();
  });

  it("returns nothing when the week is full", () => {
    const occupied = [];
    for (let d = 1; d <= 7; d++) {
      for (let s = 1; s <= 6; s++) occupied.push({ dayOfWeek: d, slot: s });
    }
    expect(buildWeekTemplate(occupied)).toEqual([]);
  });

  it("returns slots in day-then-slot order", () => {
    const result = buildWeekTemplate();
    expect(result[0]).toMatchObject({ dayOfWeek: 1, slot: 1 });
    expect(result[6]).toMatchObject({ dayOfWeek: 2, slot: 1 });
    expect(result[41]).toMatchObject({ dayOfWeek: 7, slot: 6 });
  });

  it("keeps the daily golden ratio of 3 core to 2 flexible to 1 rest", () => {
    const monday = buildWeekTemplate().filter((s) => s.dayOfWeek === 1);
    const count = (t: BlockType) =>
      monday.filter((s) => s.blockType === t).length;
    expect(count(BlockType.Core)).toBe(3);
    expect(count(BlockType.General) + count(BlockType.Buffer)).toBe(2);
    expect(count(BlockType.Rest)).toBe(1);
  });
});
