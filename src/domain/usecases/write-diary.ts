import { DiaryEntry, createDiaryEntry } from "@/domain/entities/diary-entry";
import { DiaryRepository } from "@/domain/repositories/diary-repository";

export interface WriteDiaryInput {
  userId: string;
  entryDate: Date;
  bad: string;
  good: string;
  next: string;
}

export class WriteDiaryUseCase {
  constructor(private readonly diaryRepo: DiaryRepository) {}

  async execute(input: WriteDiaryInput): Promise<DiaryEntry> {
    const existing = await this.diaryRepo.findByUserAndDate(
      input.userId,
      input.entryDate,
    );

    if (existing) {
      const updated = createDiaryEntry({
        ...existing,
        bad: input.bad,
        good: input.good,
        next: input.next,
      });
      await this.diaryRepo.update(updated);
      return updated;
    }

    const entry = createDiaryEntry({
      id: crypto.randomUUID(),
      userId: input.userId,
      entryDate: input.entryDate,
      bad: input.bad,
      good: input.good,
      next: input.next,
      createdAt: new Date(),
    });

    await this.diaryRepo.save(entry);
    return entry;
  }
}
