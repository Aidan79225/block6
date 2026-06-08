import { KeyResultRepository } from "@/domain/repositories/key-result-repository";

export class DeleteKeyResultUseCase {
  constructor(private readonly repo: KeyResultRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
