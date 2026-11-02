import type { Direction } from "@/domain/entities/direction";

export interface DirectionRepository {
  findForUser(userId: string): Promise<Direction[]>;
  /** Replace the user's directions with these, all or nothing. */
  replaceAll(userId: string, directions: readonly Direction[]): Promise<void>;
}
