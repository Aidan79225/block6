export interface Objective {
  readonly id: string;
  readonly cycleId: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateObjectiveInput {
  id: string;
  cycleId: string;
  title: string;
  description: string;
  position: number;
  createdAt: Date;
}

export function createObjective(input: CreateObjectiveInput): Objective {
  if (!input.title.trim()) throw new Error("Objective title is required");
  if (input.position < 0) throw new Error("position must be non-negative");
  return { ...input };
}
