import { WeeklyTask } from "@/domain/entities/weekly-task";

export interface WeeklyTaskCompletion {
  readonly weeklyTaskId: string;
  readonly weekStart: string;
}

export interface WeeklyTaskRepository {
  findActiveForUser(userId: string): Promise<WeeklyTask[]>;
  add(
    userId: string,
    title: string,
    position: number,
  ): Promise<WeeklyTask>;
  updateTitle(id: string, title: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
  fetchCompletions(
    userId: string,
    weekStart: string,
  ): Promise<WeeklyTaskCompletion[]>;
  addCompletion(
    weeklyTaskId: string,
    weekStart: string,
  ): Promise<void>;
  removeCompletion(
    weeklyTaskId: string,
    weekStart: string,
  ): Promise<void>;
}
