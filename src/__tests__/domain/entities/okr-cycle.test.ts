import { describe, it, expect } from "vitest";
import { createOkrCycle } from "@/domain/entities/okr-cycle";

describe("OkrCycle", () => {
  const base = {
    id: "c-1",
    userId: "u-1",
    name: "2026 Q3",
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-09-30"),
    createdAt: new Date(),
  };

  it("creates a cycle", () => {
    const cycle = createOkrCycle(base);
    expect(cycle.name).toBe("2026 Q3");
    expect(cycle.userId).toBe("u-1");
  });

  it("rejects blank name", () => {
    expect(() => createOkrCycle({ ...base, name: "  " })).toThrow(
      "OkrCycle name is required",
    );
  });

  it("rejects endDate not after startDate", () => {
    expect(() =>
      createOkrCycle({ ...base, endDate: new Date("2026-07-01") }),
    ).toThrow("endDate must be after startDate");
  });
});
