import { supabase } from "./client";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";

const BLOCK_TYPE_MAP: Record<BlockType, number> = {
  [BlockType.Core]: 1,
  [BlockType.Rest]: 2,
  [BlockType.Buffer]: 3,
};

const BLOCK_TYPE_REVERSE: Record<number, BlockType> = {
  1: BlockType.Core,
  2: BlockType.Rest,
  3: BlockType.Buffer,
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
  console.log("[BLOCK6] upsertBlock called:", { userId, weekStart, dayOfWeek, slot, blockType, title });

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
