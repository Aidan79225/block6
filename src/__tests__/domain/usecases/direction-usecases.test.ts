import { describe, it, expect } from "vitest";
import {
  ListDirectionsUseCase,
  SetDirectionsUseCase,
} from "@/domain/usecases/set-directions";
import { GetDirectionTrajectoryUseCase } from "@/domain/usecases/get-direction-trajectory";
import {
  GetWeekFocusUseCase,
  SetWeekFocusUseCase,
} from "@/domain/usecases/week-focus";
import { InMemoryDirectionRepository } from "@/infrastructure/in-memory/repositories/in-memory-direction-repository";
import { InMemoryWeekFocusRepository } from "@/infrastructure/in-memory/repositories/in-memory-week-focus-repository";
import { InMemoryWeekHistoryRepository } from "@/infrastructure/in-memory/repositories/in-memory-week-history-repository";
import { InMemoryRhythmRepository } from "@/infrastructure/in-memory/repositories/in-memory-rhythm-repository";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";
import { createRhythm } from "@/domain/entities/rhythm";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";

describe("SetDirectionsUseCase", () => {
  it("saves non-blank lines in order and keeps known ids", async () => {
    const repo = new InMemoryDirectionRepository();
    const saved = await new SetDirectionsUseCase(repo).execute({
      userId: "u1",
      drafts: [
        { id: "keep-me", text: "寫一本書", titles: ["寫作"] },
        { text: "   ", titles: [] },
        { text: "身體", titles: ["健身"] },
      ],
    });

    expect(saved.map((d) => [d.position, d.text])).toEqual([
      [0, "寫一本書"],
      [1, "身體"],
    ]);
    expect(saved[0].id).toBe("keep-me");
    expect(await new ListDirectionsUseCase(repo).execute("u1")).toEqual(saved);
  });

  it("refuses a fourth direction", async () => {
    const drafts = ["a", "b", "c", "d"].map((text) => ({ text, titles: [] }));
    await expect(
      new SetDirectionsUseCase(new InMemoryDirectionRepository()).execute({
        userId: "u1",
        drafts,
      }),
    ).rejects.toThrow("At most 3 directions");
  });
});

describe("GetDirectionTrajectoryUseCase", () => {
  it("counts each week's stored blocks plus the rhythm it was planned under", async () => {
    const history = new InMemoryWeekHistoryRepository();
    const rhythms = new InMemoryRhythmRepository();
    const directions = new InMemoryDirectionRepository();

    await new SetDirectionsUseCase(directions).execute({
      userId: "u1",
      drafts: [{ id: "book", text: "寫一本書", titles: ["寫作"] }],
    });
    // From 2026-10-12 the rhythm puts 寫作 in Monday slot 1.
    await rhythms.save(
      createRhythm({
        id: "r1",
        userId: "u1",
        effectiveFrom: "2026-10-12",
        slots: [
          createRhythmSlot({
            dayOfWeek: 1,
            slot: 1,
            blockType: BlockType.Core,
            title: "寫作",
            description: "",
          }),
        ],
      }),
    );
    history.put("u1", "2026-10-05", [
      createBlock({
        id: "b1",
        weekPlanId: "wp-a",
        dayOfWeek: 2,
        slot: 1,
        blockType: BlockType.Core,
        title: "寫作",
        description: "",
        status: BlockStatus.Completed,
      }),
    ]);

    const { weeks } = await new GetDirectionTrajectoryUseCase(
      history,
      rhythms,
      directions,
    ).execute("u1", ["2026-10-05", "2026-10-12"]);

    expect(weeks.map((w) => w.byDirection.book)).toEqual([1, 1]);
  });

  it("is empty for no weeks", async () => {
    const useCase = new GetDirectionTrajectoryUseCase(
      new InMemoryWeekHistoryRepository(),
      new InMemoryRhythmRepository(),
      new InMemoryDirectionRepository(),
    );
    expect(await useCase.execute("u1", [])).toEqual({
      directions: [],
      weeks: [],
    });
  });
});

describe("week focus", () => {
  it("remembers and clears the direction to pull back that week", async () => {
    const repo = new InMemoryWeekFocusRepository();
    await new SetWeekFocusUseCase(repo).execute("u1", "2026-10-26", "book");
    expect(
      await new GetWeekFocusUseCase(repo).execute("u1", "2026-10-26"),
    ).toBe("book");

    await new SetWeekFocusUseCase(repo).execute("u1", "2026-10-26", null);
    expect(
      await new GetWeekFocusUseCase(repo).execute("u1", "2026-10-26"),
    ).toBeNull();
  });
});
