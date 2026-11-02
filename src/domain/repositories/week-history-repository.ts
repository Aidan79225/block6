import type { Block } from "@/domain/entities/block";

/** Read access to many weeks at once, for views that span months. */
export interface WeekHistoryRepository {
  /** Stored blocks of every week from one week key to another, by week key. */
  blocksBetween(
    userId: string,
    fromWeekKey: string,
    toWeekKey: string,
  ): Promise<Record<string, Block[]>>;
}
