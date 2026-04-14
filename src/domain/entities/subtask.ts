export interface Subtask {
  readonly id: string;
  readonly blockId: string;
  readonly title: string;
  readonly completed: boolean;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateSubtaskInput {
  id: string;
  blockId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: Date;
}

export function createSubtask(input: CreateSubtaskInput): Subtask {
  if (!input.title.trim()) {
    throw new Error("Subtask title is required");
  }
  if (input.position < 0) {
    throw new Error("position must be non-negative");
  }
  return { ...input };
}
