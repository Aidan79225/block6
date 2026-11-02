import { describe, it, expect } from "vitest";
import {
  mergeIntoRhythm,
  rhythmSuggestion,
  stableSlots,
  suggestionWeekKeys,
  SuggestRhythmUseCase,
} from "@/domain/usecases/suggest-rhythm";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";
import { createRhythm } from "@/domain/entities/rhythm";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";
import { InMemoryWeekHistoryRepository } from "@/infrastructure/in-memory/repositories/in-memory-week-history-repository";
import { InMemoryRhythmRepository } from "@/infrastructure/in-memory/repositories/in-memory-rhythm-repository";

function block(
  week: string,
  dayOfWeek: number,
  slot: number,
  title = "上班",
  blockType = BlockType.Core,
) {
  return createBlock({
    id: `${week}-${dayOfWeek}-${slot}`,
    weekPlanId: week,
    dayOfWeek,
    slot,
    blockType,
    title,
    description: "",
    status: BlockStatus.Completed,
  });
}

/** The same Mon–Fri slot-2 "上班" plus `extra`, for a given week. */
function workWeek(week: string, extra: ReturnType<typeof block>[] = []) {
  return [1, 2, 3, 4, 5].map((d) => block(week, d, 2)).concat(extra);
}

describe("stableSlots", () => {
  it("keeps slots that held the same activity every week", () => {
    const weeks = [workWeek("w3"), workWeek("w2"), workWeek("w1")];
    expect(stableSlots(weeks)).toHaveLength(5);
  });

  it("drops a slot whose title or type changed in any week", () => {
    const weeks = [
      workWeek("w3"),
      workWeek("w2").map((b) =>
        b.dayOfWeek === 1 ? createBlock({ ...b, title: "請假" }) : b,
      ),
      workWeek("w1").map((b) =>
        b.dayOfWeek === 2
          ? createBlock({ ...b, blockType: BlockType.Rest })
          : b,
      ),
    ];
    expect(stableSlots(weeks).map((s) => s.dayOfWeek)).toEqual([3, 4, 5]);
  });

  it("ignores untitled and deliberately emptied slots", () => {
    const weeks = [1, 2, 3].map((n) => [
      block(`w${n}`, 1, 1, ""),
      createBlock({ ...block(`w${n}`, 1, 2), suppressed: true }),
    ]);
    expect(stableSlots(weeks)).toEqual([]);
  });
});

describe("rhythmSuggestion", () => {
  const weeks = [1, 2, 3].map((n) =>
    workWeek(`w${n}`, [block(`w${n}`, 6, 1, "跑步", BlockType.Rest)]),
  );

  it("suggests the stable slots the rhythm does not hold yet", () => {
    expect(rhythmSuggestion(weeks, [])).toHaveLength(6);
  });

  it("leaves out what the rhythm already holds the same way", () => {
    const rhythm = [
      createRhythmSlot({
        dayOfWeek: 6,
        slot: 1,
        blockType: BlockType.Rest,
        title: "跑步",
        description: "",
      }),
    ];
    // Five left is under a day's worth, so nothing is suggested.
    expect(rhythmSuggestion(weeks, rhythm)).toEqual([]);
  });
});

describe("mergeIntoRhythm", () => {
  it("adds new slots and overwrites the ones they cover", () => {
    const slot = (dayOfWeek: number, title: string) =>
      createRhythmSlot({
        dayOfWeek,
        slot: 1,
        blockType: BlockType.Core,
        title,
        description: "",
      });
    const merged = mergeIntoRhythm(
      [slot(1, "舊"), slot(2, "留著")],
      [slot(1, "新"), slot(3, "加入")],
    );
    expect(merged.map((s) => `${s.dayOfWeek}:${s.title}`).sort()).toEqual([
      "1:新",
      "2:留著",
      "3:加入",
    ]);
  });
});

describe("suggestionWeekKeys", () => {
  it("looks at the three weeks before this one, most recent first", () => {
    expect(suggestionWeekKeys(new Date(2026, 9, 21))).toEqual([
      "2026-10-12",
      "2026-10-05",
      "2026-09-28",
    ]);
  });
});

describe("SuggestRhythmUseCase", () => {
  it("counts the rhythm each past week was planned under", async () => {
    const history = new InMemoryWeekHistoryRepository();
    const rhythms = new InMemoryRhythmRepository();
    // An old rhythm put 跑步 on Saturday from 2026-09-28; it was then cleared.
    await rhythms.save(
      createRhythm({
        id: "old",
        userId: "u1",
        effectiveFrom: "2026-09-28",
        slots: [
          createRhythmSlot({
            dayOfWeek: 6,
            slot: 1,
            blockType: BlockType.Rest,
            title: "跑步",
            description: "",
          }),
        ],
      }),
    );
    await rhythms.save(
      createRhythm({
        id: "now",
        userId: "u1",
        effectiveFrom: "2026-10-26",
        slots: [],
      }),
    );
    for (const week of ["2026-09-28", "2026-10-05", "2026-10-12"]) {
      history.put("u1", week, workWeek(week));
    }

    const suggestion = await new SuggestRhythmUseCase(history, rhythms).execute(
      "u1",
      new Date(2026, 9, 21),
    );

    expect(suggestion.map((s) => `${s.dayOfWeek}-${s.slot}`).sort()).toEqual([
      "1-2",
      "2-2",
      "3-2",
      "4-2",
      "5-2",
      "6-1",
    ]);
  });
});
