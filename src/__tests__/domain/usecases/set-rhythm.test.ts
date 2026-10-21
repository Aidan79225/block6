import { describe, it, expect, vi } from "vitest";
import {
  SetRhythmUseCase,
  regrettedRhythmSlots,
  rhythmSlotsFromWeek,
  rhythmStartAfter,
  rhythmWithout,
} from "@/domain/usecases/set-rhythm";
import { ListRhythmHistoryUseCase } from "@/domain/usecases/list-rhythm-history";
import type { RhythmRepository } from "@/domain/repositories/rhythm-repository";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";

const makeRepo = (): RhythmRepository => ({
  findHistory: vi.fn(),
  save: vi.fn(),
});

function block(slot: number, suppressed = false, regretted = false) {
  return createBlock({
    id: `b-${slot}`,
    weekPlanId: "2026-08-31",
    dayOfWeek: 2,
    slot,
    blockType: BlockType.Rest,
    title: `第 ${slot} 格`,
    description: "備註",
    status: BlockStatus.Completed,
    suppressed,
    regretted,
  });
}

describe("rhythmStartAfter", () => {
  it("starts on the Monday after a midweek day", () => {
    // Wednesday 2026-09-02 → next week starts Monday 2026-09-07.
    expect(rhythmStartAfter(new Date(2026, 8, 2, 15))).toBe("2026-09-07");
  });

  it("treats Monday as part of the current week", () => {
    expect(rhythmStartAfter(new Date(2026, 8, 7, 0, 5))).toBe("2026-09-14");
  });

  it("treats Sunday as the end of the current week", () => {
    expect(rhythmStartAfter(new Date(2026, 8, 13, 23, 55))).toBe("2026-09-14");
  });
});

describe("rhythmSlotsFromWeek", () => {
  it("keeps what each visible slot holds, not how it went", () => {
    const [slot] = rhythmSlotsFromWeek([block(3)]);
    expect(slot).toEqual({
      dayOfWeek: 2,
      slot: 3,
      blockType: BlockType.Rest,
      title: "第 3 格",
      description: "備註",
    });
  });

  it("leaves out slots deliberately emptied this week", () => {
    const slots = rhythmSlotsFromWeek([block(1), block(2, true)]);
    expect(slots.map((s) => s.slot)).toEqual([1]);
  });

  it("leaves out blocks marked as not worth it", () => {
    const slots = rhythmSlotsFromWeek([block(1), block(2, false, true)]);
    expect(slots.map((s) => s.slot)).toEqual([1]);
  });
});

describe("rhythmWithout", () => {
  it("drops the given slots and keeps the rest", () => {
    const rhythm = rhythmSlotsFromWeek([block(1), block(2), block(3)]);
    const kept = rhythmWithout(rhythm, [{ dayOfWeek: 2, slot: 2 }]);
    expect(kept.map((s) => s.slot)).toEqual([1, 3]);
  });
});

describe("regrettedRhythmSlots", () => {
  const rhythm = rhythmSlotsFromWeek([block(1), block(2), block(3)]);

  it("finds regretted blocks the rhythm would bring back", () => {
    const week = [block(1), block(2, false, true)];
    expect(regrettedRhythmSlots(week, rhythm)).toEqual([
      { dayOfWeek: 2, slot: 2 },
    ]);
  });

  it("ignores a regretted block the rhythm no longer puts there", () => {
    const renamed = createBlock({ ...block(3, false, true), title: "別的事" });
    expect(regrettedRhythmSlots([renamed], rhythm)).toEqual([]);
  });

  it("ignores regretted blocks in slots the rhythm leaves empty", () => {
    expect(regrettedRhythmSlots([block(5, false, true)], rhythm)).toEqual([]);
  });
});

describe("SetRhythmUseCase", () => {
  it("saves a version that takes effect from next week", async () => {
    const repo = makeRepo();
    vi.mocked(repo.save).mockResolvedValue(undefined);
    const slots = [
      createRhythmSlot({
        dayOfWeek: 1,
        slot: 1,
        blockType: BlockType.Core,
        title: "寫作",
        description: "",
      }),
    ];

    const result = await new SetRhythmUseCase(repo).execute({
      userId: "u1",
      slots,
      today: new Date(2026, 8, 2),
    });

    expect(result.userId).toBe("u1");
    expect(result.effectiveFrom).toBe("2026-09-07");
    expect(result.slots).toEqual(slots);
    expect(repo.save).toHaveBeenCalledWith(result);
  });

  it("clears the rhythm by saving an empty version", async () => {
    const repo = makeRepo();
    vi.mocked(repo.save).mockResolvedValue(undefined);
    const result = await new SetRhythmUseCase(repo).execute({
      userId: "u1",
      slots: [],
      today: new Date(2026, 8, 2),
    });
    expect(result.slots).toEqual([]);
    expect(repo.save).toHaveBeenCalledOnce();
  });
});

describe("ListRhythmHistoryUseCase", () => {
  it("returns the user's versions from the repository", async () => {
    const repo = makeRepo();
    vi.mocked(repo.findHistory).mockResolvedValue([]);
    await expect(
      new ListRhythmHistoryUseCase(repo).execute("u1"),
    ).resolves.toEqual([]);
    expect(repo.findHistory).toHaveBeenCalledWith("u1");
  });
});
