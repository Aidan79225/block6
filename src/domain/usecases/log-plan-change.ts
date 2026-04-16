import type {
  PlanChange,
  PlanChangeAction,
} from "@/domain/entities/plan-change";

export interface LogPlanChangeInput {
  userId: string | null;
  weekKey: string;
  dayOfWeek: number;
  slot: number;
  blockTitleSnapshot: string;
  action: PlanChangeAction;
  reason: string;
}

export function logPlanChange(input: LogPlanChangeInput): PlanChange {
  const trimmed = input.reason.trim();
  if (trimmed.length === 0) {
    throw new Error("reason must not be empty");
  }
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    weekKey: input.weekKey,
    dayOfWeek: input.dayOfWeek,
    slot: input.slot,
    blockTitleSnapshot: input.blockTitleSnapshot,
    action: input.action,
    reason: trimmed,
    createdAt: new Date().toISOString(),
  };
}
