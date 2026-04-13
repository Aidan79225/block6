import { DiaryEntry } from "@/domain/entities/diary-entry";

export interface DiaryRepository {
  findByUserAndDate(userId: string, date: Date): Promise<DiaryEntry | null>;
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DiaryEntry[]>;
  save(entry: DiaryEntry): Promise<void>;
  update(entry: DiaryEntry): Promise<void>;
}
