import { OkrCycle, createOkrCycle } from "@/domain/entities/okr-cycle";
import { OkrCycleRepository } from "@/domain/repositories/okr-cycle-repository";

export interface UpdateOkrCycleInput {
  name: string;
  startDate: Date;
  endDate: Date;
}

export class UpdateOkrCycleUseCase {
  constructor(private readonly repo: OkrCycleRepository) {}

  async execute(id: string, input: UpdateOkrCycleInput): Promise<OkrCycle> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error(`OkrCycle ${id} not found`);
    const updated = createOkrCycle({
      id: existing.id,
      userId: existing.userId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: existing.createdAt,
    });
    await this.repo.update(updated);
    return updated;
  }
}
