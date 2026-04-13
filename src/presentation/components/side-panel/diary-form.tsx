"use client";
import { useState } from "react";

interface DiaryFormProps { line1: string; line2: string; line3: string; onSave: (line1: string, line2: string, line3: string) => void; }

export function DiaryForm({ line1: initialLine1, line2: initialLine2, line3: initialLine3, onSave }: DiaryFormProps) {
  const [line1, setLine1] = useState(initialLine1);
  const [line2, setLine2] = useState(initialLine2);
  const [line3, setLine3] = useState(initialLine3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ color: "var(--color-text-secondary)", fontSize: "13px", fontWeight: 600 }}>情緒日記</label>
      <input type="text" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="第一行..."
        style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", padding: "8px", fontSize: "14px" }} />
      <input type="text" value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="第二行..."
        style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", padding: "8px", fontSize: "14px" }} />
      <input type="text" value={line3} onChange={(e) => setLine3(e.target.value)} placeholder="第三行..."
        style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", padding: "8px", fontSize: "14px" }} />
      <button onClick={() => onSave(line1, line2, line3)} aria-label="儲存"
        style={{ background: "var(--color-accent)", border: "none", borderRadius: "var(--radius-sm)", color: "white", padding: "8px 16px", cursor: "pointer", fontSize: "14px", fontWeight: 600, alignSelf: "flex-end" }}>
        儲存
      </button>
    </div>
  );
}
