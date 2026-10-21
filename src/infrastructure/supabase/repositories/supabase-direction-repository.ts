import type { Direction } from "@/domain/entities/direction";
import type { DirectionRepository } from "@/domain/repositories/direction-repository";
import {
  fetchDirections,
  replaceDirectionRows,
} from "@/infrastructure/supabase/database";

export class SupabaseDirectionRepository implements DirectionRepository {
  findForUser(userId: string): Promise<Direction[]> {
    return fetchDirections(userId);
  }
  // The RPC acts as the signed-in user, so `userId` is implied by the session.
  replaceAll(_userId: string, directions: readonly Direction[]): Promise<void> {
    return replaceDirectionRows(directions);
  }
}
