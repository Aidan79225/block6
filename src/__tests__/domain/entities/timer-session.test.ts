import { describe, it, expect } from "vitest";
import { createTimerSession } from "@/domain/entities/timer-session";

describe("TimerSession", () => {
  it("creates a running session without ended_at", () => {
    const session = createTimerSession({
      id: "t-1",
      blockId: "b-1",
      userId: "u-1",
      startedAt: new Date("2026-04-14T10:00:00Z"),
      endedAt: null,
      durationSeconds: null,
    });

    expect(session.endedAt).toBeNull();
    expect(session.durationSeconds).toBeNull();
  });

  it("creates a closed session with duration", () => {
    const started = new Date("2026-04-14T10:00:00Z");
    const ended = new Date("2026-04-14T11:00:00Z");
    const session = createTimerSession({
      id: "t-1",
      blockId: "b-1",
      userId: "u-1",
      startedAt: started,
      endedAt: ended,
      durationSeconds: 3600,
    });

    expect(session.durationSeconds).toBe(3600);
  });

  it("rejects endedAt before startedAt", () => {
    expect(() =>
      createTimerSession({
        id: "t-1",
        blockId: "b-1",
        userId: "u-1",
        startedAt: new Date("2026-04-14T11:00:00Z"),
        endedAt: new Date("2026-04-14T10:00:00Z"),
        durationSeconds: -3600,
      }),
    ).toThrow("endedAt must be after startedAt");
  });
});
