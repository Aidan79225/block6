"use client";

import type { DiaryMode } from "@/domain/usecases/diary-window";
import { DiaryForm } from "./diary-form";
import { DiaryReadOnlyView } from "./diary-readonly-view";

export interface DiaryDay {
  dateKey: string;
  /** e.g. "週三 10/21" */
  label: string;
  mode: DiaryMode;
}

interface DiaryPanelProps {
  days: DiaryDay[];
  selectedDateKey: string | null;
  onSelectDay: (dateKey: string) => void;
  lines: { bad: string; good: string; next: string } | null;
  onSave: (bad: string, good: string, next: string) => void;
  onClose: () => void;
}

/**
 * The diary on its own, without picking a block first: one tab per day of
 * the week, writable for the days the diary window still covers.
 */
export function DiaryPanel({
  days,
  selectedDateKey,
  onSelectDay,
  lines,
  onSave,
  onClose,
}: DiaryPanelProps) {
  const selected = days.find((d) => d.dateKey === selectedDateKey) ?? null;

  return (
    <aside
      className="side-panel"
      style={{
        background: "var(--color-panel-bg)",
        borderLeft: "1px solid var(--color-border)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
          日記
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          &times;
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {days.map((d) => (
          <button
            key={d.dateKey}
            onClick={() => onSelectDay(d.dateKey)}
            disabled={d.mode === "hidden"}
            aria-pressed={d.dateKey === selectedDateKey}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              background:
                d.dateKey === selectedDateKey
                  ? "var(--color-accent)"
                  : "var(--color-bg-tertiary)",
              color:
                d.dateKey === selectedDateKey
                  ? "white"
                  : "var(--color-text-secondary)",
              fontSize: "12px",
              cursor: d.mode === "hidden" ? "not-allowed" : "pointer",
              opacity: d.mode === "hidden" ? 0.4 : 1,
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
      {selected?.mode === "editable" && (
        <DiaryForm
          key={selected.dateKey}
          bad={lines?.bad ?? ""}
          good={lines?.good ?? ""}
          next={lines?.next ?? ""}
          onSave={onSave}
        />
      )}
      {selected?.mode === "readonly" &&
        (lines ? (
          <DiaryReadOnlyView
            bad={lines.bad}
            good={lines.good}
            next={lines.next}
          />
        ) : (
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            這天沒有寫日記。
          </p>
        ))}
      {(!selected || selected.mode === "hidden") && (
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
          這天還沒到。
        </p>
      )}
    </aside>
  );
}
