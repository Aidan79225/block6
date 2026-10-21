"use client";

import { WEEKLY_PROMPT } from "@/domain/usecases/weekly-prompt";

interface WeeklyPromptBannerProps {
  canRemind: boolean;
  remindEnabled: boolean;
  onDismiss: () => void;
  onEnableReminder: () => void;
}

const buttonStyle = {
  background: "var(--color-bg-tertiary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  padding: "4px 10px",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;

/** The first visit of a week asks what is different — not to plan again. */
export function WeeklyPromptBanner({
  canRemind,
  remindEnabled,
  onDismiss,
  onEnableReminder,
}: WeeklyPromptBannerProps) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px",
        background: "var(--color-bg-secondary)",
        borderLeft: "4px solid var(--color-accent)",
        borderRadius: "var(--radius-md)",
        padding: "8px 16px",
        marginBottom: "12px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong
          style={{ fontSize: "14px", color: "var(--color-text-primary)" }}
        >
          {WEEKLY_PROMPT}
        </strong>
        <p style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          常駐節奏已經排好，只要改不一樣的格子。
        </p>
      </div>
      {canRemind && !remindEnabled && (
        <button onClick={onEnableReminder} style={buttonStyle}>
          每週一提醒我
        </button>
      )}
      <button onClick={onDismiss} style={buttonStyle}>
        知道了
      </button>
    </div>
  );
}
