import { supabase } from "./client";
import type { Block } from "@/domain/entities/block";
import type {
  PlanChange,
  PlanChangeAction,
} from "@/domain/entities/plan-change";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";
import type { Subtask } from "@/domain/entities/subtask";
import { createSubtask } from "@/domain/entities/subtask";
import type { WeeklyTask } from "@/domain/entities/weekly-task";
import { createWeeklyTask } from "@/domain/entities/weekly-task";
import type { TimerSession } from "@/domain/entities/timer-session";
import { createTimerSession } from "@/domain/entities/timer-session";
import type { DiaryEntry } from "@/domain/entities/diary-entry";

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

export async function fetchBlockById(id: string): Promise<Block | null> {
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbBlockToEntity(data as DbBlock);
}

export async function fetchBlocksByWeekPlanId(
  weekPlanId: string,
): Promise<Block[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("week_plan_id", weekPlanId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => dbBlockToEntity(row as DbBlock));
}

export async function insertBlockRow(block: Block): Promise<void> {
  const { error } = await supabase.from("blocks").insert({
    id: block.id,
    week_plan_id: block.weekPlanId,
    day_of_week: block.dayOfWeek,
    slot: block.slot,
    block_type_id: BLOCK_TYPE_MAP[block.blockType],
    title: block.title,
    description: block.description,
    status: block.status,
  });
  if (error) throw new Error(error.message);
}

export async function updateBlockRow(block: Block): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .update({
      block_type_id: BLOCK_TYPE_MAP[block.blockType],
      title: block.title,
      description: block.description,
      status: block.status,
    })
    .eq("id", block.id);
  if (error) throw new Error(error.message);
}

// --- Diary ---

interface DbDiary {
  id: string;
  entry_date: string;
  bad: string;
  good: string;
  next: string;
}

export interface DiaryLines {
  bad: string;
  good: string;
  next: string;
}

export async function fetchDiary(
  userId: string,
  dateKey: string,
): Promise<DiaryLines | null> {
  const { data } = await supabase
    .from("diary_entries")
    .select("bad, good, next")
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .maybeSingle();

  if (!data) return null;
  const d = data as DbDiary;
  return { bad: d.bad, good: d.good, next: d.next };
}

export async function upsertDiary(
  userId: string,
  dateKey: string,
  bad: string,
  good: string,
  next: string,
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
      .update({ bad, good, next })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("diary_entries").insert({
      user_id: userId,
      entry_date: dateKey,
      bad,
      good,
      next,
    });
    if (error) throw new Error(error.message);
  }
}

interface DbDiaryFull {
  id: string;
  user_id: string;
  entry_date: string;
  bad: string;
  good: string;
  next: string;
  created_at: string;
}

function dbDiaryToEntity(db: DbDiaryFull): DiaryEntry {
  const [y, m, d] = db.entry_date.split("-").map(Number);
  return {
    id: db.id,
    userId: db.user_id,
    entryDate: new Date(y, m - 1, d),
    bad: db.bad,
    good: db.good,
    next: db.next,
    createdAt: new Date(db.created_at),
  };
}

export async function fetchDiaryEntry(
  userId: string,
  dateKey: string,
): Promise<DiaryEntry | null> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, user_id, entry_date, bad, good, next, created_at")
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbDiaryToEntity(data as DbDiaryFull);
}

export async function fetchDiaryRange(
  userId: string,
  startKey: string,
  endKey: string,
): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, user_id, entry_date, bad, good, next, created_at")
    .eq("user_id", userId)
    .gte("entry_date", startKey)
    .lte("entry_date", endKey);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => dbDiaryToEntity(row as DbDiaryFull));
}

export async function insertDiaryEntry(entry: DiaryEntry): Promise<void> {
  const y = entry.entryDate.getFullYear();
  const m = String(entry.entryDate.getMonth() + 1).padStart(2, "0");
  const d = String(entry.entryDate.getDate()).padStart(2, "0");
  const { error } = await supabase.from("diary_entries").insert({
    id: entry.id,
    user_id: entry.userId,
    entry_date: `${y}-${m}-${d}`,
    bad: entry.bad,
    good: entry.good,
    next: entry.next,
  });
  if (error) throw new Error(error.message);
}

export async function updateDiaryEntry(entry: DiaryEntry): Promise<void> {
  const { error } = await supabase
    .from("diary_entries")
    .update({
      bad: entry.bad,
      good: entry.good,
      next: entry.next,
    })
    .eq("id", entry.id);
  if (error) throw new Error(error.message);
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

export async function swapBlocksInDb(idA: string, idB: string): Promise<void> {
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

// --- Weekly Tasks ---

interface DbWeeklyTask {
  id: string;
  user_id: string;
  title: string;
  position: number;
  is_active: boolean;
  created_at: string;
}

function dbWeeklyTaskToEntity(db: DbWeeklyTask): WeeklyTask {
  return createWeeklyTask({
    id: db.id,
    userId: db.user_id,
    title: db.title,
    position: db.position,
    isActive: db.is_active,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchActiveWeeklyTasks(
  userId: string,
): Promise<WeeklyTask[]> {
  const { data, error } = await supabase
    .from("weekly_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbWeeklyTask[]).map(dbWeeklyTaskToEntity);
}

export async function addWeeklyTask(
  userId: string,
  title: string,
  position: number,
): Promise<WeeklyTask> {
  const { data, error } = await supabase
    .from("weekly_tasks")
    .insert({ user_id: userId, title, position, is_active: true })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return dbWeeklyTaskToEntity(data as DbWeeklyTask);
}

export async function updateWeeklyTaskTitle(
  id: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_tasks")
    .update({ title })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setWeeklyTaskActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_tasks")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderWeeklyTasks(orderedIds: string[]): Promise<void> {
  const OFFSET = 10000;
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("weekly_tasks")
      .update({ position: OFFSET + i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("weekly_tasks")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- Weekly task completions ---

interface DbWeeklyTaskCompletion {
  weekly_task_id: string;
  week_start: string;
}

export async function fetchWeeklyTaskCompletions(
  userId: string,
  weekStart: string,
): Promise<{ weeklyTaskId: string; weekStart: string }[]> {
  const { data, error } = await supabase
    .from("weekly_task_completions")
    .select("weekly_task_id, week_start, weekly_tasks!inner(user_id)")
    .eq("week_start", weekStart)
    .eq("weekly_tasks.user_id", userId);
  if (error) throw new Error(error.message);
  return (data as DbWeeklyTaskCompletion[]).map((r) => ({
    weeklyTaskId: r.weekly_task_id,
    weekStart: r.week_start,
  }));
}

export async function addWeeklyTaskCompletion(
  weeklyTaskId: string,
  weekStart: string,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_task_completions")
    .insert({ weekly_task_id: weeklyTaskId, week_start: weekStart });
  if (error) throw new Error(error.message);
}

export async function removeWeeklyTaskCompletion(
  weeklyTaskId: string,
  weekStart: string,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_task_completions")
    .delete()
    .eq("weekly_task_id", weeklyTaskId)
    .eq("week_start", weekStart);
  if (error) throw new Error(error.message);
}

// --- Plan changes ---

interface DbPlanChange {
  id: string;
  user_id: string;
  week_key: string;
  day_of_week: number;
  slot: number;
  block_title_snapshot: string;
  action: PlanChangeAction;
  reason: string;
  created_at: string;
}

function dbPlanChangeToEntity(db: DbPlanChange): PlanChange {
  return {
    id: db.id,
    userId: db.user_id,
    weekKey: db.week_key,
    dayOfWeek: db.day_of_week,
    slot: db.slot,
    blockTitleSnapshot: db.block_title_snapshot,
    action: db.action,
    reason: db.reason,
    createdAt: db.created_at,
  };
}

export async function fetchPlanChangesForWeek(
  userId: string,
  weekKey: string,
): Promise<PlanChange[]> {
  const { data, error } = await supabase
    .from("plan_changes")
    .select("*")
    .eq("user_id", userId)
    .eq("week_key", weekKey)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(dbPlanChangeToEntity);
}

export async function insertPlanChange(
  change: PlanChange,
): Promise<PlanChange> {
  if (!change.userId) throw new Error("insertPlanChange requires a userId");
  const { data, error } = await supabase
    .from("plan_changes")
    .insert({
      id: change.id,
      user_id: change.userId,
      week_key: change.weekKey,
      day_of_week: change.dayOfWeek,
      slot: change.slot,
      block_title_snapshot: change.blockTitleSnapshot,
      action: change.action,
      reason: change.reason,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return dbPlanChangeToEntity(data as DbPlanChange);
}
