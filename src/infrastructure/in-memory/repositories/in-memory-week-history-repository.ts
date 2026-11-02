import type { Block } from "@/domain/entities/block";
import type { WeekHistoryRepository } from "@/domain/repositories/week-history-repository";

export class InMemoryWeekHistoryRepository implements WeekHistoryRepository {
  private readonly weeks = new Map<string, Record<string, Block[]>>();

  /** Store a week's blocks for a user (test setup). */
  put(userId: string, weekKey: string, blocks: Block[]): void {
    const byWeek = this.weeks.get(userId) ?? {};
    byWeek[weekKey] = blocks;
    this.weeks.set(userId, byWeek);
  }

  async blocksBetween(
    userId: string,
    fromWeekKey: string,
    toWeekKey: string,
  ): Promise<Record<string, Block[]>> {
    const out: Record<string, Block[]> = {};
    for (const [weekKey, blocks] of Object.entries(
      this.weeks.get(userId) ?? {},
    )) {
      if (weekKey >= fromWeekKey && weekKey <= toWeekKey) out[weekKey] = blocks;
    }
    return out;
  }
}
