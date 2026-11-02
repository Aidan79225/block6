import { describe, it, expect } from "vitest";
import { planBlockMove } from "@/domain/usecases/plan-block-move";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";

const FROM = { dayOfWeek: 1, slot: 1 };
const TO = { dayOfWeek: 2, slot: 4 };

function stored(dayOfWeek: number, slot: number, suppressed: boolean) {
  return createBlock({
    id: `b-${dayOfWeek}-${slot}`,
    weekPlanId: "2026-09-07",
    dayOfWeek,
    slot,
    blockType: BlockType.Core,
    title: "",
    description: "",
    status: BlockStatus.Planned,
    suppressed,
  });
}

function rhythmAt(dayOfWeek: number, slot: number) {
  return createRhythmSlot({
    dayOfWeek,
    slot,
    blockType: BlockType.Core,
    title: "健身",
    description: "",
  });
}

describe("planBlockMove", () => {
  it("is a plain move between slots the rhythm does not touch", () => {
    expect(
      planBlockMove({ overrides: [], rhythm: [], from: FROM, to: TO }),
    ).toEqual({ displacedSuppressedId: null, vacatedRhythmSlot: null });
  });

  it("names the rhythm slot the vacated slot must be kept empty against", () => {
    const plan = planBlockMove({
      overrides: [],
      rhythm: [rhythmAt(1, 1), rhythmAt(2, 4)],
      from: FROM,
      to: TO,
    });
    expect(plan.vacatedRhythmSlot).toEqual(rhythmAt(1, 1));
  });

  it("trades places with a suppressed row holding the target", () => {
    const plan = planBlockMove({
      overrides: [stored(2, 4, true)],
      rhythm: [rhythmAt(2, 4)],
      from: FROM,
      to: TO,
    });
    expect(plan).toEqual({
      displacedSuppressedId: "b-2-4",
      vacatedRhythmSlot: null,
    });
  });

  it("ignores visible rows — only suppressed ones look empty", () => {
    const plan = planBlockMove({
      overrides: [stored(2, 4, false)],
      rhythm: [],
      from: FROM,
      to: TO,
    });
    expect(plan.displacedSuppressedId).toBeNull();
  });
});
