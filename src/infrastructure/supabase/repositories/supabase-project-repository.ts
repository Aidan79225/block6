import type { Project } from "@/domain/entities/project";
import type { ProjectRepository } from "@/domain/repositories/project-repository";
import {
  fetchProjectsForUser,
  fetchProjectById,
  insertProject,
  updateProjectRow,
  deleteProjectRow,
  reorderProjectRows,
} from "@/infrastructure/supabase/database";

export class SupabaseProjectRepository implements ProjectRepository {
  findForUser(userId: string): Promise<Project[]> {
    return fetchProjectsForUser(userId);
  }
  findById(id: string): Promise<Project | null> {
    return fetchProjectById(id);
  }
  add(project: Project): Promise<void> {
    return insertProject(project);
  }
  update(project: Project): Promise<void> {
    return updateProjectRow(project);
  }
  delete(id: string): Promise<void> {
    return deleteProjectRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderProjectRows(orderedIds);
  }
}
