import type { DiaryEntry } from "@/domain/entities/diary-entry";
import type { DiaryRepository } from "@/domain/repositories/diary-repository";
import { isSameLocalDay } from "@/lib/date-helpers";

export class InMemoryDiaryRepository implements DiaryRepository {
  private readonly byId = new Map<string, DiaryEntry>();

  async findByUserAndDate(
    userId: string,
    date: Date,
  ): Promise<DiaryEntry | null> {
    for (const e of this.byId.values()) {
      if (e.userId === userId && isSameLocalDay(e.entryDate, date)) return e;
    }
    return null;
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DiaryEntry[]> {
    const start = startOfLocalDay(startDate).getTime();
    const end = startOfLocalDay(endDate).getTime();
    return Array.from(this.byId.values()).filter((e) => {
      if (e.userId !== userId) return false;
      const t = startOfLocalDay(e.entryDate).getTime();
      return t >= start && t <= end;
    });
  }

  async save(entry: DiaryEntry): Promise<void> {
    if (this.byId.has(entry.id)) {
      throw new Error(`Diary entry ${entry.id} already exists`);
    }
    this.byId.set(entry.id, entry);
  }

  async update(entry: DiaryEntry): Promise<void> {
    if (!this.byId.has(entry.id)) {
      throw new Error(`Diary entry ${entry.id} not found`);
    }
    this.byId.set(entry.id, entry);
  }
}

function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
