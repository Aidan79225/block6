import { adoptRhythm } from "@/domain/entities/rhythm";
import type { Rhythm } from "@/domain/entities/rhythm";
import type { RhythmRepository } from "@/domain/repositories/rhythm-repository";

export class InMemoryRhythmRepository implements RhythmRepository {
  private readonly byUser = new Map<string, Rhythm[]>();

  async findHistory(userId: string): Promise<Rhythm[]> {
    return [...(this.byUser.get(userId) ?? [])];
  }

  async save(rhythm: Rhythm): Promise<void> {
    const history = this.byUser.get(rhythm.userId) ?? [];
    this.byUser.set(rhythm.userId, adoptRhythm(history, rhythm));
  }
}
