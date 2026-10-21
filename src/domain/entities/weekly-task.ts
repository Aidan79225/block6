export interface WeeklyTask {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly position: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export interface CreateWeeklyTaskInput {
  id: string;
  userId: string;
  title: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
}

export function createWeeklyTask(input: CreateWeeklyTaskInput): WeeklyTask {
  if (!input.title.trim()) {
    throw new Error("WeeklyTask title is required");
  }
  if (input.position < 0) {
    throw new Error("position must be non-negative");
  }
  return { ...input };
}
