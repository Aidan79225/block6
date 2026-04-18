import { describe, it, expect } from "vitest";
import { InMemoryPlanChangeRepository } from "@/infrastructure/in-memory/repositories/in-memory-plan-change-repository";
import type { PlanChange } from "@/domain/entities/plan-change";

function makeChange(overrides: Partial<PlanChange> = {}): PlanChange {
  return {
    id: "pc-1",
    userId: "user-1",
    weekKey: "2026-04-13",
    dayOfWeek: 1,
    slot: 2,
    blockTitleSnapshot: "Deep Work",
    action: "edit",
    reason: "reason",
    createdAt: "2026-04-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("InMemoryPlanChangeRepository", () => {
  it("listByWeek returns [] when none match", async () => {
    const repo = new InMemoryPlanChangeRepository();
    expect(await repo.listByWeek("user-1", "2026-04-13")).toEqual([]);
  });

  it("create stores a change; listByWeek finds it", async () => {
    const repo = new InMemoryPlanChangeRepository();
    const c = makeChange();
    const created = await repo.create(c);
    expect(created).toEqual(c);
    const list = await repo.listByWeek("user-1", "2026-04-13");
    expect(list).toEqual([c]);
  });

  it("listByWeek filters by user and weekKey", async () => {
    const repo = new InMemoryPlanChangeRepository();
    await repo.create(makeChange({ id: "a", userId: "user-1", weekKey: "2026-04-13" }));
    await repo.create(makeChange({ id: "b", userId: "user-1", weekKey: "2026-04-20" }));
    await repo.create(makeChange({ id: "c", userId: "user-2", weekKey: "2026-04-13" }));
    const list = await repo.listByWeek("user-1", "2026-04-13");
    expect(list.map((x) => x.id)).toEqual(["a"]);
  });

  it("listByWeek returns entries sorted by createdAt ascending", async () => {
    const repo = new InMemoryPlanChangeRepository();
    await repo.create(makeChange({ id: "b", createdAt: "2026-04-13T12:00:00.000Z" }));
    await repo.create(makeChange({ id: "a", createdAt: "2026-04-13T10:00:00.000Z" }));
    const list = await repo.listByWeek("user-1", "2026-04-13");
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
