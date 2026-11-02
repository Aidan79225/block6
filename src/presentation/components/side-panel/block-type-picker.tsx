"use client";
import { BlockType } from "@/domain/entities/block";

const typeOptions: { value: BlockType; label: string; color: string }[] = [
  { value: BlockType.Core, label: "核心", color: "var(--color-block-core)" },
  { value: BlockType.Rest, label: "休息", color: "var(--color-block-rest)" },
  {
    value: BlockType.Buffer,
    label: "緩衝",
    color: "var(--color-block-buffer)",
  },
  {
    value: BlockType.General,
    label: "一般",
    color: "var(--color-block-general)",
  },
];

interface BlockTypePickerProps {
  value: BlockType;
  onChange: (blockType: BlockType) => void;
}

export function BlockTypePicker({ value, onChange }: BlockTypePickerProps) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {typeOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          style={{
            padding: "4px 12px",
            borderRadius: "var(--radius-sm)",
            border:
              value === opt.value
                ? `2px solid ${opt.color}`
                : "1px solid var(--color-border)",
            background:
              value === opt.value ? opt.color : "var(--color-bg-tertiary)",
            color:
              value === opt.value
                ? "var(--color-bg-primary)"
                : "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: value === opt.value ? 600 : 400,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
