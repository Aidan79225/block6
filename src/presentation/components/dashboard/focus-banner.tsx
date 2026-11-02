"use client";

import type { Direction } from "@/domain/entities/direction";
import { directionColor } from "@/presentation/components/direction/direction-color";

interface FocusBannerProps {
  direction: Direction;
  /** Blocks this week gives the direction so far. */
  count: number;
  /** Blocks it got the week before, for comparison. */
  previousCount: number;
}

/** What last week's review asked this week to pull back, and how it is going. */
export function FocusBanner({
  direction,
  count,
  previousCount,
}: FocusBannerProps) {
  return (
    <div
      role="status"
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: `4px solid ${directionColor(direction.position)}`,
        borderRadius: "var(--radius-md)",
        padding: "8px 16px",
        marginBottom: "12px",
        fontSize: "13px",
        color: "var(--color-text-primary)",
      }}
    >
      這週想把「{direction.text}」拉回來：目前 {count} 格（上週 {previousCount}{" "}
      格）
    </div>
  );
}
