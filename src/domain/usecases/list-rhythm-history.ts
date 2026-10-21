import { Rhythm } from "@/domain/entities/rhythm";
import { RhythmRepository } from "@/domain/repositories/rhythm-repository";

export class ListRhythmHistoryUseCase {
  constructor(private readonly repo: RhythmRepository) {}

  async execute(userId: string): Promise<Rhythm[]> {
    return this.repo.findHistory(userId);
  }
}
