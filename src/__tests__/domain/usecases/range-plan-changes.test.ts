import { describe, it, expect } from "vitest";
import {
  rangeNeedsReason,
  rangePlanChanges,
} from "@/domain/usecases/range-plan-changes";
import { slotRange } from "@/domain/usecases/slot-range";

// Wednesday (3) is today; slot 2 on it already holds a block.
const TODAY = 3;
const base = {
  slots: slotRange({ dayOfWeek: 2, slot: 2 }, { dayOfWeek: 4, slot: 3 }),
  isLocked: (dayOfWeek: number) => dayOfWeek === TODAY,
  isOccupied: (p: { dayOfWeek: number; slot: number }) =>
    p.dayOfWeek === TODAY && p.slot === 2,
};

describe("rangePlanChanges", () => {
  it("logs only the slots on the locked day", () => {
    const changes = rangePlanChanges({ ...base, reason: "會議改期" });
    expect(changes.map((c) => c.dayOfWeek)).toEqual([TODAY, TODAY]);
  });

  it("gives renamed blocks the reason and filled slots none", () => {
    expect(rangePlanChanges({ ...base, reason: "會議改期" })).toEqual([
      { dayOfWeek: TODAY, slot: 2, action: "edit", reason: "會議改期" },
      { dayOfWeek: TODAY, slot: 3, action: "add", reason: "" },
    ]);
  });

  it("logs nothing when the range avoids the locked day", () => {
    expect(
      rangePlanChanges({ ...base, isLocked: () => false, reason: "" }),
    ).toEqual([]);
  });
});

describe("rangeNeedsReason", () => {
  it("asks for a reason when a block on today would be renamed", () => {
    expect(rangeNeedsReason(base)).toBe(true);
  });

  it("does not ask when today's slots in the range are all empty", () => {
    expect(rangeNeedsReason({ ...base, isOccupied: () => false })).toBe(false);
  });
});
