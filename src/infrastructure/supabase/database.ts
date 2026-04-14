import { supabase } from "./client";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";
import type { Subtask } from "@/domain/entities/subtask";
import { createSubtask } from "@/domain/entities/subtask";
import type { TimerSession } from "@/domain/entities/timer-session";
import { createTimerSession } from "@/domain/entities/timer-session";

const BLOCK_TYPE_MAP: Record<BlockType, number> = {
  [BlockType.Core]: 1,
  [BlockType.Rest]: 2,
  [BlockType.Buffer]: 3,
  [BlockType.General]: 4,
};

const BLOCK_TYPE_REVERSE: Record<number, BlockType> = {
  1: BlockType.Core,
  2: BlockType.Rest,
  3: BlockType.Buffer,
  4: BlockType.General,
};

interface DbBlock {
  id: string;
  week_plan_id: string;
  day_of_week: number;
  slot: number;
  block_type_id: number;
  title: string | null;
  description: string | null;
  status: string;
}

function dbBlockToEntity(db: DbBlock): Block {
  return createBlock({
    id: db.id,
    weekPlanId: db.week_plan_id,
    dayOfWeek: db.day_of_week,
    slot: db.slot,
    blockType: BLOCK_TYPE_REVERSE[db.block_type_id] ?? BlockType.Core,
    title: db.title ?? "",
    description: db.description ?? "",
    status: db.status as BlockStatus,
  });
}

// --- Week Plans ---

export async function getOrCreateWeekPlan(
  userId: string,
  weekStart: string,
): Promise<string> {
  console.log("[BLOCK6] getOrCreateWeekPlan:", { userId, weekStart });

  const { data: existing, error: findError } = await supabase
    .from("week_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  console.log("[BLOCK6] findWeekPlan result:", { existing, findError });

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("week_plans")
    .insert({ user_id: userId, week_start: weekStart })
    .select("id")
    .single();

  console.log("[BLOCK6] createWeekPlan result:", { created, error });

  if (error) throw new Error(error.message);
  return created!.id;
}

// --- Blocks ---

export async function fetchBlocksForWeek(
  userId: string,
  weekStart: string,
): Promise<Block[]> {
  const { data: plan } = await supabase
    .from("week_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!plan) return [];

  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("week_plan_id", plan.id);

  if (error) throw new Error(error.message);
  return (data as DbBlock[]).map((db) => {
    const block = dbBlockToEntity(db);
    // Use weekStart (date string) as weekPlanId for consistency with local mode
    return createBlock({ ...block, weekPlanId: weekStart });
  });
}

export async function upsertBlock(
  userId: string,
  weekStart: string,
  dayOfWeek: number,
  slot: number,
  blockType: BlockType,
  title: string,
  description: string,
): Promise<Block> {
  console.log("[BLOCK6] upsertBlock called:", {
    userId,
    weekStart,
    dayOfWeek,
    slot,
    blockType,
    title,
  });

  const weekPlanId = await getOrCreateWeekPlan(userId, weekStart);
  console.log("[BLOCK6] weekPlanId:", weekPlanId);

  // Check if block exists for this slot
  const { data: existing, error: findErr } = await supabase
    .from("blocks")
    .select("id")
    .eq("week_plan_id", weekPlanId)
    .eq("day_of_week", dayOfWeek)
    .eq("slot", slot)
    .maybeSingle();

  console.log("[BLOCK6] existing block:", { existing, findErr });

  if (existing) {
    const { data, error } = await supabase
      .from("blocks")
      .update({
        block_type_id: BLOCK_TYPE_MAP[blockType],
        title,
        description,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    console.log("[BLOCK6] update result:", { data, error });
    if (error) throw new Error(error.message);
    const updated = dbBlockToEntity(data as DbBlock);
    return createBlock({ ...updated, weekPlanId: weekStart });
  }

  const { data, error } = await supabase
    .from("blocks")
    .insert({
      week_plan_id: weekPlanId,
      day_of_week: dayOfWeek,
      slot,
      block_type_id: BLOCK_TYPE_MAP[blockType],
      title,
      description,
      status: BlockStatus.Planned,
    })
    .select("*")
    .single();

  console.log("[BLOCK6] insert result:", { data, error });
  if (error) throw new Error(error.message);
  const inserted = dbBlockToEntity(data as DbBlock);
  return createBlock({ ...inserted, weekPlanId: weekStart });
}

export async function updateBlockStatus(
  blockId: string,
  status: BlockStatus,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .update({ status })
    .eq("id", blockId);

  if (error) throw new Error(error.message);
}

// --- Diary ---

interface DbDiary {
  id: string;
  entry_date: string;
  line_1: string;
  line_2: string;
  line_3: string;
}

export interface DiaryLines {
  line1: string;
  line2: string;
  line3: string;
}

export async function fetchDiary(
  userId: string,
  dateKey: string,
): Promise<DiaryLines | null> {
  const { data } = await supabase
    .from("diary_entries")
    .select("line_1, line_2, line_3")
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .maybeSingle();

  if (!data) return null;
  const d = data as DbDiary;
  return { line1: d.line_1, line2: d.line_2, line3: d.line_3 };
}

export async function upsertDiary(
  userId: string,
  dateKey: string,
  line1: string,
  line2: string,
  line3: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("diary_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("diary_entries")
      .update({ line_1: line1, line_2: line2, line_3: line3 })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("diary_entries").insert({
      user_id: userId,
      entry_date: dateKey,
      line_1: line1,
      line_2: line2,
      line_3: line3,
    });
    if (error) throw new Error(error.message);
  }
}

// --- Week Reviews ---

export async function fetchReflection(
  userId: string,
  weekStart: string,
): Promise<string> {
  const { data: plan } = await supabase
    .from("week_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!plan) return "";

  const { data } = await supabase
    .from("week_reviews")
    .select("reflection")
    .eq("week_plan_id", plan.id)
    .maybeSingle();

  return data?.reflection ?? "";
}

export async function upsertReflection(
  userId: string,
  weekStart: string,
  reflection: string,
): Promise<void> {
  const weekPlanId = await getOrCreateWeekPlan(userId, weekStart);

  const { data: existing } = await supabase
    .from("week_reviews")
    .select("id")
    .eq("week_plan_id", weekPlanId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("week_reviews")
      .update({ reflection })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("week_reviews")
      .insert({ week_plan_id: weekPlanId, reflection });
    if (error) throw new Error(error.message);
  }
}

// --- Subtasks ---

interface DbSubtask {
  id: string;
  block_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

function dbSubtaskToEntity(db: DbSubtask): Subtask {
  return createSubtask({
    id: db.id,
    blockId: db.block_id,
    title: db.title,
    completed: db.completed,
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchSubtasksForBlocks(
  blockIds: string[],
): Promise<Subtask[]> {
  if (blockIds.length === 0) return [];
  const { data, error } = await supabase
    .from("subtasks")
    .select("*")
    .in("block_id", blockIds)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbSubtask[]).map(dbSubtaskToEntity);
}

export async function addSubtask(
  blockId: string,
  title: string,
  position: number,
): Promise<Subtask> {
  const { data, error } = await supabase
    .from("subtasks")
    .insert({ block_id: blockId, title, position })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbSubtaskToEntity(data as DbSubtask);
}

export async function updateSubtaskTitle(
  id: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("subtasks")
    .update({ title })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleSubtaskCompleted(
  id: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("subtasks")
    .update({ completed })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderSubtasks(orderedIds: string[]): Promise<void> {
  const OFFSET = 10000;
  // Phase 1: move to high temporary positions to avoid UNIQUE(block_id, position) collisions
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("subtasks")
      .update({ position: OFFSET + i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  // Phase 2: set final positions 0..N-1
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("subtasks")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- Timer Sessions ---

interface DbTimerSession {
  id: string;
  block_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

function dbTimerSessionToEntity(db: DbTimerSession): TimerSession {
  return createTimerSession({
    id: db.id,
    blockId: db.block_id,
    userId: db.user_id,
    startedAt: new Date(db.started_at),
    endedAt: db.ended_at ? new Date(db.ended_at) : null,
    durationSeconds: db.duration_seconds,
  });
}

export async function fetchTimerSessionsForBlocks(
  blockIds: string[],
): Promise<TimerSession[]> {
  if (blockIds.length === 0) return [];
  const { data, error } = await supabase
    .from("timer_sessions")
    .select("*")
    .in("block_id", blockIds);

  if (error) throw new Error(error.message);
  return (data as DbTimerSession[]).map(dbTimerSessionToEntity);
}

export async function fetchActiveSession(
  userId: string,
): Promise<TimerSession | null> {
  const { data, error } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbTimerSessionToEntity(data as DbTimerSession);
}

export async function stopActiveSession(userId: string): Promise<void> {
  const { data: active, error: findErr } = await supabase
    .from("timer_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!active) return;

  const startedAt = new Date(active.started_at);
  const endedAt = new Date();
  const durationSeconds = Math.floor(
    (endedAt.getTime() - startedAt.getTime()) / 1000,
  );

  const { error } = await supabase
    .from("timer_sessions")
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", active.id);

  if (error) throw new Error(error.message);
}

export async function startTimerForBlock(
  userId: string,
  blockId: string,
): Promise<TimerSession> {
  // Stop any existing active session first
  await stopActiveSession(userId);

  const { data, error } = await supabase
    .from("timer_sessions")
    .insert({
      block_id: blockId,
      user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbTimerSessionToEntity(data as DbTimerSession);
}

export async function addManualSession(
  userId: string,
  blockId: string,
  startedAt: Date,
  endedAt: Date,
): Promise<TimerSession> {
  const durationSeconds = Math.floor(
    (endedAt.getTime() - startedAt.getTime()) / 1000,
  );

  const { data, error } = await supabase
    .from("timer_sessions")
    .insert({
      block_id: blockId,
      user_id: userId,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbTimerSessionToEntity(data as DbTimerSession);
}

export async function deleteSessionsForBlock(blockId: string): Promise<void> {
  const { error } = await supabase
    .from("timer_sessions")
    .delete()
    .eq("block_id", blockId);
  if (error) throw new Error(error.message);
}

// --- Block position operations ---

export async function swapBlocksInDb(
  idA: string,
  idB: string,
): Promise<void> {
  const { error } = await supabase.rpc("swap_blocks", {
    block_a: idA,
    block_b: idB,
  });
  if (error) throw new Error(error.message);
}

export async function moveBlockInDb(
  id: string,
  dayOfWeek: number,
  slot: number,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .update({ day_of_week: dayOfWeek, slot })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
