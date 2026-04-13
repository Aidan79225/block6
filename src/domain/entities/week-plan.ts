export interface WeekPlan { readonly id: string; readonly userId: string; readonly weekStart: Date; readonly createdAt: Date; }
export interface CreateWeekPlanInput { id: string; userId: string; weekStart: Date; createdAt: Date; }

export function createWeekPlan(input: CreateWeekPlanInput): WeekPlan {
  if (input.weekStart.getUTCDay() !== 1) throw new Error("weekStart must be a Monday");
  return { ...input };
}
