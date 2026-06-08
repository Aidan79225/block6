import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class ReorderKeyResultsUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(orderedIds: string[]): Promise<void> {
    await this.repo.reorder(orderedIds);
  }
}
