import type { ProjectStep } from "@/domain/entities/project-step";
import type { ProjectStepRepository } from "@/domain/repositories/project-step-repository";
import {
  fetchStepsByProject,
  fetchProjectStepById,
  insertProjectStep,
  updateProjectStepRow,
  deleteProjectStepRow,
  reorderProjectStepRows,
} from "@/infrastructure/supabase/database";

export class SupabaseProjectStepRepository implements ProjectStepRepository {
  findByProject(projectId: string): Promise<ProjectStep[]> {
    return fetchStepsByProject(projectId);
  }
  findById(id: string): Promise<ProjectStep | null> {
    return fetchProjectStepById(id);
  }
  add(step: ProjectStep): Promise<void> {
    return insertProjectStep(step);
  }
  update(step: ProjectStep): Promise<void> {
    return updateProjectStepRow(step);
  }
  delete(id: string): Promise<void> {
    return deleteProjectStepRow(id);
  }
  reorder(orderedIds: string[]): Promise<void> {
    return reorderProjectStepRows(orderedIds);
  }
}
