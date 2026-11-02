import type { Rhythm } from "@/domain/entities/rhythm";

export interface RhythmRepository {
  /** Every rhythm version the user has adopted, in any order. */
  findHistory(userId: string): Promise<Rhythm[]>;
  /**
   * Store `rhythm` as a new version. Versions starting on or after its
   * `effectiveFrom` are replaced, all or nothing.
   */
  save(rhythm: Rhythm): Promise<void>;
}
