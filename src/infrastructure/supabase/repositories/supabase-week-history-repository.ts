import type { Block } from "@/domain/entities/block";
import type { WeekHistoryRepository } from "@/domain/repositories/week-history-repository";
import { fetchBlocksBetween } from "@/infrastructure/supabase/database";

export class SupabaseWeekHistoryRepository implements WeekHistoryRepository {
  blocksBetween(
    userId: string,
    fromWeekKey: string,
    toWeekKey: string,
  ): Promise<Record<string, Block[]>> {
    return fetchBlocksBetween(userId, fromWeekKey, toWeekKey);
  }
}
