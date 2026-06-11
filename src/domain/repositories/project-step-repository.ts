import { ProjectStep } from "@/domain/entities/project-step";

export interface ProjectStepRepository {
  findByProject(projectId: string): Promise<ProjectStep[]>;
  findById(id: string): Promise<ProjectStep | null>;
  add(step: ProjectStep): Promise<void>;
  update(step: ProjectStep): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
