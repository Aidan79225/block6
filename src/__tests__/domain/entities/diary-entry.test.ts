import { describe, it, expect } from "vitest";
import { createDiaryEntry } from "@/domain/entities/diary-entry";

describe("DiaryEntry", () => {
  it("creates a diary entry with 3 lines", () => {
    const entry = createDiaryEntry({
      id: "diary-1",
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      line1: "今天很專注",
      line2: "完成度很高",
      line3: "明天繼續加油",
      createdAt: new Date(),
    });
    expect(entry.line1).toBe("今天很專注");
    expect(entry.line2).toBe("完成度很高");
    expect(entry.line3).toBe("明天繼續加油");
  });

  it("rejects empty lines", () => {
    expect(() =>
      createDiaryEntry({
        id: "diary-1",
        userId: "user-1",
        entryDate: new Date("2026-04-13"),
        line1: "",
        line2: "Line 2",
        line3: "Line 3",
        createdAt: new Date(),
      }),
    ).toThrow("All three lines are required");
  });
});
