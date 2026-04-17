import { describe, it, expect } from "vitest";
import {
  getMonday,
  getCellDate,
  formatDateKey,
  isSameLocalDay,
} from "@/presentation/lib/date-helpers";

describe("date-helpers", () => {
  describe("getMonday", () => {
    it("returns same-week Monday at 00:00 local for a mid-week day", () => {
      const wed = new Date(2026, 3, 15, 14, 30); // Wed 2026-04-15 14:30 local
      const monday = getMonday(wed);
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getMonth()).toBe(3);
      expect(monday.getDate()).toBe(13);
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
      expect(monday.getSeconds()).toBe(0);
      expect(monday.getMilliseconds()).toBe(0);
    });

    it("returns previous Monday when given a Sunday", () => {
      const sunday = new Date(2026, 3, 19, 10, 0); // Sun 2026-04-19
      const monday = getMonday(sunday);
      expect(monday.getDate()).toBe(13);
    });

    it("normalizes a Monday with non-midnight time to the same Monday at 00:00", () => {
      const mondayAfternoon = new Date(2026, 3, 13, 23, 59, 59, 999);
      const monday = getMonday(mondayAfternoon);
      expect(monday.getDate()).toBe(13);
      expect(monday.getHours()).toBe(0);
    });

    it("returns the same Monday for Monday at 03:00 local (early morning)", () => {
      const mondayEarly = new Date(2026, 3, 13, 3, 0);
      const monday = getMonday(mondayEarly);
      expect(monday.getDate()).toBe(13);
    });
  });

  describe("getCellDate", () => {
    const monday = new Date(2026, 3, 13, 0, 0); // 2026-04-13 Mon local midnight

    it("returns the same Monday for dayOfWeek 1", () => {
      const d = getCellDate(monday, 1);
      expect(d.getDate()).toBe(13);
      expect(d.getHours()).toBe(0);
    });

    it("returns Sunday (dayOfWeek 7) six days later at 00:00 local", () => {
      const d = getCellDate(monday, 7);
      expect(d.getDate()).toBe(19);
      expect(d.getHours()).toBe(0);
    });

    it("strips a non-midnight time-of-day from weekStart", () => {
      const mondayWithTime = new Date(2026, 3, 13, 15, 30);
      const d = getCellDate(mondayWithTime, 3);
      expect(d.getDate()).toBe(15);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    });
  });

  describe("formatDateKey", () => {
    it("formats a date as YYYY-MM-DD using local fields", () => {
      expect(formatDateKey(new Date(2026, 3, 13))).toBe("2026-04-13");
    });

    it("pads single-digit month and day", () => {
      expect(formatDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
  });

  describe("isSameLocalDay", () => {
    it("returns true for two times on the same local day", () => {
      const morning = new Date(2026, 3, 13, 9, 0);
      const evening = new Date(2026, 3, 13, 23, 30);
      expect(isSameLocalDay(morning, evening)).toBe(true);
    });

    it("returns false across the midnight boundary", () => {
      const lateMon = new Date(2026, 3, 13, 23, 59);
      const earlyTue = new Date(2026, 3, 14, 0, 1);
      expect(isSameLocalDay(lateMon, earlyTue)).toBe(false);
    });
  });
});
