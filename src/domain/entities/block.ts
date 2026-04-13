export enum BlockType {
  Core = "core",
  Rest = "rest",
  Buffer = "buffer",
}
export enum BlockStatus {
  Planned = "planned",
  InProgress = "in_progress",
  Completed = "completed",
  Skipped = "skipped",
}

export interface Block {
  readonly id: string;
  readonly weekPlanId: string;
  readonly dayOfWeek: number;
  readonly slot: number;
  readonly blockType: BlockType;
  readonly title: string;
  readonly description: string;
  readonly status: BlockStatus;
}

export interface CreateBlockInput {
  id: string;
  weekPlanId: string;
  dayOfWeek: number;
  slot: number;
  blockType: BlockType;
  title: string;
  description: string;
  status: BlockStatus;
}

export function createBlock(input: CreateBlockInput): Block {
  if (input.dayOfWeek < 1 || input.dayOfWeek > 7)
    throw new Error("dayOfWeek must be between 1 and 7");
  if (input.slot < 1 || input.slot > 6)
    throw new Error("slot must be between 1 and 6");
  return { ...input };
}
