import { describe, it, expect } from "vitest";
import { InMemoryDiaryRepository } from "@/infrastructure/in-memory/repositories/in-memory-diary-repository";
import { createDiaryEntry } from "@/domain/entities/diary-entry";

function makeEntry(
  overrides: Partial<Parameters<typeof createDiaryEntry>[0]> = {},
) {
  return createDiaryEntry({
    id: "d-1",
    userId: "user-1",
    entryDate: new Date(2026, 3, 13),
    bad: "bad",
    good: "good",
    next: "next",
    createdAt: new Date(2026, 3, 13, 10, 0),
    ...overrides,
  });
}

describe("InMemoryDiaryRepository", () => {
  it("findByUserAndDate returns null when no entry exists", async () => {
    const repo = new InMemoryDiaryRepository();
    const got = await repo.findByUserAndDate("user-1", new Date(2026, 3, 13));
    expect(got).toBeNull();
  });

  it("save stores an entry, findByUserAndDate finds it by userId and date", async () => {
    const repo = new InMemoryDiaryRepository();
    const entry = makeEntry();
    await repo.save(entry);
    const got = await repo.findByUserAndDate("user-1", new Date(2026, 3, 13));
    expect(got).toEqual(entry);
  });

  it("findByUserAndDate returns null for a different user", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry());
    const got = await repo.findByUserAndDate("user-2", new Date(2026, 3, 13));
    expect(got).toBeNull();
  });

  it("save throws on duplicate id", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry());
    await expect(repo.save(makeEntry())).rejects.toThrow(/already exists/);
  });

  it("update replaces the existing entry", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry({ bad: "old" }));
    await repo.update(makeEntry({ bad: "new" }));
    const got = await repo.findByUserAndDate("user-1", new Date(2026, 3, 13));
    expect(got?.bad).toBe("new");
  });

  it("update throws if id does not exist", async () => {
    const repo = new InMemoryDiaryRepository();
    await expect(repo.update(makeEntry())).rejects.toThrow(/not found/);
  });

  it("findByUserAndDateRange returns entries inside the range inclusive", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry({ id: "a", entryDate: new Date(2026, 3, 13) }));
    await repo.save(makeEntry({ id: "b", entryDate: new Date(2026, 3, 15) }));
    await repo.save(makeEntry({ id: "c", entryDate: new Date(2026, 3, 19) }));
    const result = await repo.findByUserAndDateRange(
      "user-1",
      new Date(2026, 3, 13),
      new Date(2026, 3, 15),
    );
    expect(result.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("findByUserAndDateRange filters by userId", async () => {
    const repo = new InMemoryDiaryRepository();
    await repo.save(makeEntry({ id: "a", userId: "user-1" }));
    await repo.save(makeEntry({ id: "b", userId: "user-2" }));
    const result = await repo.findByUserAndDateRange(
      "user-1",
      new Date(2026, 3, 13),
      new Date(2026, 3, 13),
    );
    expect(result.map((e) => e.id)).toEqual(["a"]);
  });
});
