import { describe, it, expect } from "vitest";
import {
  dominantDirection,
  weekTrajectory,
} from "@/domain/usecases/direction-trajectory";
import { createDirection } from "@/domain/entities/direction";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";

const WEEK = "2026-10-19";
const directions = [
  createDirection({
    id: "book",
    userId: "u1",
    position: 0,
    text: "寫一本書",
    titles: ["寫作"],
  }),
  createDirection({
    id: "body",
    userId: "u1",
    position: 1,
    text: "身體",
    titles: ["健身", "跑步"],
  }),
];

let n = 0;
function block(title: string, suppressed = false) {
  n += 1;
  return createBlock({
    id: `b${n}`,
    weekPlanId: WEEK,
    dayOfWeek: 1 + (n % 7),
    slot: 1 + (n % 6),
    blockType: BlockType.Core,
    title,
    description: "",
    status: BlockStatus.Planned,
    suppressed,
  });
}

describe("weekTrajectory", () => {
  it("counts blocks per direction by their activity", () => {
    const week = weekTrajectory(
      WEEK,
      [block("寫作"), block("寫作"), block("跑步"), block("健身")],
      directions,
    );
    expect(week.byDirection).toEqual({ book: 2, body: 2 });
    expect(week.untagged).toBe(0);
  });

  it("counts everything else, untitled blocks included, as untagged", () => {
    const week = weekTrajectory(WEEK, [block("上班"), block("")], directions);
    expect(week.untagged).toBe(2);
    expect(week.byDirection).toEqual({ book: 0, body: 0 });
  });

  it("ignores slots deliberately emptied that week", () => {
    const week = weekTrajectory(WEEK, [block("寫作", true)], directions);
    expect(week.byDirection.book).toBe(0);
    expect(week.untagged).toBe(0);
  });

  it("is all untagged without any direction", () => {
    const week = weekTrajectory(WEEK, [block("寫作")], []);
    expect(week).toEqual({ weekKey: WEEK, byDirection: {}, untagged: 1 });
  });
});

describe("dominantDirection", () => {
  it("is the direction with the most blocks", () => {
    expect(
      dominantDirection({
        weekKey: WEEK,
        byDirection: { book: 1, body: 3 },
        untagged: 9,
      }),
    ).toBe("body");
  });

  it("is none when no direction got a block", () => {
    expect(
      dominantDirection({
        weekKey: WEEK,
        byDirection: { book: 0 },
        untagged: 4,
      }),
    ).toBeNull();
  });
});
