import { describe, it, expect } from "vitest";
import {
  containsSlot,
  daySlots,
  slotRange,
} from "@/domain/usecases/slot-range";

describe("slotRange", () => {
  it("spans the rectangle between two corners, day by day", () => {
    expect(
      slotRange({ dayOfWeek: 1, slot: 2 }, { dayOfWeek: 2, slot: 3 }),
    ).toEqual([
      { dayOfWeek: 1, slot: 2 },
      { dayOfWeek: 1, slot: 3 },
      { dayOfWeek: 2, slot: 2 },
      { dayOfWeek: 2, slot: 3 },
    ]);
  });

  it("does not care which corner comes first", () => {
    expect(
      slotRange({ dayOfWeek: 5, slot: 4 }, { dayOfWeek: 1, slot: 2 }),
    ).toEqual(slotRange({ dayOfWeek: 1, slot: 2 }, { dayOfWeek: 5, slot: 4 }));
  });

  it("covers a whole row across the working week", () => {
    const row = slotRange({ dayOfWeek: 1, slot: 2 }, { dayOfWeek: 5, slot: 2 });
    expect(row).toHaveLength(5);
    expect(row.every((p) => p.slot === 2)).toBe(true);
  });

  it("is a single slot when both corners are the same", () => {
    const p = { dayOfWeek: 3, slot: 3 };
    expect(slotRange(p, p)).toEqual([p]);
  });
});

describe("daySlots", () => {
  it("is all six slots of the day", () => {
    expect(daySlots(6).map((p) => p.slot)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(daySlots(6).every((p) => p.dayOfWeek === 6)).toBe(true);
  });
});

describe("containsSlot", () => {
  it("tells whether a slot is inside a range", () => {
    const range = daySlots(2);
    expect(containsSlot(range, 2, 4)).toBe(true);
    expect(containsSlot(range, 3, 4)).toBe(false);
  });
});
