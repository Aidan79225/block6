import { describe, it, expect } from "vitest";
import {
  projectRhythmOntoWeek,
  rhythmBlockId,
  isRhythmBlockId,
  parseRhythmBlockId,
} from "@/domain/usecases/project-rhythm-onto-week";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";
import type { RhythmSlot } from "@/domain/entities/rhythm-slot";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";

const WEEK = "2026-08-24";

function rhythm(
  dayOfWeek: number,
  slot: number,
  overrides: Partial<RhythmSlot> = {},
): RhythmSlot {
  return createRhythmSlot({
    id: `r-${dayOfWeek}-${slot}`,
    userId: "u1",
    dayOfWeek,
    slot,
    blockType: BlockType.Core,
    title: "深度工作",
    description: "",
    ...overrides,
  });
}

function block(
  dayOfWeek: number,
  slot: number,
  overrides: Partial<Block> = {},
): Block {
  return createBlock({
    id: `b-${dayOfWeek}-${slot}`,
    weekPlanId: WEEK,
    dayOfWeek,
    slot,
    blockType: BlockType.General,
    title: "本週特例",
    description: "",
    status: BlockStatus.Planned,
    ...overrides,
  });
}

function project(input: {
  rhythm?: RhythmSlot[];
  overrides?: Block[];
  applyRhythm?: boolean;
}) {
  return projectRhythmOntoWeek({
    rhythm: input.rhythm ?? [],
    overrides: input.overrides ?? [],
    weekKey: WEEK,
    applyRhythm: input.applyRhythm ?? true,
  });
}

describe("rhythm block ids", () => {
  it("round-trips the week, day and slot", () => {
    const id = rhythmBlockId(WEEK, 3, 5);
    expect(isRhythmBlockId(id)).toBe(true);
    expect(parseRhythmBlockId(id)).toEqual({
      weekKey: WEEK,
      dayOfWeek: 3,
      slot: 5,
    });
  });

  it("keeps the same slot distinct across weeks", () => {
    expect(rhythmBlockId("2026-08-24", 3, 5)).not.toBe(
      rhythmBlockId("2026-08-31", 3, 5),
    );
  });

  it("does not claim real block ids", () => {
    const realId = "6f1c9a2e-0000-4000-8000-000000000000";
    expect(isRhythmBlockId(realId)).toBe(false);
    expect(parseRhythmBlockId(realId)).toBeNull();
  });
});

describe("projectRhythmOntoWeek", () => {
  it("fills empty slots from the rhythm", () => {
    const result = project({ rhythm: [rhythm(1, 1), rhythm(2, 3)] });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      dayOfWeek: 1,
      slot: 1,
      title: "深度工作",
      blockType: BlockType.Core,
      status: BlockStatus.Planned,
    });
    expect(isRhythmBlockId(result[0].id)).toBe(true);
  });

  it("lets a stored block win over the rhythm for the same slot", () => {
    const result = project({
      rhythm: [rhythm(1, 1)],
      overrides: [block(1, 1)],
    });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("本週特例");
    expect(isRhythmBlockId(result[0].id)).toBe(false);
  });

  it("leaves a suppressed slot empty instead of refilling it", () => {
    const result = project({
      rhythm: [rhythm(3, 2)],
      overrides: [block(3, 2, { suppressed: true })],
    });
    expect(result).toEqual([]);
  });

  it("hides suppressed blocks even with no rhythm at all", () => {
    const result = project({
      overrides: [block(3, 2, { suppressed: true }), block(3, 3)],
    });
    expect(result).toHaveLength(1);
    expect(result[0].slot).toBe(3);
  });

  it("does not project onto a past week", () => {
    const result = project({
      rhythm: [rhythm(1, 1), rhythm(2, 2)],
      overrides: [block(4, 4)],
      applyRhythm: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0].dayOfWeek).toBe(4);
  });

  it("still hides suppressed blocks on a past week", () => {
    const result = project({
      overrides: [block(4, 4, { suppressed: true })],
      applyRhythm: false,
    });
    expect(result).toEqual([]);
  });

  it("tags projected blocks with the week they were projected onto", () => {
    const [projected] = project({ rhythm: [rhythm(1, 1)] });
    expect(projected.weekPlanId).toBe(WEEK);
  });

  it("returns an empty week when there is neither rhythm nor blocks", () => {
    expect(project({})).toEqual([]);
  });

  it("projects a full 42-slot rhythm", () => {
    const full: RhythmSlot[] = [];
    for (let d = 1; d <= 7; d++) {
      for (let s = 1; s <= 6; s++) full.push(rhythm(d, s));
    }
    expect(project({ rhythm: full })).toHaveLength(42);
  });
});
