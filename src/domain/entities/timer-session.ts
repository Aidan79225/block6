export interface TimerSession {
  readonly id: string;
  readonly blockId: string;
  readonly userId: string;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly durationSeconds: number | null;
}

export interface CreateTimerSessionInput {
  id: string;
  blockId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
}

export function createTimerSession(
  input: CreateTimerSessionInput,
): TimerSession {
  if (input.endedAt && input.endedAt.getTime() <= input.startedAt.getTime()) {
    throw new Error("endedAt must be after startedAt");
  }
  return { ...input };
}
