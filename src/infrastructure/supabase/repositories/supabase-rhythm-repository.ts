import type { Rhythm } from "@/domain/entities/rhythm";
import type { RhythmRepository } from "@/domain/repositories/rhythm-repository";
import {
  fetchRhythmHistory,
  saveRhythmVersion,
} from "@/infrastructure/supabase/database";

export class SupabaseRhythmRepository implements RhythmRepository {
  findHistory(userId: string): Promise<Rhythm[]> {
    return fetchRhythmHistory(userId);
  }
  save(rhythm: Rhythm): Promise<void> {
    return saveRhythmVersion(rhythm);
  }
}
