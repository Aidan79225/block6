"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
} from "react";
import type { TitleSuggestion } from "@/presentation/components/side-panel/task-title-autocomplete";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";
import type { WeeklyTask } from "@/domain/entities/weekly-task";
import { useAuth } from "./auth-provider";
import { useNotify } from "./notification-provider";
import { useUseCases } from "@/presentation/providers/dependency-provider";
import type { Subtask } from "@/domain/entities/subtask";
import type { TimerSession } from "@/domain/entities/timer-session";
import {
  fetchBlocksForWeek,
  getOrCreateWeekPlan,
  upsertBlock,
  fetchDiary,
  upsertDiary,
  fetchReflection,
  fetchSubtasksForBlocks,
  addSubtask as dbAddSubtask,
  updateSubtaskTitle as dbUpdateSubtaskTitle,
  toggleSubtaskCompleted as dbToggleSubtask,
  deleteSubtask as dbDeleteSubtask,
  reorderSubtasks as dbReorderSubtasks,
  fetchTimerSessionsForBlocks,
  fetchActiveSession,
  startTimerForBlock,
  stopActiveSession,
  addManualSession as dbAddManualSession,
  deleteSessionsForBlock as dbDeleteSessionsForBlock,
  swapBlocksInDb,
  moveBlockInDb,
  fetchActiveWeeklyTasks,
  addWeeklyTask as dbAddWeeklyTask,
  updateWeeklyTaskTitle as dbUpdateWeeklyTaskTitle,
  setWeeklyTaskActive as dbSetWeeklyTaskActive,
  reorderWeeklyTasks as dbReorderWeeklyTasks,
  fetchWeeklyTaskCompletions,
  addWeeklyTaskCompletion as dbAddWeeklyTaskCompletion,
  removeWeeklyTaskCompletion as dbRemoveWeeklyTaskCompletion,
  fetchPlanChangesForWeek,
  insertPlanChange,
  findMostRecentWeekWithBlocks,
  insertBlocks,
  deleteBlock as dbDeleteBlock,
  materializeBlock,
  fetchRhythmHistory,
  saveRhythmVersion,
} from "@/infrastructure/supabase/database";
import type { DiaryLines } from "@/infrastructure/supabase/database";
import type { PlanChange } from "@/domain/entities/plan-change";
import { logPlanChange } from "@/domain/usecases/log-plan-change";
import { buildWeekTemplate } from "@/domain/usecases/build-week-template";
import { planBlockMove } from "@/domain/usecases/plan-block-move";
import { nameBlocks } from "@/domain/usecases/name-slots";
import type { SlotPosition } from "@/domain/usecases/slot-range";
import {
  projectRhythmOntoWeek,
  parseRhythmBlockId,
} from "@/domain/usecases/project-rhythm-onto-week";
import type { RhythmSlot } from "@/domain/entities/rhythm-slot";
import { createRhythmSlot } from "@/domain/entities/rhythm-slot";
import type { Rhythm } from "@/domain/entities/rhythm";
import {
  adoptRhythm,
  createRhythm,
  latestRhythmSlots,
  rhythmSlotsForWeek,
} from "@/domain/entities/rhythm";
import {
  regrettedRhythmSlots,
  rhythmSlotsFromWeek,
  rhythmStartAfter,
  rhythmWithout,
} from "@/domain/usecases/set-rhythm";
import type { LogPlanChangeInput } from "@/domain/usecases/log-plan-change";
import { parseDateKey } from "@/lib/date-helpers";

interface AppState {
  getBlocksForWeek: (weekKey: string) => Block[];
  saveBlock: (
    weekKey: string,
    dayOfWeek: number,
    slot: number,
    title: string,
    description: string,
    blockType: BlockType,
  ) => Block;
  nameSlots: (
    weekKey: string,
    slots: readonly SlotPosition[],
    title: string,
    blockType: BlockType,
  ) => Promise<void>;
  updateStatus: (blockId: string, status: BlockStatus) => void;
  copyRecentWeekPlan: (
    currentWeekKey: string,
  ) => Promise<{ copied: number; sourceWeekKey: string | null }>;
  applyWeekTemplate: (weekKey: string) => Promise<number>;
  /** The newest rhythm — what the weeks ahead start from. */
  rhythmSlots: readonly RhythmSlot[];
  setRhythmFromWeek: (weekKey: string) => Promise<number>;
  clearRhythm: () => Promise<void>;
  /** Mark a block in review as not worth it (or take the mark back). */
  setBlockRegretted: (blockId: string, regretted: boolean) => Promise<void>;
  /**
   * Slots of the given week's regretted blocks that the newest rhythm would
   * still bring back every week.
   */
  regrettedRhythmSlotsForWeek: (weekKey: string) => SlotPosition[];
  /** Drop slots from the rhythm, from next week on. */
  removeSlotsFromRhythm: (slots: readonly SlotPosition[]) => Promise<void>;
  deleteBlock: (blockId: string) => Promise<void>;
  planChanges: Record<string, PlanChange[]>;
  loadPlanChanges: (weekKey: string) => Promise<void>;
  addPlanChange: (input: Omit<LogPlanChangeInput, "userId">) => Promise<void>;
  swapBlocks: (idA: string, idB: string) => Promise<void>;
  moveBlock: (id: string, dayOfWeek: number, slot: number) => Promise<void>;
  diaryEntries: Record<string, DiaryLines>;
  saveDiary: (dateKey: string, bad: string, good: string, next: string) => void;
  getDiary: (dateKey: string) => DiaryLines | null;
  reflection: string;
  setReflection: (text: string) => void;
  loadWeek: (weekKey: string) => void;
  loadDiary: (dateKey: string) => void;
  loadReflection: (weekKey: string) => void;
  subtasks: Subtask[];
  getSubtasksForBlock: (blockId: string) => Subtask[];
  addSubtask: (blockId: string, title: string) => void;
  editSubtask: (id: string, title: string) => void;
  toggleSubtask: (id: string) => void;
  deleteSubtask: (id: string) => void;
  reorderSubtasks: (blockId: string, orderedIds: string[]) => void;
  timerSessions: TimerSession[];
  activeTimer: TimerSession | null;
  getElapsedSeconds: (blockId: string, now: Date) => number;
  startTimer: (blockId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  addManualTimer: (
    blockId: string,
    startedAt: Date,
    endedAt: Date,
  ) => Promise<void>;
  clearTimer: (blockId: string) => Promise<void>;
  taskTitleSuggestions: TitleSuggestion[];
  weeklyTasks: WeeklyTask[];
  weeklyCompletions: Record<string, Set<string>>;
  addWeeklyTask: (title: string) => void;
  editWeeklyTask: (id: string, title: string) => void;
  disableWeeklyTask: (id: string) => void;
  reorderWeeklyTasks: (orderedIds: string[]) => void;
  toggleWeeklyTaskCompletion: (id: string, weekKey: string) => void;
  loadWeeklyCompletions: (weekKey: string) => void;
  getTaskTimeRanking: (
    weekKey: string,
    now: Date,
  ) => Array<{ title: string; totalSeconds: number }>;
}

// --- localStorage helpers ---

const STORAGE_KEY = "block6-data";
const MIGRATED_KEY = "block6-migrated";

interface PersistedData {
  blocks: Block[];
  diaryEntries: Record<string, DiaryLines>;
  reflection: string;
  rhythms: Rhythm[];
}

const EMPTY_DATA: PersistedData = {
  blocks: [],
  diaryEntries: {},
  reflection: "",
  rhythms: [],
};

function migrateDiaryEntries(
  raw: Record<string, Record<string, string>> | undefined,
): Record<string, DiaryLines> {
  if (!raw) return {};
  const result: Record<string, DiaryLines> = {};
  for (const [date, v] of Object.entries(raw)) {
    if ("bad" in v || "good" in v || "next" in v) {
      result[date] = {
        bad: (v.bad as string) ?? "",
        good: (v.good as string) ?? "",
        next: (v.next as string) ?? "",
      };
    } else {
      result[date] = {
        bad: (v.line1 as string) ?? "",
        good: (v.line2 as string) ?? "",
        next: (v.line3 as string) ?? "",
      };
    }
  }
  return result;
}

// `storage` only fires in *other* tabs, so same-tab writes have to notify
// subscribers explicitly or the UI silently keeps rendering stale data.
const storageListeners = new Set<() => void>();

function notifyStorageListeners(): void {
  for (const listener of storageListeners) listener();
}

function loadFromStorage(): PersistedData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as PersistedData & {
      diaryEntries?: Record<string, Record<string, string>>;
    };
    const blocks = (parsed.blocks ?? []).map((b) => createBlock(b));
    const rhythms = (parsed.rhythms ?? []).map((r) =>
      createRhythm({ ...r, slots: r.slots.map((s) => createRhythmSlot(s)) }),
    );
    return {
      blocks,
      diaryEntries: migrateDiaryEntries(parsed.diaryEntries),
      reflection: parsed.reflection ?? "",
      rhythms,
    };
  } catch {
    return EMPTY_DATA;
  }
}

function saveToStorage(data: PersistedData): void {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
    cachedRaw = json;
    cachedData = data;
    notifyStorageListeners();
  } catch {
    // Storage full or unavailable
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedData = EMPTY_DATA;
    notifyStorageListeners();
  } catch {
    // Ignore
  }
}

function hasLocalData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as PersistedData;
    return (
      (parsed.blocks?.length ?? 0) > 0 ||
      Object.keys(parsed.diaryEntries ?? {}).length > 0 ||
      (parsed.reflection ?? "").length > 0 ||
      (parsed.rhythms?.length ?? 0) > 0
    );
  } catch {
    return false;
  }
}

function wasMigrated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATED_KEY) === "true";
}

function markMigrated(): void {
  try {
    localStorage.setItem(MIGRATED_KEY, "true");
  } catch {
    // Ignore
  }
}

// --- Migration ---

async function migrateLocalToSupabase(
  userId: string,
  data: PersistedData,
): Promise<void> {
  // An account that already has a rhythm keeps it: replacing a standing plan
  // with one tried out while signed out is not something to do silently.
  try {
    const cloudRhythm = await fetchRhythmHistory(userId);
    if (cloudRhythm.length === 0) {
      const oldestFirst = [...data.rhythms].sort((a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom),
      );
      for (const version of oldestFirst) {
        await saveRhythmVersion({ ...version, userId });
      }
    }
  } catch (err) {
    console.error("[BLOCK6] Migration: failed to save rhythm:", err);
  }
  for (const block of data.blocks) {
    try {
      // Status and suppression travel too: a checked-off block or a slot
      // emptied against the rhythm must not come back as a plain plan.
      await materializeBlock(userId, block.weekPlanId, block);
    } catch (err) {
      console.error("[BLOCK6] Migration: failed to save block:", err);
    }
  }
  for (const [dateKey, entry] of Object.entries(data.diaryEntries)) {
    try {
      await upsertDiary(userId, dateKey, entry.bad, entry.good, entry.next);
    } catch (err) {
      console.error("[BLOCK6] Migration: failed to save diary:", err);
    }
  }
}

// --- Read localStorage as external store (SSR-safe) ---

function subscribeToStorage(callback: () => void): () => void {
  storageListeners.add(callback);
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => {
    storageListeners.delete(callback);
    window.removeEventListener("storage", handler);
  };
}

let cachedRaw: string | null = null;
let cachedData: PersistedData = EMPTY_DATA;

function getStorageSnapshot(): PersistedData {
  const raw =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedData = raw ? loadFromStorage() : EMPTY_DATA;
  }
  return cachedData;
}

function getServerSnapshot(): PersistedData {
  return EMPTY_DATA;
}

// --- Provider ---

const AppStateContext = createContext<AppState | null>(null);

// How far back to look for a week worth copying. Long enough to survive a
// month-long break, short enough that the search stays cheap.
const MAX_WEEKS_BACK_FOR_COPY = 8;

/** `byWeek` with `block` as the only row in its slot of `weekKey`. */
function withBlockInSlot(
  byWeek: Record<string, Block[]>,
  weekKey: string,
  block: Block,
): Record<string, Block[]> {
  const others = (byWeek[weekKey] ?? []).filter(
    (b) => !(b.dayOfWeek === block.dayOfWeek && b.slot === block.slot),
  );
  return { ...byWeek, [weekKey]: [...others, block] };
}

/** `byWeek` with one block, wherever it is, changed by `change`. */
function withBlockChanged(
  byWeek: Record<string, Block[]>,
  blockId: string,
  change: Partial<Block>,
): Record<string, Block[]> {
  const out: Record<string, Block[]> = {};
  for (const [wk, list] of Object.entries(byWeek)) {
    out[wk] = list.map((b) =>
      b.id === blockId ? createBlock({ ...b, ...change }) : b,
    );
  }
  return out;
}

function locateBlock(
  byWeek: Record<string, Block[]>,
  blockId: string,
): { weekKey: string; block: Block } | null {
  for (const [weekKey, list] of Object.entries(byWeek)) {
    const block = list.find((b) => b.id === blockId);
    if (block) return { weekKey, block };
  }
  return null;
}

/** A fresh row marking a rhythm slot as deliberately empty this week. */
function suppressedRhythmBlock(
  weekKey: string,
  dayOfWeek: number,
  slot: number,
  source: RhythmSlot,
): Block {
  return createBlock({
    id: crypto.randomUUID(),
    weekPlanId: weekKey,
    dayOfWeek,
    slot,
    blockType: source.blockType,
    title: source.title,
    description: source.description,
    status: BlockStatus.Planned,
    suppressed: true,
  });
}

const PLAN_CHANGES_STORAGE_KEY = (userIdOrAnon: string) =>
  `block6:planChanges:${userIdOrAnon}`;

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const notify = useNotify();
  const useCases = useUseCases();

  // SSR-safe read of localStorage
  const localData = useSyncExternalStore(
    subscribeToStorage,
    getStorageSnapshot,
    getServerSnapshot,
  );

  // Supabase-sourced state (only used when logged in)
  const [supaRhythms, setSupaRhythms] = useState<Rhythm[]>([]);
  const [supaBlocks, setSupaBlocks] = useState<Record<string, Block[]>>({});
  const supaBlocksRef = useRef(supaBlocks);
  useEffect(() => {
    supaBlocksRef.current = supaBlocks;
  }, [supaBlocks]);
  const [supaDiary, setSupaDiary] = useState<Record<string, DiaryLines>>({});
  const supaDiaryRef = useRef(supaDiary);
  useEffect(() => {
    supaDiaryRef.current = supaDiary;
  }, [supaDiary]);
  const [supaReflection, setSupaReflection] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimerSession | null>(null);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [weeklyCompletions, setWeeklyCompletions] = useState<
    Record<string, Set<string>>
  >({});

  const [planChanges, setPlanChanges] = useState<Record<string, PlanChange[]>>(
    {},
  );
  const loadedPlanChangeWeeks = useRef<Set<string>>(new Set());

  const loadedWeeks = useRef<Set<string>>(new Set());
  const loadedCompletionsWeeks = useRef<Set<string>>(new Set());
  const migrationDone = useRef(false);

  const isLoggedIn = !authLoading && !!user;

  // Pick data source based on auth state
  const localBlocksByWeek = useMemo(() => {
    const out: Record<string, Block[]> = {};
    for (const b of localData.blocks) {
      (out[b.weekPlanId] ??= []).push(b);
    }
    return out;
  }, [localData.blocks]);

  const storedBlocksByWeek: Record<string, Block[]> = isLoggedIn
    ? supaBlocks
    : localBlocksByWeek;
  const rhythmHistory = isLoggedIn ? supaRhythms : localData.rhythms;
  const rhythmSlots = useMemo(
    () => latestRhythmSlots(rhythmHistory),
    [rhythmHistory],
  );

  // Each week shows the rhythm version it was planned under, so a later
  // change to the rhythm never rewrites a week that has already started.
  const blocksByWeek = useMemo<Record<string, Block[]>>(() => {
    const out: Record<string, Block[]> = {};
    for (const [weekKey, overrides] of Object.entries(storedBlocksByWeek)) {
      out[weekKey] = projectRhythmOntoWeek({
        rhythm: rhythmSlotsForWeek(rhythmHistory, weekKey),
        overrides,
        weekKey,
      });
    }
    return out;
  }, [storedBlocksByWeek, rhythmHistory]);
  const diaryEntries = isLoggedIn ? supaDiary : localData.diaryEntries;
  const reflection = isLoggedIn ? supaReflection : localData.reflection;

  const taskTitleSuggestions = useMemo<TitleSuggestion[]>(() => {
    const counts = new Map<string, number>();
    for (const list of Object.values(blocksByWeek)) {
      for (const b of list) {
        const title = b.title.trim();
        if (!title) continue;
        counts.set(title, (counts.get(title) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
  }, [blocksByWeek]);

  // Migrate local data to Supabase on first login
  useEffect(() => {
    if (!isLoggedIn || migrationDone.current) return;
    migrationDone.current = true;

    if (!wasMigrated() && hasLocalData()) {
      const data = loadFromStorage();
      migrateLocalToSupabase(user!.id, data)
        .then(() => {
          clearStorage();
          markMigrated();
          loadedWeeks.current.clear();
        })
        .catch((err) => {
          console.error(err);
          notify.error("資料遷移失敗，請重試");
        });
    }
  }, [isLoggedIn, user, notify]);

  useEffect(() => {
    if (!isLoggedIn) {
      Promise.resolve().then(() => setWeeklyTasks([]));
      return;
    }
    fetchActiveWeeklyTasks(user!.id)
      .then((list) => setWeeklyTasks(list))
      .catch((err) => {
        console.error(err);
        notify.error("載入週任務清單失敗");
      });
  }, [isLoggedIn, user, notify]);

  useEffect(() => {
    if (!isLoggedIn) {
      Promise.resolve().then(() => setSupaRhythms([]));
      return;
    }
    useCases.listRhythmHistory
      .execute(user!.id)
      .then((history) => setSupaRhythms(history))
      .catch((err) => {
        console.error(err);
        notify.error("載入常駐節奏失敗");
      });
  }, [isLoggedIn, user, notify, useCases]);

  useEffect(() => {
    const promise = isLoggedIn
      ? fetchActiveSession(user!.id)
      : Promise.resolve(null);
    promise
      .then((active) => setActiveTimer(active))
      .catch((err) => {
        console.error(err);
        notify.error("載入計時器狀態失敗");
      });
  }, [isLoggedIn, user, notify]);

  // Load a week's blocks from Supabase
  const loadWeek = useCallback(
    (weekKey: string) => {
      if (!user || loadedWeeks.current.has(weekKey)) return;
      loadedWeeks.current.add(weekKey);
      fetchBlocksForWeek(user.id, weekKey)
        .then(async (fetched) => {
          setSupaBlocks((prev) => ({ ...prev, [weekKey]: fetched }));
          if (fetched.length > 0) {
            const ids = fetched.map((b) => b.id);
            const [fetchedSubs, fetchedSessions] = await Promise.all([
              fetchSubtasksForBlocks(ids),
              fetchTimerSessionsForBlocks(ids),
            ]);
            const blockIdSet = new Set(ids);
            setSubtasks((prev) => {
              const other = prev.filter((s) => !blockIdSet.has(s.blockId));
              return [...other, ...fetchedSubs];
            });
            setTimerSessions((prev) => {
              const other = prev.filter((s) => !blockIdSet.has(s.blockId));
              return [...other, ...fetchedSessions];
            });
          }
        })
        .catch((err) => {
          console.error(err);
          notify.error("載入週資料失敗");
          loadedWeeks.current.delete(weekKey);
        });
    },
    [user, notify],
  );

  const triedDiaryDates = useRef<Set<string>>(new Set());
  const loadDiary = useCallback(
    (dateKey: string) => {
      if (!user) return;
      if (supaDiaryRef.current[dateKey]) return;
      if (triedDiaryDates.current.has(`${user.id}:${dateKey}`)) return;
      triedDiaryDates.current.add(`${user.id}:${dateKey}`);
      fetchDiary(user.id, dateKey).then((entry) => {
        if (entry) {
          setSupaDiary((prev) => ({ ...prev, [dateKey]: entry }));
        }
      });
    },
    [user],
  );

  const loadReflection = useCallback(
    (weekKey: string) => {
      if (!user) return;
      fetchReflection(user.id, weekKey).then((text) => {
        setSupaReflection(text);
      });
    },
    [user],
  );

  const getBlocksForWeek = useCallback(
    (weekKey: string): Block[] => {
      const projected = blocksByWeek[weekKey];
      if (projected) return projected;
      // A week with nothing stored still shows the rhythm — that is the whole
      // point: a fresh week costs zero writes.
      return projectRhythmOntoWeek({
        rhythm: rhythmSlotsForWeek(rhythmHistory, weekKey),
        overrides: [],
        weekKey,
      });
    },
    [blocksByWeek, rhythmHistory],
  );

  const rhythmHistoryRef = useRef(rhythmHistory);
  useEffect(() => {
    rhythmHistoryRef.current = rhythmHistory;
  }, [rhythmHistory]);

  /** What the rhythm governing `weekKey` puts in one slot, if anything. */
  const rhythmSlotAt = useCallback(
    (weekKey: string, dayOfWeek: number, slot: number): RhythmSlot | null =>
      rhythmSlotsForWeek(rhythmHistoryRef.current, weekKey).find(
        (r) => r.dayOfWeek === dayOfWeek && r.slot === slot,
      ) ?? null,
    [],
  );

  /**
   * Turn a rhythm-projected cell into a real stored block, so that anything
   * keyed by block id has something to write against. Real ids pass through
   * untouched. Returns null when the rhythm slot behind the id is gone.
   */
  const ensureRealBlock = useCallback(
    async (blockId: string): Promise<string | null> => {
      const parsed = parseRhythmBlockId(blockId);
      if (!parsed) return blockId;
      const { weekKey, dayOfWeek, slot } = parsed;
      const source = rhythmSlotAt(weekKey, dayOfWeek, slot);
      if (!source) return null;

      if (user) {
        const saved = await materializeBlock(user.id, weekKey, {
          dayOfWeek,
          slot,
          blockType: source.blockType,
          title: source.title,
          description: source.description,
        });
        setSupaBlocks((prev) => withBlockInSlot(prev, weekKey, saved));
        return saved.id;
      }

      const current = loadFromStorage();
      const existing = current.blocks.find(
        (b) =>
          b.weekPlanId === weekKey &&
          b.dayOfWeek === dayOfWeek &&
          b.slot === slot,
      );
      if (existing) return existing.id;
      const created = createBlock({
        id: crypto.randomUUID(),
        weekPlanId: weekKey,
        dayOfWeek,
        slot,
        blockType: source.blockType,
        title: source.title,
        description: source.description,
        status: BlockStatus.Planned,
      });
      current.blocks.push(created);
      saveToStorage(current);
      return created.id;
    },
    [user, rhythmSlotAt],
  );

  /**
   * Record a rhythm-covered slot as deliberately empty this week, so the
   * rhythm does not refill it. Signed-in only; callers handle failures.
   */
  const suppressSlot = useCallback(
    async (
      weekKey: string,
      dayOfWeek: number,
      slot: number,
      source: RhythmSlot,
    ): Promise<void> => {
      if (!user) return;
      const saved = await materializeBlock(user.id, weekKey, {
        dayOfWeek,
        slot,
        blockType: source.blockType,
        title: source.title,
        description: source.description,
        suppressed: true,
      });
      setSupaBlocks((prev) => withBlockInSlot(prev, weekKey, saved));
    },
    [user],
  );

  const saveBlock = useCallback(
    (
      weekKey: string,
      dayOfWeek: number,
      slot: number,
      title: string,
      description: string,
      blockType: BlockType,
    ): Block => {
      const newBlockData = {
        weekPlanId: weekKey,
        dayOfWeek,
        slot,
        blockType,
        title,
        description,
      };

      if (user) {
        let resultBlock: Block | null = null;
        setSupaBlocks((prev) => {
          const weekBlocks = prev[weekKey] ?? [];
          const existing = weekBlocks.find(
            (b) => b.dayOfWeek === dayOfWeek && b.slot === slot,
          );
          if (existing) {
            const updated = createBlock({
              ...existing,
              title,
              description,
              blockType,
              suppressed: false,
            });
            resultBlock = updated;
            return {
              ...prev,
              [weekKey]: weekBlocks.map((b) =>
                b.id === existing.id ? updated : b,
              ),
            };
          }
          const created = createBlock({
            id: crypto.randomUUID(),
            ...newBlockData,
            status: BlockStatus.Planned,
          });
          resultBlock = created;
          return { ...prev, [weekKey]: [...weekBlocks, created] };
        });

        getOrCreateWeekPlan(user.id, weekKey)
          .then((weekPlanId) =>
            useCases.updateBlock.execute({
              weekPlanId,
              dayOfWeek,
              slot,
              blockType,
              title,
              description,
            }),
          )
          .then((saved) => {
            setSupaBlocks((prev) => ({
              ...prev,
              [weekKey]: (prev[weekKey] ?? []).map((b) =>
                b.dayOfWeek === dayOfWeek && b.slot === slot ? saved : b,
              ),
            }));
          })
          .catch((err) => {
            console.error(err);
            notify.error("區塊儲存失敗");
          });

        return resultBlock!;
      } else {
        const current = loadFromStorage();
        const existing = current.blocks.find(
          (b) =>
            b.weekPlanId === weekKey &&
            b.dayOfWeek === dayOfWeek &&
            b.slot === slot,
        );
        let resultBlock: Block;
        if (existing) {
          resultBlock = createBlock({
            ...existing,
            title,
            description,
            blockType,
            suppressed: false,
          });
          current.blocks = current.blocks.map((b) =>
            b.id === existing.id ? resultBlock : b,
          );
        } else {
          resultBlock = createBlock({
            id: crypto.randomUUID(),
            ...newBlockData,
            status: BlockStatus.Planned,
          });
          current.blocks.push(resultBlock);
        }
        saveToStorage(current);
        return resultBlock;
      }
    },
    [user, notify, useCases],
  );

  /**
   * Give a range of slots one type and title. Optimistic like saveBlock, but
   * written as one batch: a whole week's range is one round trip, and the
   * week plan is created once rather than raced for by every cell.
   */
  const nameSlots = useCallback(
    async (
      weekKey: string,
      slots: readonly SlotPosition[],
      title: string,
      blockType: BlockType,
    ): Promise<void> => {
      const naming = { slots, title, blockType };
      if (user) {
        setSupaBlocks((prev) =>
          nameBlocks(prev[weekKey] ?? [], {
            ...naming,
            weekPlanId: weekKey,
          }).reduce((acc, b) => withBlockInSlot(acc, weekKey, b), prev),
        );
        try {
          const weekPlanId = await getOrCreateWeekPlan(user.id, weekKey);
          const saved = await useCases.nameSlots.execute({
            ...naming,
            weekPlanId,
          });
          setSupaBlocks((prev) =>
            saved.reduce((acc, b) => withBlockInSlot(acc, weekKey, b), prev),
          );
        } catch (err) {
          console.error(err);
          notify.error("批次命名失敗");
          loadedWeeks.current.delete(weekKey);
          loadWeek(weekKey);
          throw err;
        }
        return;
      }

      const current = loadFromStorage();
      const named = nameBlocks(
        current.blocks.filter((b) => b.weekPlanId === weekKey),
        { ...naming, weekPlanId: weekKey },
      );
      const namedIds = new Set(named.map((b) => b.id));
      current.blocks = [
        ...current.blocks.filter((b) => !namedIds.has(b.id)),
        ...named,
      ];
      saveToStorage(current);
    },
    [user, notify, useCases, loadWeek],
  );

  const updateStatus = useCallback(
    (blockId: string, status: BlockStatus) => {
      const projected = parseRhythmBlockId(blockId);
      if (projected) {
        // Checking off a cell the rhythm supplied is the first time it needs a
        // row of its own — create it already carrying the new status.
        const { weekKey, dayOfWeek, slot } = projected;
        const source = rhythmSlotAt(weekKey, dayOfWeek, slot);
        if (!source) return;
        if (user) {
          materializeBlock(user.id, weekKey, {
            dayOfWeek,
            slot,
            blockType: source.blockType,
            title: source.title,
            description: source.description,
            status,
          })
            .then((saved) => {
              setSupaBlocks((prev) => withBlockInSlot(prev, weekKey, saved));
            })
            .catch((err) => {
              console.error(err);
              notify.error("狀態更新失敗");
            });
          return;
        }
        const current = loadFromStorage();
        current.blocks.push(
          createBlock({
            id: crypto.randomUUID(),
            weekPlanId: weekKey,
            dayOfWeek,
            slot,
            blockType: source.blockType,
            title: source.title,
            description: source.description,
            status,
          }),
        );
        saveToStorage(current);
        return;
      }

      if (user) {
        setSupaBlocks((prev) => withBlockChanged(prev, blockId, { status }));
        useCases.updateBlockStatus.execute(blockId, status).catch((err) => {
          console.error(err);
          notify.error("狀態更新失敗");
        });
      } else {
        const current = loadFromStorage();
        current.blocks = current.blocks.map((b) =>
          b.id === blockId ? createBlock({ ...b, status }) : b,
        );
        saveToStorage(current);
      }
    },
    [user, notify, useCases, rhythmSlotAt],
  );

  const copyRecentWeekPlan = useCallback(
    async (
      currentWeekKey: string,
    ): Promise<{ copied: number; sourceWeekKey: string | null }> => {
      if (!user) return { copied: 0, sourceWeekKey: null };

      // Look past the immediately previous week: after a break, that one is
      // usually empty and the last plan the user actually wrote is further back.
      const sourceWeekKey = await findMostRecentWeekWithBlocks(
        user.id,
        currentWeekKey,
        MAX_WEEKS_BACK_FOR_COPY,
      );
      if (!sourceWeekKey) return { copied: 0, sourceWeekKey: null };

      try {
        // Suppressed rows are deliberately empty slots, and regretted blocks
        // were judged not worth it in review — neither is a plan to copy.
        const prevBlocks = (
          await fetchBlocksForWeek(user.id, sourceWeekKey)
        ).filter((b) => !b.suppressed && !b.regretted);
        if (prevBlocks.length === 0) {
          return { copied: 0, sourceWeekKey: null };
        }

        const prevSubtasks = await fetchSubtasksForBlocks(
          prevBlocks.map((b) => b.id),
        );
        const subtasksByBlock = new Map<string, typeof prevSubtasks>();
        for (const s of prevSubtasks) {
          const list = subtasksByBlock.get(s.blockId) ?? [];
          list.push(s);
          subtasksByBlock.set(s.blockId, list);
        }

        // Use DB as source of truth for what's currently occupied.
        // Local `supaBlocks` can be stale after a prior failed copy, which
        // would let `upsertBlock` land on an existing row and collide on
        // `unique(block_id, position)` when re-inserting subtasks.
        const currentBlocksInDb = await fetchBlocksForWeek(
          user.id,
          currentWeekKey,
        );
        const occupied = new Set([
          ...currentBlocksInDb.map((b) => `${b.dayOfWeek}-${b.slot}`),
          // The rhythm already shows something in these cells; the user asked
          // to fill the empty ones, not to overwrite their standing plan.
          ...rhythmSlotsForWeek(rhythmHistoryRef.current, currentWeekKey).map(
            (r) => `${r.dayOfWeek}-${r.slot}`,
          ),
        ]);

        let inserted = 0;
        for (const prevBlock of prevBlocks) {
          const key = `${prevBlock.dayOfWeek}-${prevBlock.slot}`;
          if (occupied.has(key)) continue;

          const saved = await upsertBlock(
            user.id,
            currentWeekKey,
            prevBlock.dayOfWeek,
            prevBlock.slot,
            prevBlock.blockType,
            prevBlock.title,
            prevBlock.description,
          );

          const subtasksToCopy = (
            subtasksByBlock.get(prevBlock.id) ?? []
          ).slice();
          subtasksToCopy.sort((a, b) => a.position - b.position);
          for (let i = 0; i < subtasksToCopy.length; i++) {
            const st = subtasksToCopy[i];
            await dbAddSubtask(saved.id, st.title, i);
          }

          inserted++;
        }

        return { copied: inserted, sourceWeekKey };
      } finally {
        loadedWeeks.current.delete(currentWeekKey);
        loadWeek(currentWeekKey);
      }
    },
    [user, loadWeek],
  );

  /**
   * Fill every still-empty slot of a week with the default BLOCK6 rhythm.
   * The blocks land untitled — the point is to remove the "pick a type for all
   * 42 cells" step, not to guess what the user will do.
   */
  const applyWeekTemplate = useCallback(
    async (weekKey: string): Promise<number> => {
      if (user) {
        // The DB is the source of truth for what is occupied; local state can
        // lag behind a copy or a save that is still in flight.
        const existing = await fetchBlocksForWeek(user.id, weekKey);
        const slots = buildWeekTemplate([
          ...existing,
          ...rhythmSlotsForWeek(rhythmHistoryRef.current, weekKey),
        ]);
        if (slots.length === 0) return 0;
        try {
          await insertBlocks(user.id, weekKey, slots);
          return slots.length;
        } finally {
          loadedWeeks.current.delete(weekKey);
          loadWeek(weekKey);
        }
      }

      const current = loadFromStorage();
      const existing = current.blocks.filter((b) => b.weekPlanId === weekKey);
      const slots = buildWeekTemplate([
        ...existing,
        ...rhythmSlotsForWeek(current.rhythms, weekKey),
      ]);
      if (slots.length === 0) return 0;
      for (const slot of slots) {
        current.blocks.push(
          createBlock({
            id: crypto.randomUUID(),
            weekPlanId: weekKey,
            dayOfWeek: slot.dayOfWeek,
            slot: slot.slot,
            blockType: slot.blockType,
            title: "",
            description: "",
            status: BlockStatus.Planned,
          }),
        );
      }
      saveToStorage(current);
      return slots.length;
    },
    [user, loadWeek],
  );

  /** Adopt `slots` as the rhythm for the weeks after this one. */
  const adoptRhythmSlots = useCallback(
    async (slots: readonly RhythmSlot[]): Promise<void> => {
      if (user) {
        const saved = await useCases.setRhythm.execute({
          userId: user.id,
          slots,
          today: new Date(),
        });
        setSupaRhythms((prev) => adoptRhythm(prev, saved));
        return;
      }
      const current = loadFromStorage();
      current.rhythms = adoptRhythm(
        current.rhythms,
        createRhythm({
          id: crypto.randomUUID(),
          userId: "local",
          effectiveFrom: rhythmStartAfter(new Date()),
          slots,
        }),
      );
      saveToStorage(current);
    },
    [user, useCases],
  );

  /**
   * Adopt a week as the recurring rhythm. This is how the rhythm gets built:
   * arrange one week the way a typical week looks, then promote it — rather
   * than asking the user to fill in a separate 42-slot settings screen, which
   * would only move the planning cost, not remove it.
   */
  const setRhythmFromWeek = useCallback(
    async (weekKey: string): Promise<number> => {
      const slots = rhythmSlotsFromWeek(getBlocksForWeek(weekKey));
      await adoptRhythmSlots(slots);
      return slots.length;
    },
    [getBlocksForWeek, adoptRhythmSlots],
  );

  const clearRhythm = useCallback(
    () => adoptRhythmSlots([]),
    [adoptRhythmSlots],
  );

  const regrettedRhythmSlotsForWeek = useCallback(
    (weekKey: string): SlotPosition[] =>
      regrettedRhythmSlots(getBlocksForWeek(weekKey), rhythmSlots),
    [getBlocksForWeek, rhythmSlots],
  );

  const removeSlotsFromRhythm = useCallback(
    (slots: readonly SlotPosition[]) =>
      adoptRhythmSlots(rhythmWithout(rhythmSlots, slots)),
    [adoptRhythmSlots, rhythmSlots],
  );

  const setBlockRegretted = useCallback(
    async (rawBlockId: string, regretted: boolean): Promise<void> => {
      // A rhythm cell nobody wrote to has no row to carry the mark yet.
      const blockId = await ensureRealBlock(rawBlockId);
      if (!blockId) return;
      if (user) {
        setSupaBlocks((prev) => withBlockChanged(prev, blockId, { regretted }));
        try {
          await useCases.setBlockRegretted.execute(blockId, regretted);
        } catch (err) {
          console.error(err);
          notify.error("標記失敗");
          setSupaBlocks((prev) =>
            withBlockChanged(prev, blockId, { regretted: !regretted }),
          );
        }
        return;
      }
      const current = loadFromStorage();
      current.blocks = current.blocks.map((b) =>
        b.id === blockId ? createBlock({ ...b, regretted }) : b,
      );
      saveToStorage(current);
    },
    [user, notify, useCases, ensureRealBlock],
  );

  const deleteBlock = useCallback(
    async (blockId: string): Promise<void> => {
      const parsed = parseRhythmBlockId(blockId);

      // Clearing a slot the rhythm supplies cannot be a delete — there is no
      // row to delete, and the rhythm would refill it. Record it as "this week
      // this slot is deliberately empty" instead.
      if (parsed) {
        const { weekKey, dayOfWeek, slot } = parsed;
        const source = rhythmSlotAt(weekKey, dayOfWeek, slot);
        if (!source) return;
        if (user) {
          try {
            await suppressSlot(weekKey, dayOfWeek, slot, source);
          } catch (err) {
            console.error(err);
            notify.error("區塊刪除失敗");
            throw err;
          }
          return;
        }
        const current = loadFromStorage();
        current.blocks.push(
          suppressedRhythmBlock(weekKey, dayOfWeek, slot, source),
        );
        saveToStorage(current);
        return;
      }

      // A stored block is deleted outright, never just flagged: its status,
      // subtasks and timer sessions belong to it, and would resurface if the
      // slot were filled again. Where the rhythm covers the slot, a fresh
      // suppressed row then keeps the rhythm from refilling it.
      if (user) {
        const previous = supaBlocksRef.current;
        const located = locateBlock(previous, blockId);
        const source = located
          ? rhythmSlotAt(
              located.weekKey,
              located.block.dayOfWeek,
              located.block.slot,
            )
          : null;
        setSupaBlocks((prev) => {
          const out: Record<string, Block[]> = {};
          for (const [wk, list] of Object.entries(prev)) {
            // Hidden at once, so the rhythm does not flash back into the
            // slot while the suppressed row is being written.
            out[wk] = list.flatMap((b) =>
              b.id !== blockId
                ? [b]
                : source
                  ? [createBlock({ ...b, suppressed: true })]
                  : [],
            );
          }
          return out;
        });
        setSubtasks((prev) => prev.filter((st) => st.blockId !== blockId));
        setTimerSessions((prev) => prev.filter((ts) => ts.blockId !== blockId));
        setActiveTimer((prev) => (prev?.blockId === blockId ? null : prev));
        try {
          await dbDeleteBlock(blockId);
          if (located && source) {
            await suppressSlot(
              located.weekKey,
              located.block.dayOfWeek,
              located.block.slot,
              source,
            );
          }
        } catch (err) {
          console.error(err);
          notify.error("區塊刪除失敗");
          setSupaBlocks(previous);
          // Subtasks and timer sessions went with the block optimistically;
          // refetching the week is the only way to bring them back intact.
          if (located) {
            loadedWeeks.current.delete(located.weekKey);
            loadWeek(located.weekKey);
          }
          throw err;
        }
        return;
      }

      const current = loadFromStorage();
      const stored = current.blocks.find((b) => b.id === blockId);
      if (!stored) return;
      current.blocks = current.blocks.filter((b) => b.id !== blockId);
      const source = rhythmSlotAt(
        stored.weekPlanId,
        stored.dayOfWeek,
        stored.slot,
      );
      if (source) {
        current.blocks.push(
          suppressedRhythmBlock(
            stored.weekPlanId,
            stored.dayOfWeek,
            stored.slot,
            source,
          ),
        );
      }
      saveToStorage(current);
    },
    [user, notify, loadWeek, rhythmSlotAt, suppressSlot],
  );

  const swapBlocks = useCallback(
    async (rawIdA: string, rawIdB: string) => {
      const idA = await ensureRealBlock(rawIdA);
      const idB = await ensureRealBlock(rawIdB);
      if (!idA || !idB) return;
      setSupaBlocks((prev) => {
        const flat = Object.values(prev).flat();
        const a = flat.find((b) => b.id === idA);
        const b = flat.find((b) => b.id === idB);
        if (!a || !b) return prev;
        const out: Record<string, Block[]> = {};
        for (const [wk, list] of Object.entries(prev)) {
          out[wk] = list.map((block) => {
            if (block.id === idA) {
              return createBlock({
                ...block,
                dayOfWeek: b.dayOfWeek,
                slot: b.slot,
              });
            }
            if (block.id === idB) {
              return createBlock({
                ...block,
                dayOfWeek: a.dayOfWeek,
                slot: a.slot,
              });
            }
            return block;
          });
        }
        return out;
      });
      if (user) {
        try {
          await swapBlocksInDb(idA, idB);
        } catch (err) {
          console.error(err);
          notify.error("區塊交換失敗");
        }
      }
    },
    [user, notify, ensureRealBlock],
  );

  const moveBlock = useCallback(
    async (rawId: string, dayOfWeek: number, slot: number) => {
      // Read where the block sits before materializing it: a rhythm cell's
      // position lives in its id, and state has not caught up with it yet.
      const located = locateBlock(supaBlocksRef.current, rawId);
      const origin =
        parseRhythmBlockId(rawId) ??
        (located && {
          weekKey: located.weekKey,
          dayOfWeek: located.block.dayOfWeek,
          slot: located.block.slot,
        });
      const id = await ensureRealBlock(rawId);
      if (!id || !origin || !user) return;

      const { weekKey } = origin;
      const from = { dayOfWeek: origin.dayOfWeek, slot: origin.slot };
      const { displacedSuppressedId: displacedId, vacatedRhythmSlot } =
        planBlockMove({
          overrides: supaBlocksRef.current[weekKey] ?? [],
          rhythm: rhythmSlotsForWeek(rhythmHistoryRef.current, weekKey),
          from,
          to: { dayOfWeek, slot },
        });

      setSupaBlocks((prev) => {
        const next = (prev[weekKey] ?? []).flatMap((b) => {
          if (b.id === id) return [createBlock({ ...b, dayOfWeek, slot })];
          if (b.id !== displacedId) return [b];
          return vacatedRhythmSlot ? [createBlock({ ...b, ...from })] : [];
        });
        // Hold the vacated slot empty while its suppressed row is written,
        // instead of letting the rhythm flash back into it.
        if (vacatedRhythmSlot && !displacedId) {
          next.push(
            suppressedRhythmBlock(
              weekKey,
              from.dayOfWeek,
              from.slot,
              vacatedRhythmSlot,
            ),
          );
        }
        return { ...prev, [weekKey]: next };
      });

      try {
        if (displacedId) {
          // Trading places keeps the slot's unique row intact, and leaves the
          // suppressed row in the vacated slot — kept only if it belongs there.
          await swapBlocksInDb(id, displacedId);
          if (!vacatedRhythmSlot) await dbDeleteBlock(displacedId);
        } else {
          await moveBlockInDb(id, dayOfWeek, slot);
          if (vacatedRhythmSlot) {
            await suppressSlot(
              weekKey,
              from.dayOfWeek,
              from.slot,
              vacatedRhythmSlot,
            );
          }
        }
      } catch (err) {
        console.error(err);
        notify.error("區塊移動失敗");
        loadedWeeks.current.delete(weekKey);
        loadWeek(weekKey);
      }
    },
    [user, notify, ensureRealBlock, suppressSlot, loadWeek],
  );

  const saveDiary = useCallback(
    (dateKey: string, bad: string, good: string, next: string) => {
      if (user) {
        setSupaDiary((prev) => ({
          ...prev,
          [dateKey]: { bad, good, next },
        }));
        useCases.writeDiary
          .execute({
            userId: user.id,
            entryDate: parseDateKey(dateKey),
            bad,
            good,
            next,
          })
          .catch((err) => {
            console.error(err);
            notify.error("日記儲存失敗");
          });
      } else {
        const current = loadFromStorage();
        current.diaryEntries[dateKey] = { bad, good, next };
        saveToStorage(current);
      }
    },
    [user, notify, useCases],
  );

  const getDiary = useCallback(
    (dateKey: string): DiaryLines | null => {
      return diaryEntries[dateKey] ?? null;
    },
    [diaryEntries],
  );

  const setReflection = useCallback(
    (text: string) => {
      if (user) {
        setSupaReflection(text);
      } else {
        const current = loadFromStorage();
        current.reflection = text;
        saveToStorage(current);
      }
    },
    [user],
  );

  const getSubtasksForBlock = useCallback(
    (blockId: string): Subtask[] => {
      return subtasks
        .filter((s) => s.blockId === blockId)
        .sort((a, b) => a.position - b.position);
    },
    [subtasks],
  );

  const addSubtask = useCallback(
    async (rawBlockId: string, title: string) => {
      if (!user) return;
      const blockId = await ensureRealBlock(rawBlockId);
      if (!blockId) return;
      const existing = subtasks.filter((s) => s.blockId === blockId);
      const position =
        existing.length === 0
          ? 0
          : Math.max(...existing.map((s) => s.position)) + 1;
      dbAddSubtask(blockId, title, position)
        .then((created) => setSubtasks((prev) => [...prev, created]))
        .catch((err) => {
          console.error(err);
          notify.error("細項新增失敗");
        });
    },
    [user, subtasks, notify, ensureRealBlock],
  );

  const editSubtask = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setSubtasks((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)),
      );
      dbUpdateSubtaskTitle(id, trimmed).catch((err) => {
        console.error(err);
        notify.error("細項更新失敗");
      });
    },
    [notify],
  );

  const toggleSubtask = useCallback(
    (id: string) => {
      const target = subtasks.find((s) => s.id === id);
      if (!target) return;
      const newCompleted = !target.completed;
      setSubtasks((prev) =>
        prev.map((s) => (s.id === id ? { ...s, completed: newCompleted } : s)),
      );
      dbToggleSubtask(id, newCompleted).catch((err) => {
        console.error(err);
        notify.error("細項更新失敗");
      });
    },
    [subtasks, notify],
  );

  const deleteSubtask = useCallback(
    (id: string) => {
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      dbDeleteSubtask(id).catch((err) => {
        console.error(err);
        notify.error("細項刪除失敗");
      });
    },
    [notify],
  );

  const reorderSubtasks = useCallback(
    (_blockId: string, orderedIds: string[]) => {
      // Optimistic update: renumber locally
      setSubtasks((prev) => {
        const positionMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev.map((s) =>
          positionMap.has(s.id)
            ? { ...s, position: positionMap.get(s.id)! }
            : s,
        );
      });
      dbReorderSubtasks(orderedIds).catch((err) => {
        console.error(err);
        notify.error("細項排序失敗");
      });
    },
    [notify],
  );

  const addWeeklyTask = useCallback(
    (title: string) => {
      if (!user) return;
      const position =
        weeklyTasks.length === 0
          ? 0
          : Math.max(...weeklyTasks.map((t) => t.position)) + 1;
      dbAddWeeklyTask(user.id, title, position)
        .then((created) => setWeeklyTasks((prev) => [...prev, created]))
        .catch((err) => {
          console.error(err);
          notify.error("週任務新增失敗");
        });
    },
    [user, weeklyTasks, notify],
  );

  const editWeeklyTask = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setWeeklyTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
      );
      dbUpdateWeeklyTaskTitle(id, trimmed).catch((err) => {
        console.error(err);
        notify.error("週任務更新失敗");
      });
    },
    [notify],
  );

  const disableWeeklyTask = useCallback(
    (id: string) => {
      setWeeklyTasks((prev) => prev.filter((t) => t.id !== id));
      dbSetWeeklyTaskActive(id, false).catch((err) => {
        console.error(err);
        notify.error("週任務停用失敗");
      });
    },
    [notify],
  );

  const reorderWeeklyTasksOp = useCallback(
    (orderedIds: string[]) => {
      setWeeklyTasks((prev) => {
        const positionMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev
          .map((t) =>
            positionMap.has(t.id)
              ? { ...t, position: positionMap.get(t.id)! }
              : t,
          )
          .sort((a, b) => a.position - b.position);
      });
      dbReorderWeeklyTasks(orderedIds).catch((err) => {
        console.error(err);
        notify.error("週任務排序失敗");
      });
    },
    [notify],
  );

  const loadWeeklyCompletions = useCallback(
    (weekKey: string) => {
      if (!user || loadedCompletionsWeeks.current.has(weekKey)) return;
      loadedCompletionsWeeks.current.add(weekKey);
      fetchWeeklyTaskCompletions(user.id, weekKey)
        .then((rows) => {
          setWeeklyCompletions((prev) => ({
            ...prev,
            [weekKey]: new Set(rows.map((r) => r.weeklyTaskId)),
          }));
        })
        .catch((err) => {
          console.error(err);
          notify.error("載入週任務完成狀態失敗");
          loadedCompletionsWeeks.current.delete(weekKey);
        });
    },
    [user, notify],
  );

  const loadPlanChanges = useCallback(
    async (weekKey: string) => {
      const key = user?.id ?? "anon";
      const cacheKey = `${key}:${weekKey}`;
      if (loadedPlanChangeWeeks.current.has(cacheKey)) return;
      loadedPlanChangeWeeks.current.add(cacheKey);

      if (user) {
        try {
          const rows = await fetchPlanChangesForWeek(user.id, weekKey);
          setPlanChanges((prev) => ({ ...prev, [weekKey]: rows }));
        } catch (err) {
          console.error(err);
          loadedPlanChangeWeeks.current.delete(cacheKey);
          notify.error("載入計畫變更紀錄失敗");
        }
        return;
      }

      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(PLAN_CHANGES_STORAGE_KEY("anon"));
        const all: PlanChange[] = raw ? JSON.parse(raw) : [];
        const forWeek = all.filter((c) => c.weekKey === weekKey);
        setPlanChanges((prev) => ({ ...prev, [weekKey]: forWeek }));
      } catch {
        setPlanChanges((prev) => ({ ...prev, [weekKey]: [] }));
      }
    },
    [user, notify],
  );

  const addPlanChange = useCallback(
    async (input: Omit<LogPlanChangeInput, "userId">) => {
      const userId = user?.id ?? null;
      const change = logPlanChange({ ...input, userId });

      setPlanChanges((prev) => {
        const existing = prev[input.weekKey] ?? [];
        return { ...prev, [input.weekKey]: [...existing, change] };
      });

      if (user) {
        try {
          await insertPlanChange(change);
        } catch (err) {
          console.error(err);
          notify.error("儲存計畫變更紀錄失敗");
        }
        return;
      }

      if (typeof window === "undefined") return;
      const storageKey = PLAN_CHANGES_STORAGE_KEY("anon");
      let all: PlanChange[] = [];
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) all = JSON.parse(raw);
      } catch {
        all = [];
      }
      all.push(change);
      localStorage.setItem(storageKey, JSON.stringify(all));
    },
    [user, notify],
  );

  const toggleWeeklyTaskCompletion = useCallback(
    (id: string, weekKey: string) => {
      const current = weeklyCompletions[weekKey] ?? new Set<string>();
      const willComplete = !current.has(id);
      setWeeklyCompletions((prev) => {
        const next = new Set(prev[weekKey] ?? []);
        if (willComplete) next.add(id);
        else next.delete(id);
        return { ...prev, [weekKey]: next };
      });
      const op = willComplete
        ? dbAddWeeklyTaskCompletion(id, weekKey)
        : dbRemoveWeeklyTaskCompletion(id, weekKey);
      op.catch((err) => {
        console.error(err);
        notify.error("週任務狀態更新失敗");
      });
    },
    [weeklyCompletions, notify],
  );

  const getTaskTimeRanking = useCallback(
    (weekKey: string, now: Date) => {
      const weekBlocks = blocksByWeek[weekKey] ?? [];
      const titleByBlockId = new Map<string, string>();
      for (const b of weekBlocks) {
        if (b.title.trim()) titleByBlockId.set(b.id, b.title.trim());
      }
      const totals = new Map<string, number>();
      for (const session of timerSessions) {
        const title = titleByBlockId.get(session.blockId);
        if (!title) continue;
        const seconds = session.endedAt
          ? Math.max(0, session.durationSeconds ?? 0)
          : Math.max(
              0,
              Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
            );
        totals.set(title, (totals.get(title) ?? 0) + seconds);
      }
      return Array.from(totals.entries())
        .filter(([, seconds]) => seconds > 0)
        .map(([title, totalSeconds]) => ({ title, totalSeconds }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds);
    },
    [blocksByWeek, timerSessions],
  );

  const getElapsedSeconds = useCallback(
    (blockId: string, now: Date): number => {
      const sessions = timerSessions.filter((s) => s.blockId === blockId);
      let total = 0;
      for (const s of sessions) {
        if (s.endedAt) {
          total += Math.max(0, s.durationSeconds ?? 0);
        } else {
          total += Math.max(
            0,
            Math.floor((now.getTime() - s.startedAt.getTime()) / 1000),
          );
        }
      }
      return total;
    },
    [timerSessions],
  );

  const startTimer = useCallback(
    async (rawBlockId: string) => {
      if (!user) return;
      const blockId = await ensureRealBlock(rawBlockId);
      if (!blockId) return;
      try {
        if (activeTimer) {
          const nowDate = new Date();
          const duration = Math.floor(
            (nowDate.getTime() - activeTimer.startedAt.getTime()) / 1000,
          );
          setTimerSessions((prev) =>
            prev.map((s) =>
              s.id === activeTimer.id
                ? { ...s, endedAt: nowDate, durationSeconds: duration }
                : s,
            ),
          );
        }
        const newSession = await startTimerForBlock(user.id, blockId);
        setActiveTimer(newSession);
        setTimerSessions((prev) => {
          const existing = prev.find((s) => s.id === newSession.id);
          return existing ? prev : [...prev, newSession];
        });
      } catch (err) {
        console.error(err);
        notify.error("計時器啟動失敗");
      }
    },
    [user, activeTimer, notify, ensureRealBlock],
  );

  const stopTimer = useCallback(async () => {
    if (!user || !activeTimer) return;
    try {
      await stopActiveSession(user.id);
      const nowDate = new Date();
      const duration = Math.floor(
        (nowDate.getTime() - activeTimer.startedAt.getTime()) / 1000,
      );
      setTimerSessions((prev) =>
        prev.map((s) =>
          s.id === activeTimer.id
            ? { ...s, endedAt: nowDate, durationSeconds: duration }
            : s,
        ),
      );
      setActiveTimer(null);
    } catch (err) {
      console.error(err);
      notify.error("計時器停止失敗");
    }
  }, [user, activeTimer, notify]);

  const addManualTimer = useCallback(
    async (rawBlockId: string, startedAt: Date, endedAt: Date) => {
      if (!user) return;
      const blockId = await ensureRealBlock(rawBlockId);
      if (!blockId) return;
      try {
        const created = await dbAddManualSession(
          user.id,
          blockId,
          startedAt,
          endedAt,
        );
        setTimerSessions((prev) => [...prev, created]);
      } catch (err) {
        console.error(err);
        notify.error("手動新增時段失敗");
      }
    },
    [user, notify, ensureRealBlock],
  );

  const clearTimer = useCallback(
    async (blockId: string) => {
      if (!user) return;
      try {
        await dbDeleteSessionsForBlock(blockId);
        setTimerSessions((prev) => prev.filter((s) => s.blockId !== blockId));
        if (activeTimer?.blockId === blockId) {
          setActiveTimer(null);
        }
      } catch (err) {
        console.error(err);
        notify.error("清除計時失敗");
      }
    },
    [user, activeTimer, notify],
  );

  return (
    <AppStateContext.Provider
      value={{
        getBlocksForWeek,
        saveBlock,
        nameSlots,
        updateStatus,
        copyRecentWeekPlan,
        applyWeekTemplate,
        rhythmSlots,
        setRhythmFromWeek,
        clearRhythm,
        setBlockRegretted,
        regrettedRhythmSlotsForWeek,
        removeSlotsFromRhythm,
        deleteBlock,
        planChanges,
        loadPlanChanges,
        addPlanChange,
        swapBlocks,
        moveBlock,
        diaryEntries,
        saveDiary,
        getDiary,
        reflection,
        setReflection,
        loadWeek,
        loadDiary,
        loadReflection,
        subtasks,
        getSubtasksForBlock,
        addSubtask,
        editSubtask,
        toggleSubtask,
        deleteSubtask,
        reorderSubtasks,
        timerSessions,
        activeTimer,
        getElapsedSeconds,
        startTimer,
        stopTimer,
        addManualTimer,
        clearTimer,
        taskTitleSuggestions,
        weeklyTasks,
        weeklyCompletions,
        addWeeklyTask,
        editWeeklyTask,
        disableWeeklyTask,
        reorderWeeklyTasks: reorderWeeklyTasksOp,
        toggleWeeklyTaskCompletion,
        loadWeeklyCompletions,
        getTaskTimeRanking,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
