import { ObjectiveRepository } from "@/domain/repositories/objective-repository";

export class DeleteObjectiveUseCase {
  constructor(private readonly repo: ObjectiveRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
