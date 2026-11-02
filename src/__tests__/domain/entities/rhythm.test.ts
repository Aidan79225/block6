import { describe, it, expect } from "vitest";
import {
  adoptRhythm,
  createRhythm,
  latestRhythmSlots,
  rhythmSlotsForWeek,
} from "@/domain/entities/rhythm";
import type { Rhythm } from "@/domain/entities/rhythm";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";
import { BlockType } from "@/domain/entities/block";

function slot(title: string, dayOfWeek = 1, slotNo = 1) {
  return createRhythmSlot({
    dayOfWeek,
    slot: slotNo,
    blockType: BlockType.Core,
    title,
    description: "",
  });
}

function version(effectiveFrom: string, title: string): Rhythm {
  return createRhythm({
    id: `v-${effectiveFrom}`,
    userId: "u1",
    effectiveFrom,
    slots: [slot(title)],
  });
}

const history = [
  version("2026-08-31", "舊節奏"),
  version("2026-09-14", "新節奏"),
];

describe("createRhythm", () => {
  it("rejects two slots for the same day and slot", () => {
    expect(() =>
      createRhythm({
        id: "v",
        userId: "u1",
        effectiveFrom: "2026-08-31",
        slots: [slot("a"), slot("b")],
      }),
    ).toThrow("Duplicate rhythm slot 1-1");
  });
});

describe("rhythmSlotsForWeek", () => {
  it("gives a week before any rhythm nothing", () => {
    expect(rhythmSlotsForWeek(history, "2026-08-24")).toEqual([]);
  });

  it("gives a week the version that took effect on it", () => {
    expect(rhythmSlotsForWeek(history, "2026-08-31")[0].title).toBe("舊節奏");
  });

  it("keeps a past week on the version it was planned under", () => {
    expect(rhythmSlotsForWeek(history, "2026-09-07")[0].title).toBe("舊節奏");
  });

  it("switches to the newer version from the week it takes effect", () => {
    expect(rhythmSlotsForWeek(history, "2026-09-14")[0].title).toBe("新節奏");
    expect(rhythmSlotsForWeek(history, "2027-01-04")[0].title).toBe("新節奏");
  });

  it("does not depend on the order versions are stored in", () => {
    const reversed = [...history].reverse();
    expect(rhythmSlotsForWeek(reversed, "2026-09-07")[0].title).toBe("舊節奏");
  });
});

describe("latestRhythmSlots", () => {
  it("is the newest version, even before it takes effect", () => {
    expect(latestRhythmSlots(history)[0].title).toBe("新節奏");
  });

  it("is empty without any rhythm", () => {
    expect(latestRhythmSlots([])).toEqual([]);
  });
});

describe("adoptRhythm", () => {
  it("keeps older versions so past weeks stay as planned", () => {
    const next = adoptRhythm(history, version("2026-09-21", "第三版"));
    expect(next.map((v) => v.effectiveFrom)).toEqual([
      "2026-08-31",
      "2026-09-14",
      "2026-09-21",
    ]);
  });

  it("supersedes a version that has not taken effect yet", () => {
    const next = adoptRhythm(history, version("2026-09-14", "改主意"));
    expect(next).toHaveLength(2);
    expect(rhythmSlotsForWeek(next, "2026-09-14")[0].title).toBe("改主意");
  });

  it("supersedes versions starting after it too", () => {
    const next = adoptRhythm(history, version("2026-09-07", "提早"));
    expect(next.map((v) => v.effectiveFrom)).toEqual([
      "2026-08-31",
      "2026-09-07",
    ]);
  });
});
