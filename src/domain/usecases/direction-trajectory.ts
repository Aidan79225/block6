import type { Block } from "@/domain/entities/block";
import { directionOfTitle, type Direction } from "@/domain/entities/direction";

/** How one week's blocks split between the directions. */
export interface WeekTrajectory {
  readonly weekKey: string;
  /** Blocks per direction id. */
  readonly byDirection: Readonly<Record<string, number>>;
  /** Blocks whose activity belongs to no direction — just as telling. */
  readonly untagged: number;
}

/** Count a week's visible blocks per direction. */
export function weekTrajectory(
  weekKey: string,
  blocks: readonly Block[],
  directions: readonly Direction[],
): WeekTrajectory {
  const byDirection: Record<string, number> = {};
  for (const d of directions) byDirection[d.id] = 0;
  let untagged = 0;
  for (const block of blocks) {
    if (block.suppressed) continue;
    const direction = directionOfTitle(directions, block.title);
    if (direction) byDirection[direction.id] += 1;
    else untagged += 1;
  }
  return { weekKey, byDirection, untagged };
}

/** The direction that got the most blocks that week, or null for none. */
export function dominantDirection(week: WeekTrajectory): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of Object.entries(week.byDirection)) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}
