export interface DiaryEntry {
  readonly id: string; readonly userId: string; readonly entryDate: Date;
  readonly line1: string; readonly line2: string; readonly line3: string; readonly createdAt: Date;
}
export interface CreateDiaryEntryInput {
  id: string; userId: string; entryDate: Date; line1: string; line2: string; line3: string; createdAt: Date;
}

export function createDiaryEntry(input: CreateDiaryEntryInput): DiaryEntry {
  if (!input.line1.trim() || !input.line2.trim() || !input.line3.trim()) throw new Error("All three lines are required");
  return { ...input };
}
