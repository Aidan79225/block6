import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class DeleteOkrCycleUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
