"use client";

import { useState, useRef } from "react";

export interface TitleSuggestion {
  title: string;
  count: number;
}

interface Props {
  value: string;
  suggestions: TitleSuggestion[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TaskTitleAutocomplete({
  value,
  suggestions,
  onChange,
  placeholder = "任務名稱",
}: Props) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = value.trim()
    ? suggestions.filter((s) =>
        s.title.toLowerCase().includes(value.toLowerCase()),
      )
    : suggestions;

  const handleFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const handlePick = (title: string) => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    onChange(title);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--color-text-primary)",
          padding: "8px",
          fontSize: "14px",
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "2px",
            maxHeight: "160px",
            overflowY: "auto",
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            listStyle: "none",
            padding: "4px 0",
            margin: 0,
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {filtered.map((s) => (
            <li
              key={s.title}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                handlePick(s.title);
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                cursor: "pointer",
                color: "var(--color-text-primary)",
                fontSize: "13px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-bg-tertiary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span>{s.title}</span>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "11px",
                  marginLeft: "12px",
                }}
              >
                ×{s.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
