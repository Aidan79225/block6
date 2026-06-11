import { Project } from "@/domain/entities/project";

export interface ProjectRepository {
  findForUser(userId: string): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  add(project: Project): Promise<void>;
  update(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
