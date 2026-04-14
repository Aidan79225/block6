import { describe, it, expect, vi } from "vitest";
import { WriteDiaryUseCase } from "@/domain/usecases/write-diary";
import { DiaryRepository } from "@/domain/repositories/diary-repository";

describe("WriteDiaryUseCase", () => {
  it("creates a new diary entry", async () => {
    const mockRepo: DiaryRepository = {
      findByUserAndDate: vi.fn().mockResolvedValue(null),
      findByUserAndDateRange: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    };

    const useCase = new WriteDiaryUseCase(mockRepo);
    const result = await useCase.execute({
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      bad: "分心了",
      good: "完成 A",
      next: "明天早點",
    });

    expect(result.bad).toBe("分心了");
    expect(result.good).toBe("完成 A");
    expect(result.next).toBe("明天早點");
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it("updates existing diary entry for same date", async () => {
    const existing = {
      id: "diary-1",
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      bad: "舊的",
      good: "舊的",
      next: "舊的",
      createdAt: new Date(),
    };
    const mockRepo: DiaryRepository = {
      findByUserAndDate: vi.fn().mockResolvedValue(existing),
      findByUserAndDateRange: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new WriteDiaryUseCase(mockRepo);
    const result = await useCase.execute({
      userId: "user-1",
      entryDate: new Date("2026-04-13"),
      bad: "新 bad",
      good: "新 good",
      next: "新 next",
    });

    expect(result.bad).toBe("新 bad");
    expect(mockRepo.update).toHaveBeenCalledOnce();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
