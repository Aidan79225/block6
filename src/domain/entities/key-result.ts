export interface KeyResult {
  readonly id: string;
  readonly objectiveId: string;
  readonly title: string;
  readonly unit: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateKeyResultInput {
  id: string;
  objectiveId: string;
  title: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  position: number;
  createdAt: Date;
}

export function createKeyResult(input: CreateKeyResultInput): KeyResult {
  if (!input.title.trim()) throw new Error("KeyResult title is required");
  if (input.targetValue <= 0) throw new Error("targetValue must be positive");
  if (input.currentValue < 0)
    throw new Error("currentValue must be non-negative");
  if (input.position < 0) throw new Error("position must be non-negative");
  return { ...input };
}

export function keyResultProgress(kr: KeyResult): number {
  return Math.max(0, Math.min(1, kr.currentValue / kr.targetValue));
}
