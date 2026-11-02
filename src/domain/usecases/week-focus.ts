import type { WeekFocusRepository } from "@/domain/repositories/week-focus-repository";

/** The direction a week was set to give more time to, if any. */
export class GetWeekFocusUseCase {
  constructor(private readonly repo: WeekFocusRepository) {}

  execute(userId: string, weekKey: string): Promise<string | null> {
    return this.repo.find(userId, weekKey);
  }
}

/**
 * Answer the review's "下週想把哪個方向的格數拉回來？" for a week: the
 * direction to pull back (or none).
 */
export class SetWeekFocusUseCase {
  constructor(private readonly repo: WeekFocusRepository) {}

  execute(
    userId: string,
    weekKey: string,
    directionId: string | null,
  ): Promise<void> {
    return this.repo.save(userId, weekKey, directionId);
  }
}
