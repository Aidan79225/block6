import type { WeekFocusRepository } from "@/domain/repositories/week-focus-repository";
import {
  fetchWeekFocus,
  saveWeekFocus,
} from "@/infrastructure/supabase/database";

export class SupabaseWeekFocusRepository implements WeekFocusRepository {
  find(userId: string, weekKey: string): Promise<string | null> {
    return fetchWeekFocus(userId, weekKey);
  }
  save(
    userId: string,
    weekKey: string,
    directionId: string | null,
  ): Promise<void> {
    return saveWeekFocus(userId, weekKey, directionId);
  }
}
