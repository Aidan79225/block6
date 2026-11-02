/** A direction's theme color, by its position (CSS custom properties). */
export function directionColor(position: number): string {
  return `var(--color-direction-${position + 1})`;
}

/** Blocks whose activity belongs to no direction. */
export const UNTAGGED_COLOR = "var(--color-text-muted)";
