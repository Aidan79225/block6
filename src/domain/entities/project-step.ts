export interface ProjectStep {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly position: number;
  readonly completed: boolean;
  readonly createdAt: Date;
}

export interface CreateProjectStepInput {
  id: string;
  projectId: string;
  title: string;
  position: number;
  completed?: boolean;
  createdAt: Date;
}

export function createProjectStep(input: CreateProjectStepInput): ProjectStep {
  if (!input.title.trim()) throw new Error("ProjectStep title is required");
  if (input.position < 0) throw new Error("position must be non-negative");
  return { ...input, completed: input.completed ?? false };
}
