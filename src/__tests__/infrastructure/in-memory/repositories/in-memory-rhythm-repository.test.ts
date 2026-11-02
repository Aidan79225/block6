import { describe, it, expect } from "vitest";
import { InMemoryRhythmRepository } from "@/infrastructure/in-memory/repositories/in-memory-rhythm-repository";
import { createRhythm } from "@/domain/entities/rhythm";

function version(userId: string, effectiveFrom: string) {
  return createRhythm({
    id: `${userId}-${effectiveFrom}`,
    userId,
    effectiveFrom,
    slots: [],
  });
}

describe("InMemoryRhythmRepository", () => {
  it("findHistory is empty for a user with no rhythm", async () => {
    const repo = new InMemoryRhythmRepository();
    expect(await repo.findHistory("u1")).toEqual([]);
  });

  it("save keeps earlier versions and scopes them per user", async () => {
    const repo = new InMemoryRhythmRepository();
    await repo.save(version("u1", "2026-08-31"));
    await repo.save(version("u1", "2026-09-14"));
    await repo.save(version("u2", "2026-08-31"));
    const history = await repo.findHistory("u1");
    expect(history.map((v) => v.effectiveFrom)).toEqual([
      "2026-08-31",
      "2026-09-14",
    ]);
  });

  it("save replaces a version starting on the same week", async () => {
    const repo = new InMemoryRhythmRepository();
    await repo.save(version("u1", "2026-09-14"));
    const replacement = createRhythm({
      id: "again",
      userId: "u1",
      effectiveFrom: "2026-09-14",
      slots: [],
    });
    await repo.save(replacement);
    expect(await repo.findHistory("u1")).toEqual([replacement]);
  });
});
