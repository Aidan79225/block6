"use client";

import { useState } from "react";
import { MAX_DIRECTIONS, type Direction } from "@/domain/entities/direction";
import type { DirectionDraft } from "@/domain/usecases/set-directions";
import { directionColor } from "./direction-color";

interface DirectionEditorProps {
  directions: Direction[];
  /** Activities to sort into directions, most relevant first. */
  titles: string[];
  onSave: (drafts: DirectionDraft[]) => void;
  isSaving: boolean;
}

const sectionStyle = {
  background: "var(--color-bg-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
} as const;

const fieldStyle = {
  background: "var(--color-bg-tertiary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  padding: "8px",
  fontSize: "14px",
} as const;

/**
 * Write the three lines, then say once which activities move each one
 * forward. That is all the input directions ever need: from then on every
 * week's blocks count toward them on their own.
 */
export function DirectionEditor({
  directions,
  titles,
  onSave,
  isSaving,
}: DirectionEditorProps) {
  const [lines, setLines] = useState(() =>
    Array.from({ length: MAX_DIRECTIONS }, (_, i) => directions[i]?.text ?? ""),
  );
  // Which line (0-based) each activity belongs to.
  const [lineOfTitle, setLineOfTitle] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    directions.forEach((d, i) => d.titles.forEach((t) => (out[t] = i)));
    return out;
  });

  const allTitles = [...new Set([...titles, ...Object.keys(lineOfTitle)])];

  const save = () =>
    onSave(
      lines.map((text, i) => ({
        id: directions[i]?.id,
        text,
        titles: allTitles.filter((t) => lineOfTitle[t] === i),
      })),
    );

  return (
    <>
      <section style={sectionStyle}>
        <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
          我的方向
        </h2>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          最多三行字。沒有數字、沒有期限，隨時可改，改了不算失敗。
        </p>
        {lines.map((text, i) => (
          <input
            key={i}
            value={text}
            onChange={(e) =>
              setLines((prev) =>
                prev.map((l, j) => (j === i ? e.target.value : l)),
              )
            }
            placeholder={`方向 ${i + 1}`}
            aria-label={`方向 ${i + 1}`}
            maxLength={40}
            style={{
              ...fieldStyle,
              borderLeft: `4px solid ${directionColor(i)}`,
            }}
          />
        ))}
      </section>
      <section style={sectionStyle}>
        <h2 style={{ fontSize: "16px", color: "var(--color-text-primary)" }}>
          哪些活動在推進它們？
        </h2>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          每個活動標一次就好，之後每週的格子會自動算進去。
        </p>
        {allTitles.length === 0 && (
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            還沒有活動。先在週計畫裡排幾格，或設好常駐節奏。
          </p>
        )}
        {allTitles.map((title) => (
          <label
            key={title}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              fontSize: "14px",
              color: "var(--color-text-primary)",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </span>
            <select
              value={lineOfTitle[title] ?? ""}
              onChange={(e) =>
                setLineOfTitle((prev) => {
                  const next = { ...prev };
                  if (e.target.value === "") delete next[title];
                  else next[title] = Number(e.target.value);
                  return next;
                })
              }
              aria-label={`${title} 屬於哪個方向`}
              style={{ ...fieldStyle, padding: "4px", maxWidth: "50%" }}
            >
              <option value="">— 不屬於任何方向 —</option>
              {lines.map((text, i) =>
                text.trim() ? (
                  <option key={i} value={i}>
                    {text.trim()}
                  </option>
                ) : null,
              )}
            </select>
          </label>
        ))}
        <button
          onClick={save}
          disabled={isSaving}
          style={{
            alignSelf: "flex-end",
            background: "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "white",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? "儲存中…" : "儲存"}
        </button>
      </section>
    </>
  );
}
