"use client";

import { useState } from "react";

interface BlockTimerProps {
  elapsedSeconds: number;
  isActive: boolean;
  otherBlockIsActive: boolean;
  onStart: () => void;
  onStop: () => void;
  onAddManual: (startedAt: Date, endedAt: Date) => void;
}

function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BlockTimer({
  elapsedSeconds,
  isActive,
  otherBlockIsActive,
  onStart,
  onStop,
  onAddManual,
}: BlockTimerProps) {
  const [showManual, setShowManual] = useState(false);
  const [startedAt, setStartedAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() - 60 * 60 * 1000)),
  );
  const [endedAt, setEndedAt] = useState(() => toLocalInputValue(new Date()));

  const handleStartClick = () => {
    if (otherBlockIsActive) {
      const confirmed = window.confirm(
        "其他區塊正在計時中，開始此任務會自動停止。確定嗎？",
      );
      if (!confirmed) return;
    }
    onStart();
  };

  const handleManualSubmit = () => {
    const s = new Date(startedAt);
    const e = new Date(endedAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
      window.alert("結束時間必須晚於開始時間");
      return;
    }
    onAddManual(s, e);
    setShowManual(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        計時
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--color-bg-tertiary)",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: 600,
            fontFamily: "monospace",
            color: isActive
              ? "var(--color-status-in-progress)"
              : "var(--color-text-primary)",
          }}
        >
          {formatHMS(elapsedSeconds)}
        </span>
        {isActive ? (
          <button
            onClick={onStop}
            style={{
              marginLeft: "auto",
              background: "var(--color-block-buffer)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ⏸ 停止計時
          </button>
        ) : (
          <button
            onClick={handleStartClick}
            style={{
              marginLeft: "auto",
              background: "var(--color-accent)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ▶ 開始計時
          </button>
        )}
      </div>
      {!showManual ? (
        <button
          onClick={() => setShowManual(true)}
          style={{
            background: "none",
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-secondary)",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          + 手動新增
        </button>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "8px",
            background: "var(--color-bg-tertiary)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <label
            style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}
          >
            開始時間
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              style={{
                marginLeft: "6px",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 4px",
                fontSize: "12px",
              }}
            />
          </label>
          <label
            style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}
          >
            結束時間
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              style={{
                marginLeft: "6px",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 4px",
                fontSize: "12px",
              }}
            />
          </label>
          <div
            style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}
          >
            <button
              onClick={() => setShowManual(false)}
              style={{
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-secondary)",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              取消
            </button>
            <button
              onClick={handleManualSubmit}
              style={{
                background: "var(--color-accent)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              新增
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
