import {
  createDirection,
  MAX_DIRECTIONS,
  type Direction,
} from "@/domain/entities/direction";
import type { DirectionRepository } from "@/domain/repositories/direction-repository";

export interface DirectionDraft {
  /** Kept for a direction that already exists, so links to it survive. */
  id?: string;
  text: string;
  titles: readonly string[];
}

export interface SetDirectionsInput {
  userId: string;
  drafts: readonly DirectionDraft[];
}

/**
 * Save the user's directions as a whole. Blank lines are dropped — clearing a
 * line is how a direction is let go — and the rest take positions in order.
 */
export class SetDirectionsUseCase {
  constructor(private readonly repo: DirectionRepository) {}

  async execute(input: SetDirectionsInput): Promise<Direction[]> {
    const kept = input.drafts.filter((d) => d.text.trim());
    if (kept.length > MAX_DIRECTIONS)
      throw new Error(`At most ${MAX_DIRECTIONS} directions`);
    const directions = kept.map((d, position) =>
      createDirection({
        id: d.id ?? crypto.randomUUID(),
        userId: input.userId,
        position,
        text: d.text,
        titles: d.titles,
      }),
    );
    await this.repo.replaceAll(input.userId, directions);
    return directions;
  }
}

export class ListDirectionsUseCase {
  constructor(private readonly repo: DirectionRepository) {}

  async execute(userId: string): Promise<Direction[]> {
    const directions = await this.repo.findForUser(userId);
    return [...directions].sort((a, b) => a.position - b.position);
  }
}
