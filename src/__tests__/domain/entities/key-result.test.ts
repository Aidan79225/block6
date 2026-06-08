import { describe, it, expect } from "vitest";
import { createKeyResult, keyResultProgress } from "@/domain/entities/key-result";

describe("KeyResult", () => {
  const base = {
    id: "k-1",
    objectiveId: "o-1",
    title: "讀完 12 本書",
    unit: "本",
    targetValue: 12,
    currentValue: 6,
    position: 0,
    createdAt: new Date(),
  };

  it("creates a key result", () => {
    const kr = createKeyResult(base);
    expect(kr.title).toBe("讀完 12 本書");
    expect(kr.unit).toBe("本");
  });

  it("rejects blank title", () => {
    expect(() => createKeyResult({ ...base, title: "" })).toThrow(
      "KeyResult title is required",
    );
  });

  it("rejects non-positive targetValue", () => {
    expect(() => createKeyResult({ ...base, targetValue: 0 })).toThrow(
      "targetValue must be positive",
    );
  });

  it("rejects negative currentValue", () => {
    expect(() => createKeyResult({ ...base, currentValue: -1 })).toThrow(
      "currentValue must be non-negative",
    );
  });

  it("rejects negative position", () => {
    expect(() => createKeyResult({ ...base, position: -1 })).toThrow(
      "position must be non-negative",
    );
  });

  it("computes progress as current/target", () => {
    expect(keyResultProgress(createKeyResult(base))).toBe(0.5);
  });

  it("clamps progress to a max of 1", () => {
    expect(
      keyResultProgress(createKeyResult({ ...base, currentValue: 20 })),
    ).toBe(1);
  });
});
