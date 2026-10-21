/**
 * A long-term direction: one line of text, no target, no deadline, changed
 * at will — changing it is not failing it (docs/product-core.md §七).
 * It owns the activity titles that move it forward, so the weeks' blocks show
 * how much time it really gets, without anyone tagging blocks week by week.
 */
export interface Direction {
  readonly id: string;
  readonly userId: string;
  /** 0-based order among the user's directions. */
  readonly position: number;
  readonly text: string;
  readonly titles: readonly string[];
}

/** "三行字": a person gets at most three directions. */
export const MAX_DIRECTIONS = 3;

export function createDirection(input: Direction): Direction {
  const text = input.text.trim();
  if (!text) throw new Error("Direction text is required");
  if (input.position < 0 || input.position >= MAX_DIRECTIONS)
    throw new Error(`position must be between 0 and ${MAX_DIRECTIONS - 1}`);
  const titles = [
    ...new Set(input.titles.map((t) => t.trim()).filter(Boolean)),
  ];
  return { ...input, text, titles };
}

/** The direction an activity title belongs to, if any. */
export function directionOfTitle(
  directions: readonly Direction[],
  title: string,
): Direction | null {
  const t = title.trim();
  if (!t) return null;
  return directions.find((d) => d.titles.includes(t)) ?? null;
}

/**
 * Move an activity title to one direction (or to none). A title belongs to
 * at most one direction, so it leaves wherever it was before.
 */
export function assignTitle(
  directions: readonly Direction[],
  title: string,
  directionId: string | null,
): Direction[] {
  const t = title.trim();
  return directions.map((d) => {
    const without = d.titles.filter((x) => x !== t);
    return d.id === directionId && t
      ? { ...d, titles: [...without, t] }
      : { ...d, titles: without };
  });
}
