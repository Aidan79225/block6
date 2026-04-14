import { TimerSession } from "@/domain/entities/timer-session";

export interface TimerSessionRepository {
  findByBlockIds(blockIds: string[]): Promise<TimerSession[]>;
  findActiveForUser(userId: string): Promise<TimerSession | null>;
  startForBlock(userId: string, blockId: string): Promise<TimerSession>;
  stopActive(userId: string): Promise<void>;
  addManual(
    userId: string,
    blockId: string,
    startedAt: Date,
    endedAt: Date,
  ): Promise<TimerSession>;
}
