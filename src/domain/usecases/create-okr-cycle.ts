import { OkrCycle, createOkrCycle } from "@/domain/entities/okr-cycle";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export class CreateOkrCycleUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(userId: string, name: string, startDate: Date, endDate: Date): Promise<OkrCycle> {
    const cycle = createOkrCycle({
      id: crypto.randomUUID(),
      userId,
      name,
      startDate,
      endDate,
      createdAt: new Date(),
    });
    await this.repo.add(cycle);
    return cycle;
  }
}
