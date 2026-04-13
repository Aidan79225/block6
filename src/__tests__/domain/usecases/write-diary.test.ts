import { describe, it, expect, vi } from "vitest";
import { WriteDiaryUseCase } from "@/domain/usecases/write-diary";
import { DiaryRepository } from "@/domain/repositories/diary-repository";
import { DiaryEntry } from "@/domain/entities/diary-entry";

const makeRepo = (): DiaryRepository => ({
  findByUserAndDate: vi.fn(),
  findByUserAndDateRange: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
});

const baseInput = {
  userId: "user-1",
  entryDate: new Date("2026-04-13T00:00:00.000Z"),
  line1: "Accomplished task A",
  line2: "Accomplished task B",
  line3: "Accomplished task C",
};

describe("WriteDiaryUseCase", () => {
  it("creates a new diary entry when none exists for that date", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findByUserAndDate).mockResolvedValue(null);
    vi.mocked(repo.save).mockResolvedValue(undefined);

    const useCase = new WriteDiaryUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.userId).toBe(baseInput.userId);
    expect(result.entryDate).toEqual(baseInput.entryDate);
    expect(result.line1).toBe(baseInput.line1);
    expect(typeof result.id).toBe("string");
    expect(repo.save).toHaveBeenCalledOnce();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates existing diary entry for same date", async () => {
    const repo = makeRepo();
    const existing: DiaryEntry = {
      id: "diary-existing",
      userId: "user-1",
      entryDate: new Date("2026-04-13T00:00:00.000Z"),
      line1: "Old line 1",
      line2: "Old line 2",
      line3: "Old line 3",
      createdAt: new Date("2026-04-13T08:00:00.000Z"),
    };
    vi.mocked(repo.findByUserAndDate).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(undefined);

    const useCase = new WriteDiaryUseCase(repo);
    const result = await useCase.execute(baseInput);

    expect(result.id).toBe(existing.id);
    expect(result.line1).toBe(baseInput.line1);
    expect(result.line2).toBe(baseInput.line2);
    expect(result.line3).toBe(baseInput.line3);
    expect(repo.update).toHaveBeenCalledOnce();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
