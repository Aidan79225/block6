"use client";

import { useState } from "react";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { formatDateKey } from "@/lib/date-helpers";

interface Props {
  cycles: OkrCycle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, startDate: Date, endDate: Date) => void;
}

export function CycleSelector({
  cycles,
  selectedId,
  onSelect,
  onCreate,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const submit = () => {
    if (!name.trim() || !start || !end) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate.getTime() <= startDate.getTime()) return;
    onCreate(name.trim(), startDate, endDate);
    setName("");
    setStart("");
    setEnd("");
    setShowForm(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            flex: 1,
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            padding: "6px 10px",
            fontSize: "14px",
          }}
        >
          {cycles.length === 0 && <option value="">尚無週期</option>}
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({formatDateKey(c.startDate)} ~ {formatDateKey(c.endDate)})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          style={{
            background: "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "#fff",
            cursor: "pointer",
            padding: "6px 12px",
            fontSize: "13px",
          }}
        >
          ＋ 新增週期
        </button>
      </div>
      {showForm && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <input
            placeholder="週期名稱 (例 2026 Q3)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={cellStyle}
          />
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={cellStyle}
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={cellStyle}
          />
          <button type="button" onClick={submit} style={cellStyle}>
            建立
          </button>
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  background: "var(--color-bg-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  padding: "6px 10px",
  fontSize: "13px",
};
