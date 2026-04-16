export type PlanChangeAction = "edit" | "move" | "add";

export interface PlanChange {
  readonly id: string;
  readonly userId: string | null;
  readonly weekKey: string;
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockTitleSnapshot: string;
  readonly action: PlanChangeAction;
  readonly reason: string;
  readonly createdAt: string;
}
