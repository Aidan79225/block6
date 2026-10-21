import { describe, it, expect } from "vitest";
import {
  nextReminderAt,
  weeklyPromptDue,
} from "@/domain/usecases/weekly-prompt";

const WED = new Date(2026, 9, 21, 15, 0); // week of Mon 2026-10-19

describe("weeklyPromptDue", () => {
  it("asks once per week", () => {
    expect(weeklyPromptDue(WED, null)).toBe(true);
    expect(weeklyPromptDue(WED, "2026-10-12")).toBe(true);
    expect(weeklyPromptDue(WED, "2026-10-19")).toBe(false);
  });
});

describe("nextReminderAt", () => {
  it("is next Monday at 08:00 once this week's has passed", () => {
    expect(nextReminderAt(WED)).toEqual(new Date(2026, 9, 26, 8, 0));
  });

  it("is this Monday at 08:00 while it is still ahead", () => {
    const mondayDawn = new Date(2026, 9, 26, 6, 30);
    expect(nextReminderAt(mondayDawn)).toEqual(new Date(2026, 9, 26, 8, 0));
  });

  it("moves on to the next week exactly at 08:00", () => {
    const mondayEight = new Date(2026, 9, 26, 8, 0);
    expect(nextReminderAt(mondayEight)).toEqual(new Date(2026, 10, 2, 8, 0));
  });
});
