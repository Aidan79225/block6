import type { DiaryEntry } from "@/domain/entities/diary-entry";
import type { DiaryRepository } from "@/domain/repositories/diary-repository";
import { formatDateKey } from "@/presentation/lib/date-helpers";
import {
  fetchDiaryEntry,
  fetchDiaryRange,
  insertDiaryEntry,
  updateDiaryEntry,
} from "@/infrastructure/supabase/database";

export class SupabaseDiaryRepository implements DiaryRepository {
  async findByUserAndDate(
    userId: string,
    date: Date,
  ): Promise<DiaryEntry | null> {
    return fetchDiaryEntry(userId, formatDateKey(date));
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DiaryEntry[]> {
    return fetchDiaryRange(
      userId,
      formatDateKey(startDate),
      formatDateKey(endDate),
    );
  }

  async save(entry: DiaryEntry): Promise<void> {
    return insertDiaryEntry(entry);
  }

  async update(entry: DiaryEntry): Promise<void> {
    return updateDiaryEntry(entry);
  }
}
