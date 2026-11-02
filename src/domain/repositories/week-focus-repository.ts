/** The direction a user wants to give more time to in a given week. */
export interface WeekFocusRepository {
  find(userId: string, weekKey: string): Promise<string | null>;
  save(
    userId: string,
    weekKey: string,
    directionId: string | null,
  ): Promise<void>;
}
