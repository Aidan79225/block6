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
import type { WeekPlan } from "@/domain/entities/week-plan";
import type { OkrCycle } from "@/domain/entities/okr-cycle";
import { createOkrCycle } from "@/domain/entities/okr-cycle";
import type { Objective } from "@/domain/entities/objective";
import { createObjective } from "@/domain/entities/objective";
import type { KeyResult } from "@/domain/entities/key-result";
import { createKeyResult } from "@/domain/entities/key-result";
import type { Project } from "@/domain/entities/project";
import { createProject } from "@/domain/entities/project";
import type { ProjectStep } from "@/domain/entities/project-step";
import { createProjectStep } from "@/domain/entities/project-step";
import type { RhythmSlot } from "@/domain/entities/rhythm-slot";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";
import { parseDateKey, formatDateKey } from "@/lib/date-helpers";

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
  key_result_id: string | null;
  project_id: string | null;
  suppressed?: boolean | null;
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
    keyResultId: db.key_result_id ?? null,
    projectId: db.project_id ?? null,
    suppressed: db.suppressed ?? false,
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

interface DbWeekPlan {
  id: string;
  user_id: string;
  week_start: string;
  created_at: string;
}

function dbWeekPlanToEntity(db: DbWeekPlan): WeekPlan {
  return {
    id: db.id,
    userId: db.user_id,
    weekStart: parseDateKey(db.week_start),
    createdAt: new Date(db.created_at),
  };
}

export async function fetchWeekPlan(
  userId: string,
  weekKey: string,
): Promise<WeekPlan | null> {
  const { data, error } = await supabase
    .from("week_plans")
    .select("id, user_id, week_start, created_at")
    .eq("user_id", userId)
    .eq("week_start", weekKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbWeekPlanToEntity(data as DbWeekPlan);
}

export async function insertWeekPlan(plan: WeekPlan): Promise<void> {
  const y = plan.weekStart.getFullYear();
  const m = String(plan.weekStart.getMonth() + 1).padStart(2, "0");
  const d = String(plan.weekStart.getDate()).padStart(2, "0");
  const { error } = await supabase.from("week_plans").insert({
    id: plan.id,
    user_id: plan.userId,
    week_start: `${y}-${m}-${d}`,
  });
  if (error) throw new Error(error.message);
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
  return (data as DbBlock[]).map((db) => dbBlockToEntity(db));
}

/**
 * The most recent week at or before `beforeWeekStart` that actually holds
 * blocks, searched back at most `maxWeeksBack` weeks. Returns null when the
 * user has no populated week in that range.
 */
export async function findMostRecentWeekWithBlocks(
  userId: string,
  beforeWeekStart: string,
  maxWeeksBack: number,
): Promise<string | null> {
  const { data: plans, error } = await supabase
    .from("week_plans")
    .select("id, week_start")
    .eq("user_id", userId)
    .lt("week_start", beforeWeekStart)
    .order("week_start", { ascending: false })
    .limit(maxWeeksBack);

  if (error) throw new Error(error.message);
  if (!plans || plans.length === 0) return null;

  // Compare as date keys so the cutoff is timezone-independent.
  const earliest = parseDateKey(beforeWeekStart);
  earliest.setDate(earliest.getDate() - maxWeeksBack * 7);
  const earliestKey = formatDateKey(earliest);

  for (const plan of plans as { id: string; week_start: string }[]) {
    if (plan.week_start < earliestKey) break;
    const { count, error: countErr } = await supabase
      .from("blocks")
      .select("id", { count: "exact", head: true })
      .eq("week_plan_id", plan.id);
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) return plan.week_start;
  }
  return null;
}

/**
 * Insert several brand-new blocks in one round trip. Callers must only pass
 * slots that are still free — the unique(week_plan_id, day_of_week, slot)
 * constraint rejects the whole batch otherwise.
 */
export async function insertBlocks(
  userId: string,
  weekStart: string,
  rows: readonly {
    dayOfWeek: number;
    slot: number;
    blockType: BlockType;
  }[],
): Promise<Block[]> {
  if (rows.length === 0) return [];
  const weekPlanId = await getOrCreateWeekPlan(userId, weekStart);
  const { data, error } = await supabase
    .from("blocks")
    .insert(
      rows.map((r) => ({
        week_plan_id: weekPlanId,
        day_of_week: r.dayOfWeek,
        slot: r.slot,
        block_type_id: BLOCK_TYPE_MAP[r.blockType],
        title: "",
        description: "",
      })),
    )
    .select("*");

  if (error) throw new Error(error.message);
  return (data as DbBlock[]).map((db) => dbBlockToEntity(db));
}

/**
 * Create or update the block for one slot, including its status. Used to
 * materialize a rhythm-projected cell the moment the user acts on it.
 */
export async function materializeBlock(
  userId: string,
  weekStart: string,
  input: {
    dayOfWeek: number;
    slot: number;
    blockType: BlockType;
    title: string;
    description: string;
    status?: BlockStatus;
    suppressed?: boolean;
  },
): Promise<Block> {
  const weekPlanId = await getOrCreateWeekPlan(userId, weekStart);
  const { data, error } = await supabase
    .from("blocks")
    .upsert(
      {
        week_plan_id: weekPlanId,
        day_of_week: input.dayOfWeek,
        slot: input.slot,
        block_type_id: BLOCK_TYPE_MAP[input.blockType],
        title: input.title,
        description: input.description,
        status: input.status ?? BlockStatus.Planned,
        suppressed: input.suppressed ?? false,
      },
      { onConflict: "week_plan_id,day_of_week,slot" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbBlockToEntity(data as DbBlock);
}

export async function setBlockSuppressed(
  id: string,
  suppressed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .update({ suppressed })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Rhythm slots ---

interface DbRhythmSlot {
  id: string;
  user_id: string;
  day_of_week: number;
  slot: number;
  block_type_id: number;
  title: string | null;
  description: string | null;
}

function dbRhythmSlotToEntity(db: DbRhythmSlot): RhythmSlot {
  return createRhythmSlot({
    id: db.id,
    userId: db.user_id,
    dayOfWeek: db.day_of_week,
    slot: db.slot,
    blockType: BLOCK_TYPE_REVERSE[db.block_type_id] ?? BlockType.Core,
    title: db.title ?? "",
    description: db.description ?? "",
  });
}

export async function fetchRhythmSlots(userId: string): Promise<RhythmSlot[]> {
  const { data, error } = await supabase
    .from("rhythm_slots")
    .select("*")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data as DbRhythmSlot[]).map((db) => dbRhythmSlotToEntity(db));
}

/**
 * Replace the whole rhythm in one shot. The rhythm is a single small picture
 * of a typical week, so it is written as a whole rather than patched.
 */
export async function replaceRhythmSlots(
  userId: string,
  slots: readonly {
    dayOfWeek: number;
    slot: number;
    blockType: BlockType;
    title: string;
    description: string;
  }[],
): Promise<RhythmSlot[]> {
  const { error: deleteError } = await supabase
    .from("rhythm_slots")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (slots.length === 0) return [];

  const { data, error } = await supabase
    .from("rhythm_slots")
    .insert(
      slots.map((s) => ({
        user_id: userId,
        day_of_week: s.dayOfWeek,
        slot: s.slot,
        block_type_id: BLOCK_TYPE_MAP[s.blockType],
        title: s.title,
        description: s.description,
      })),
    )
    .select("*");

  if (error) throw new Error(error.message);
  return (data as DbRhythmSlot[]).map((db) => dbRhythmSlotToEntity(db));
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from("blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
    return dbBlockToEntity(data as DbBlock);
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
  return dbBlockToEntity(data as DbBlock);
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
    key_result_id: block.keyResultId,
    project_id: block.projectId,
  });
  if (error) throw new Error(error.message);
}

export async function updateBlockRow(block: Block): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .update({
      week_plan_id: block.weekPlanId,
      day_of_week: block.dayOfWeek,
      slot: block.slot,
      block_type_id: BLOCK_TYPE_MAP[block.blockType],
      title: block.title,
      description: block.description,
      status: block.status,
      key_result_id: block.keyResultId,
      project_id: block.projectId,
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
  return {
    id: db.id,
    userId: db.user_id,
    entryDate: parseDateKey(db.entry_date),
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
  const y = entry.entryDate.getFullYear();
  const m = String(entry.entryDate.getMonth() + 1).padStart(2, "0");
  const d = String(entry.entryDate.getDate()).padStart(2, "0");
  const { error } = await supabase
    .from("diary_entries")
    .update({
      user_id: entry.userId,
      entry_date: `${y}-${m}-${d}`,
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

interface DbWeekReview {
  id: string;
  week_plan_id: string;
  reflection: string;
  created_at: string;
}

function dbWeekReviewToEntity(
  db: DbWeekReview,
): import("@/domain/entities/week-review").WeekReview {
  return {
    id: db.id,
    weekPlanId: db.week_plan_id,
    reflection: db.reflection,
    createdAt: new Date(db.created_at),
  };
}

export async function fetchWeekReviewByWeekPlanId(
  weekPlanId: string,
): Promise<import("@/domain/entities/week-review").WeekReview | null> {
  const { data, error } = await supabase
    .from("week_reviews")
    .select("id, week_plan_id, reflection, created_at")
    .eq("week_plan_id", weekPlanId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbWeekReviewToEntity(data as DbWeekReview);
}

export async function insertWeekReview(
  review: import("@/domain/entities/week-review").WeekReview,
): Promise<void> {
  const { error } = await supabase.from("week_reviews").insert({
    id: review.id,
    week_plan_id: review.weekPlanId,
    reflection: review.reflection,
  });
  if (error) throw new Error(error.message);
}

export async function updateWeekReview(
  review: import("@/domain/entities/week-review").WeekReview,
): Promise<void> {
  const { error } = await supabase
    .from("week_reviews")
    .update({ reflection: review.reflection })
    .eq("id", review.id);
  if (error) throw new Error(error.message);
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
  key_result_id: string | null;
}

function dbWeeklyTaskToEntity(db: DbWeeklyTask): WeeklyTask {
  return createWeeklyTask({
    id: db.id,
    userId: db.user_id,
    title: db.title,
    position: db.position,
    isActive: db.is_active,
    createdAt: new Date(db.created_at),
    keyResultId: db.key_result_id ?? null,
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

// --- OKR: cycles ---

interface DbOkrCycle {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

function dbOkrCycleToEntity(db: DbOkrCycle): OkrCycle {
  return createOkrCycle({
    id: db.id,
    userId: db.user_id,
    name: db.name,
    startDate: parseDateKey(db.start_date),
    endDate: parseDateKey(db.end_date),
    createdAt: new Date(db.created_at),
  });
}

export async function fetchOkrCyclesForUser(
  userId: string,
): Promise<OkrCycle[]> {
  const { data, error } = await supabase
    .from("okr_cycles")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbOkrCycle[]).map(dbOkrCycleToEntity);
}

export async function fetchOkrCycleById(id: string): Promise<OkrCycle | null> {
  const { data, error } = await supabase
    .from("okr_cycles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbOkrCycleToEntity(data as DbOkrCycle);
}

export async function insertOkrCycle(cycle: OkrCycle): Promise<void> {
  const { error } = await supabase.from("okr_cycles").insert({
    id: cycle.id,
    user_id: cycle.userId,
    name: cycle.name,
    start_date: formatDateKey(cycle.startDate),
    end_date: formatDateKey(cycle.endDate),
  });
  if (error) throw new Error(error.message);
}

export async function updateOkrCycleRow(cycle: OkrCycle): Promise<void> {
  const { error } = await supabase
    .from("okr_cycles")
    .update({
      name: cycle.name,
      start_date: formatDateKey(cycle.startDate),
      end_date: formatDateKey(cycle.endDate),
    })
    .eq("id", cycle.id);
  if (error) throw new Error(error.message);
}

export async function deleteOkrCycleRow(id: string): Promise<void> {
  const { error } = await supabase.from("okr_cycles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- OKR: objectives ---

interface DbObjective {
  id: string;
  cycle_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
}

function dbObjectiveToEntity(db: DbObjective): Objective {
  return createObjective({
    id: db.id,
    cycleId: db.cycle_id,
    title: db.title,
    description: db.description ?? "",
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchObjectivesByCycle(
  cycleId: string,
): Promise<Objective[]> {
  const { data, error } = await supabase
    .from("objectives")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbObjective[]).map(dbObjectiveToEntity);
}

export async function fetchObjectiveById(
  id: string,
): Promise<Objective | null> {
  const { data, error } = await supabase
    .from("objectives")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbObjectiveToEntity(data as DbObjective);
}

export async function insertObjective(objective: Objective): Promise<void> {
  const { error } = await supabase.from("objectives").insert({
    id: objective.id,
    cycle_id: objective.cycleId,
    title: objective.title,
    description: objective.description,
    position: objective.position,
  });
  if (error) throw new Error(error.message);
}

export async function updateObjectiveRow(objective: Objective): Promise<void> {
  const { error } = await supabase
    .from("objectives")
    .update({
      title: objective.title,
      description: objective.description,
      position: objective.position,
    })
    .eq("id", objective.id);
  if (error) throw new Error(error.message);
}

export async function deleteObjectiveRow(id: string): Promise<void> {
  const { error } = await supabase.from("objectives").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderObjectiveRows(
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("objectives")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- OKR: key results ---

interface DbKeyResult {
  id: string;
  objective_id: string;
  title: string;
  unit: string;
  target_value: number;
  current_value: number;
  position: number;
  created_at: string;
}

function dbKeyResultToEntity(db: DbKeyResult): KeyResult {
  return createKeyResult({
    id: db.id,
    objectiveId: db.objective_id,
    title: db.title,
    unit: db.unit ?? "",
    targetValue: Number(db.target_value),
    currentValue: Number(db.current_value),
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchKeyResultsByObjective(
  objectiveId: string,
): Promise<KeyResult[]> {
  const { data, error } = await supabase
    .from("key_results")
    .select("*")
    .eq("objective_id", objectiveId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbKeyResult[]).map(dbKeyResultToEntity);
}

export async function fetchKeyResultById(
  id: string,
): Promise<KeyResult | null> {
  const { data, error } = await supabase
    .from("key_results")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbKeyResultToEntity(data as DbKeyResult);
}

export async function insertKeyResult(kr: KeyResult): Promise<void> {
  const { error } = await supabase.from("key_results").insert({
    id: kr.id,
    objective_id: kr.objectiveId,
    title: kr.title,
    unit: kr.unit,
    target_value: kr.targetValue,
    current_value: kr.currentValue,
    position: kr.position,
  });
  if (error) throw new Error(error.message);
}

export async function updateKeyResultRow(kr: KeyResult): Promise<void> {
  const { error } = await supabase
    .from("key_results")
    .update({
      title: kr.title,
      unit: kr.unit,
      target_value: kr.targetValue,
      current_value: kr.currentValue,
      position: kr.position,
    })
    .eq("id", kr.id);
  if (error) throw new Error(error.message);
}

export async function deleteKeyResultRow(id: string): Promise<void> {
  const { error } = await supabase.from("key_results").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderKeyResultRows(
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("key_results")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- OKR: weekly-task linking ---

export async function dbSetWeeklyTaskKeyResult(
  weeklyTaskId: string,
  keyResultId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_tasks")
    .update({ key_result_id: keyResultId })
    .eq("id", weeklyTaskId);
  if (error) throw new Error(error.message);
}

// --- OKR: stats queries ---

export async function countLinkedWeeklyTasks(
  keyResultId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("weekly_tasks")
    .select("id", { count: "exact", head: true })
    .eq("key_result_id", keyResultId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countWeeklyTaskCompletionsForKeyResult(
  keyResultId: string,
  startKey: string,
  endKey: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("weekly_task_completions")
    .select("week_start, weekly_tasks!inner(key_result_id)", {
      count: "exact",
      head: true,
    })
    .eq("weekly_tasks.key_result_id", keyResultId)
    .gte("week_start", startKey)
    .lte("week_start", endKey);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchBlocksForKeyResultInRange(
  keyResultId: string,
  startKey: string,
  endKey: string,
): Promise<Block[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select("*, week_plans!inner(week_start)")
    .eq("key_result_id", keyResultId)
    .gte("week_plans.week_start", startKey)
    .lte("week_plans.week_start", endKey);
  if (error) throw new Error(error.message);
  return (data as DbBlock[]).map((db) => dbBlockToEntity(db));
}

// --- Projects ---

interface DbProject {
  id: string;
  user_id: string;
  title: string;
  key_result_id: string | null;
  status: string;
  position: number;
  created_at: string;
}

function dbProjectToEntity(db: DbProject): Project {
  return createProject({
    id: db.id,
    userId: db.user_id,
    title: db.title,
    keyResultId: db.key_result_id ?? null,
    status: db.status === "archived" ? "archived" : "active",
    position: db.position,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchProjectsForUser(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbProject[]).map(dbProjectToEntity);
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbProjectToEntity(data as DbProject);
}

export async function insertProject(project: Project): Promise<void> {
  const { error } = await supabase.from("projects").insert({
    id: project.id,
    user_id: project.userId,
    title: project.title,
    key_result_id: project.keyResultId,
    status: project.status,
    position: project.position,
  });
  if (error) throw new Error(error.message);
}

export async function updateProjectRow(project: Project): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({
      title: project.title,
      key_result_id: project.keyResultId,
      status: project.status,
      position: project.position,
    })
    .eq("id", project.id);
  if (error) throw new Error(error.message);
}

export async function deleteProjectRow(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderProjectRows(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("projects")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}

// --- Project steps ---

interface DbProjectStep {
  id: string;
  project_id: string;
  title: string;
  position: number;
  completed: boolean;
  created_at: string;
}

function dbProjectStepToEntity(db: DbProjectStep): ProjectStep {
  return createProjectStep({
    id: db.id,
    projectId: db.project_id,
    title: db.title,
    position: db.position,
    completed: db.completed,
    createdAt: new Date(db.created_at),
  });
}

export async function fetchStepsByProject(
  projectId: string,
): Promise<ProjectStep[]> {
  const { data, error } = await supabase
    .from("project_steps")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbProjectStep[]).map(dbProjectStepToEntity);
}

export async function fetchProjectStepById(
  id: string,
): Promise<ProjectStep | null> {
  const { data, error } = await supabase
    .from("project_steps")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return dbProjectStepToEntity(data as DbProjectStep);
}

export async function insertProjectStep(step: ProjectStep): Promise<void> {
  const { error } = await supabase.from("project_steps").insert({
    id: step.id,
    project_id: step.projectId,
    title: step.title,
    position: step.position,
    completed: step.completed,
  });
  if (error) throw new Error(error.message);
}

export async function updateProjectStepRow(step: ProjectStep): Promise<void> {
  const { error } = await supabase
    .from("project_steps")
    .update({
      title: step.title,
      position: step.position,
      completed: step.completed,
    })
    .eq("id", step.id);
  if (error) throw new Error(error.message);
}

export async function deleteProjectStepRow(id: string): Promise<void> {
  const { error } = await supabase.from("project_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderProjectStepRows(
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("project_steps")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
}
