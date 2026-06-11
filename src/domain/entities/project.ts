export type ProjectStatus = "active" | "archived";

export interface Project {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly keyResultId: string | null;
  readonly status: ProjectStatus;
  readonly position: number;
  readonly createdAt: Date;
}

export interface CreateProjectInput {
  id: string;
  userId: string;
  title: string;
  keyResultId?: string | null;
  status?: ProjectStatus;
  position: number;
  createdAt: Date;
}

export function createProject(input: CreateProjectInput): Project {
  if (!input.title.trim()) throw new Error("Project title is required");
  if (input.position < 0) throw new Error("position must be non-negative");
  return {
    ...input,
    keyResultId: input.keyResultId ?? null,
    status: input.status ?? "active",
  };
}
