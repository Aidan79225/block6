import { describe, it, expect } from "vitest";
import { createDiaryEntry } from "@/domain/entities/diary-entry";

describe("DiaryEntry", () => {
  it("creates a diary entry with bad/good/next", () => {
    const entry = createDiaryEntry({
      id: "diary-1",
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      bad: "分心了好幾次",
      good: "完成專案",
      next: "明天早點開始",
      createdAt: new Date(),
    });
    expect(entry.bad).toBe("分心了好幾次");
    expect(entry.good).toBe("完成專案");
    expect(entry.next).toBe("明天早點開始");
  });

  it("rejects empty fields", () => {
    expect(() =>
      createDiaryEntry({
        id: "diary-1",
        userId: "user-1",
        entryDate: new Date("2026-04-13"),
        bad: "",
        good: "Line 2",
        next: "Line 3",
        createdAt: new Date(),
      }),
    ).toThrow("All three diary fields are required");
  });
});
