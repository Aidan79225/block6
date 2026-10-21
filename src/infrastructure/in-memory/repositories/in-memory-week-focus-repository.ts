import type { WeekFocusRepository } from "@/domain/repositories/week-focus-repository";

export class InMemoryWeekFocusRepository implements WeekFocusRepository {
  private readonly focus = new Map<string, string>();

  async find(userId: string, weekKey: string): Promise<string | null> {
    return this.focus.get(`${userId}:${weekKey}`) ?? null;
  }

  async save(
    userId: string,
    weekKey: string,
    directionId: string | null,
  ): Promise<void> {
    const key = `${userId}:${weekKey}`;
    if (directionId) this.focus.set(key, directionId);
    else this.focus.delete(key);
  }
}
