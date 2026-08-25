"use client";

import { useState } from "react";

interface Props {
  rhythmSlotCount: number;
  weekBlockCount: number;
  isBusy: boolean;
  onSetFromWeek: () => void;
  onClear: () => void;
}

const buttonStyle = (disabled: boolean) => ({
  background: "var(--color-bg-tertiary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  padding: "4px 10px",
  fontSize: "12px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
  whiteSpace: "nowrap" as const,
});

export function RhythmBar({
  rhythmSlotCount,
  weekBlockCount,
  isBusy,
  onSetFromWeek,
  onClear,
}: Props) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const hasRhythm = rhythmSlotCount > 0;
  const canAdopt = weekBlockCount > 0 && !isBusy;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        marginBottom: "12px",
        padding: "6px 12px",
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <span
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "12px",
          flex: 1,
          minWidth: 0,
        }}
      >
        {hasRhythm
          ? `常駐節奏 ${rhythmSlotCount} 格 — 虛線格子每週自動帶入，改它只影響這一週`
          : "每週都差不多的格子，可以設成常駐節奏，之後不用再排一次"}
      </span>

      {confirmingClear ? (
        <>
          <span
            style={{ color: "var(--color-text-secondary)", fontSize: "12px" }}
          >
            清除節奏？已排好的週不受影響
          </span>
          <button
            onClick={() => setConfirmingClear(false)}
            style={buttonStyle(false)}
          >
            取消
          </button>
          <button
            onClick={() => {
              setConfirmingClear(false);
              onClear();
            }}
            style={{
              ...buttonStyle(false),
              color: "var(--color-block-buffer)",
            }}
          >
            確認清除
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onSetFromWeek}
            disabled={!canAdopt}
            title={weekBlockCount === 0 ? "這週還沒有任何區塊" : undefined}
            style={buttonStyle(!canAdopt)}
          >
            {isBusy ? "處理中…" : hasRhythm ? "更新為這週" : "把這週設為節奏"}
          </button>
          {hasRhythm && (
            <button
              onClick={() => setConfirmingClear(true)}
              disabled={isBusy}
              style={buttonStyle(isBusy)}
            >
              清除
            </button>
          )}
        </>
      )}
    </div>
  );
}
