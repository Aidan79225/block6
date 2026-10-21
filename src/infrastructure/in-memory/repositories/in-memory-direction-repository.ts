import type { Direction } from "@/domain/entities/direction";
import type { DirectionRepository } from "@/domain/repositories/direction-repository";

export class InMemoryDirectionRepository implements DirectionRepository {
  private readonly byUser = new Map<string, Direction[]>();

  async findForUser(userId: string): Promise<Direction[]> {
    return [...(this.byUser.get(userId) ?? [])];
  }

  async replaceAll(
    userId: string,
    directions: readonly Direction[],
  ): Promise<void> {
    this.byUser.set(userId, [...directions]);
  }
}
