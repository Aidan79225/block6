import { DiaryEntry, createDiaryEntry } from "@/domain/entities/diary-entry";
import { DiaryRepository } from "@/domain/repositories/diary-repository";

export interface WriteDiaryInput {
  userId: string;
  entryDate: Date;
  line1: string;
  line2: string;
  line3: string;
}

export class WriteDiaryUseCase {
  constructor(private readonly repo: DiaryRepository) {}

  async execute(input: WriteDiaryInput): Promise<DiaryEntry> {
    const existing = await this.repo.findByUserAndDate(input.userId, input.entryDate);

    if (existing) {
      const updated: DiaryEntry = {
        ...existing,
        line1: input.line1,
        line2: input.line2,
        line3: input.line3,
      };
      await this.repo.update(updated);
      return updated;
    }

    const entry = createDiaryEntry({
      id: crypto.randomUUID(),
      userId: input.userId,
      entryDate: input.entryDate,
      line1: input.line1,
      line2: input.line2,
      line3: input.line3,
      createdAt: new Date(),
    });

    await this.repo.save(entry);
    return entry;
  }
}
