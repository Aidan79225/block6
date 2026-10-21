"use client";

import Link from "next/link";
import type { Direction } from "@/domain/entities/direction";
import { directionColor } from "@/presentation/components/direction/direction-color";

interface FocusPickerProps {
  directions: Direction[];
  /** The direction next week is set to pull back, if one was picked. */
  selectedId: string | null;
  onSelect: (directionId: string | null) => void;
}

/**
 * The forward push sits at the review → planning seam, not in a separate
 * quarterly ritual: pick the direction next week should give more time to.
 */
export function FocusPicker({
  directions,
  selectedId,
  onSelect,
}: FocusPickerProps) {
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
        下週想把哪個方向的格數拉回來？
      </h2>
      {directions.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          先到{" "}
          <Link href="/direction" style={{ color: "var(--color-accent)" }}>
            方向
          </Link>{" "}
          寫下你的三行字。
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {directions.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(selectedId === d.id ? null : d.id)}
              aria-pressed={selectedId === d.id}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: `2px solid ${directionColor(d.position)}`,
                background:
                  selectedId === d.id
                    ? directionColor(d.position)
                    : "transparent",
                color:
                  selectedId === d.id
                    ? "var(--color-bg-primary)"
                    : "var(--color-text-primary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {d.text}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
