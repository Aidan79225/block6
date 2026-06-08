export interface OkrCycle {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly createdAt: Date;
}

export interface CreateOkrCycleInput {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export function createOkrCycle(input: CreateOkrCycleInput): OkrCycle {
  if (!input.name.trim()) throw new Error("OkrCycle name is required");
  if (input.endDate.getTime() <= input.startDate.getTime())
    throw new Error("endDate must be after startDate");
  return { ...input };
}
