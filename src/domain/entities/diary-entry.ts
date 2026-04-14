export interface DiaryEntry {
  readonly id: string;
  readonly userId: string;
  readonly entryDate: Date;
  readonly bad: string;
  readonly good: string;
  readonly next: string;
  readonly createdAt: Date;
}

export interface CreateDiaryEntryInput {
  id: string;
  userId: string;
  entryDate: Date;
  bad: string;
  good: string;
  next: string;
  createdAt: Date;
}

export function createDiaryEntry(input: CreateDiaryEntryInput): DiaryEntry {
  if (!input.bad.trim() || !input.good.trim() || !input.next.trim()) {
    throw new Error("All three diary fields are required");
  }
  return { ...input };
}
