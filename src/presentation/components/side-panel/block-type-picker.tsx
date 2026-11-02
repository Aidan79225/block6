"use client";
import { BlockType } from "@/domain/entities/block";
import { BLOCK_TYPE_COLOR } from "@/presentation/components/block-type-color";

const typeOptions: { value: BlockType; label: string }[] = [
  { value: BlockType.Core, label: "核心" },
  { value: BlockType.Rest, label: "休息" },
  { value: BlockType.Buffer, label: "緩衝" },
  { value: BlockType.General, label: "一般" },
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
                ? `2px solid ${BLOCK_TYPE_COLOR[opt.value]}`
                : "1px solid var(--color-border)",
            background:
              value === opt.value
                ? BLOCK_TYPE_COLOR[opt.value]
                : "var(--color-bg-tertiary)",
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
