import { BlockType } from "@/domain/entities/block";

/** Each block type's theme color, as CSS custom properties. */
export const BLOCK_TYPE_COLOR: Record<BlockType, string> = {
  [BlockType.Core]: "var(--color-block-core)",
  [BlockType.Rest]: "var(--color-block-rest)",
  [BlockType.Buffer]: "var(--color-block-buffer)",
  [BlockType.General]: "var(--color-block-general)",
};
