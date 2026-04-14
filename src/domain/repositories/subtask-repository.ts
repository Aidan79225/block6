import { Subtask } from "@/domain/entities/subtask";

export interface SubtaskRepository {
  findByBlockIds(blockIds: string[]): Promise<Subtask[]>;
  add(blockId: string, title: string, position: number): Promise<Subtask>;
  toggleCompleted(id: string, completed: boolean): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(blockId: string, orderedIds: string[]): Promise<void>;
}
