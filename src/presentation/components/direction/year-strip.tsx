"use client";

import type { Direction } from "@/domain/entities/direction";
import {
  dominantDirection,
  type WeekTrajectory,
} from "@/domain/usecases/direction-trajectory";
import { directionColor } from "./direction-color";

interface YearStripProps {
  /** Every week key of the year, in order. */
  weekKeys: string[];
  currentWeekKey: string;
  /** Trajectory of the weeks lived so far. */
  weeks: WeekTrajectory[];
  directions: Direction[];
}

/**
 * A year has only 52 weeks — the 42-block scarcity, one level up. Each lived
 * week takes the color of the direction it gave the most time to.
 */
export function YearStrip({
  weekKeys,
  currentWeekKey,
  weeks,
  directions,
}: YearStripProps) {
  const byKey = new Map(weeks.map((w) => [w.weekKey, w]));
  const remaining = weekKeys.filter((k) => k > currentWeekKey).length;

  const colorOf = (weekKey: string): string => {
    const week = byKey.get(weekKey);
    if (!week) return "transparent";
    const id = dominantDirection(week);
    const direction = directions.find((d) => d.id === id);
    return direction
      ? directionColor(direction.position)
      : "var(--color-bg-tertiary)";
  };

  return (
    <section
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
        今年只有 {weekKeys.length} 週
      </h2>
      <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
        還剩 {remaining} 週。
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(13, minmax(0, 1fr))",
          gap: "3px",
        }}
      >
        {weekKeys.map((weekKey) => (
          <div
            key={weekKey}
            title={weekKey}
            aria-current={weekKey === currentWeekKey ? "date" : undefined}
            style={{
              aspectRatio: "1",
              borderRadius: "2px",
              background: colorOf(weekKey),
              border:
                weekKey === currentWeekKey
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
