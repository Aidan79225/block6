import { describe, it, expect } from "vitest";
import { currentDiaryDay, diaryModeFor } from "@/domain/usecases/diary-window";
import { formatDateKey } from "@/lib/date-helpers";

// Wednesday 2026-10-21, 15:00. The week runs Mon 10-19 to Sun 10-25.
const WED_AFTERNOON = new Date(2026, 9, 21, 15, 0);
// Monday 2026-10-26 before and after 08:00.
const MON_EARLY = new Date(2026, 9, 26, 7, 30);
const MON_LATE = new Date(2026, 9, 26, 9, 0);

const day = (d: number) => new Date(2026, 9, d);

describe("diaryModeFor", () => {
  it("lets every day of this week so far be written", () => {
    expect(diaryModeFor(day(19), WED_AFTERNOON)).toBe("editable");
    expect(diaryModeFor(day(20), WED_AFTERNOON)).toBe("editable");
    expect(diaryModeFor(day(21), WED_AFTERNOON)).toBe("editable");
  });

  it("hides the days still ahead", () => {
    expect(diaryModeFor(day(22), WED_AFTERNOON)).toBe("hidden");
  });

  it("keeps earlier weeks read-only", () => {
    expect(diaryModeFor(day(18), WED_AFTERNOON)).toBe("readonly");
  });

  it("keeps yesterday open until 08:00 across a week boundary", () => {
    expect(diaryModeFor(day(25), MON_EARLY)).toBe("editable");
    expect(diaryModeFor(day(25), MON_LATE)).toBe("readonly");
  });

  it("lets today be written even before 08:00", () => {
    expect(diaryModeFor(day(26), MON_EARLY)).toBe("editable");
  });
});

describe("currentDiaryDay", () => {
  it("is today from 08:00 on", () => {
    expect(formatDateKey(currentDiaryDay(MON_LATE))).toBe("2026-10-26");
  });

  it("is yesterday before 08:00", () => {
    expect(formatDateKey(currentDiaryDay(MON_EARLY))).toBe("2026-10-25");
  });
});
