import { OkrCycle } from "@/domain/entities/okr-cycle";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class ListOkrCyclesUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(userId: string): Promise<OkrCycle[]> {
    return this.repo.findForUser(userId);
  }
}
