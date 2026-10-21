"use client";

import type { Direction } from "@/domain/entities/direction";
import type { WeekTrajectory } from "@/domain/usecases/direction-trajectory";
import { directionColor, UNTAGGED_COLOR } from "./direction-color";

interface TrajectoryChartProps {
  directions: Direction[];
  weeks: WeekTrajectory[];
}

// A week holds 42 blocks; bars are drawn against that, not the busiest week,
// so a half-planned week looks half-planned.
const BLOCKS_PER_WEEK = 42;
const CHART_HEIGHT = 140;

function weekLabel(weekKey: string): string {
  const [, month, day] = weekKey.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/**
 * Blocks per direction, week by week. Seeing one direction fall from 12
 * blocks to 2 needs no one to say it drifted — and the untagged share is just
 * as telling.
 */
export function TrajectoryChart({ directions, weeks }: TrajectoryChartProps) {
  const series = [
    ...directions.map((d) => ({
      key: d.id,
      label: d.text,
      color: directionColor(d.position),
      count: (w: WeekTrajectory) => w.byDirection[d.id] ?? 0,
    })),
    {
      key: "untagged",
      label: "未標",
      color: UNTAGGED_COLOR,
      count: (w: WeekTrajectory) => w.untagged,
    },
  ];

  return (
    <section
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
        軌跡
      </h2>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "4px",
          height: `${CHART_HEIGHT}px`,
        }}
      >
        {weeks.map((w) => (
          <div
            key={w.weekKey}
            role="img"
            aria-label={`${weekLabel(w.weekKey)} 那週：${series
              .map((s) => `${s.label} ${s.count(w)} 格`)
              .join("、")}`}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column-reverse",
              height: "100%",
            }}
          >
            {series.map((s) => (
              <div
                key={s.key}
                style={{
                  height: `${(s.count(w) / BLOCKS_PER_WEEK) * 100}%`,
                  background: s.color,
                  opacity: s.key === "untagged" ? 0.5 : 1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {weeks.map((w) => (
          <span
            key={w.weekKey}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              fontSize: "10px",
              color: "var(--color-text-muted)",
            }}
          >
            {weekLabel(w.weekKey)}
          </span>
        ))}
      </div>
      <ul
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          listStyle: "none",
          fontSize: "12px",
          color: "var(--color-text-secondary)",
        }}
      >
        {series.map((s) => (
          <li
            key={s.key}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                background: s.color,
              }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
