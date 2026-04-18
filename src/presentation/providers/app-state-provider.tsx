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
import type { Subtask } from "@/domain/entities/subtask";
import type { TimerSession } from "@/domain/entities/timer-session";
import {
  fetchBlocksForWeek,
  upsertBlock,
  updateBlockStatus,
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
} from "@/infrastructure/supabase/database";
import type { DiaryLines } from "@/infrastructure/supabase/database";
import type { PlanChange } from "@/domain/entities/plan-change";
import { logPlanChange } from "@/domain/usecases/log-plan-change";
import type { LogPlanChangeInput } from "@/domain/usecases/log-plan-change";
import { formatDateKey } from "@/lib/date-helpers";

interface AppState {
  allBlocks: Block[];
  getBlocksForWeek: (weekKey: string) => Block[];
  saveBlock: (
    weekKey: string,
    dayOfWeek: number,
    slot: number,
    title: string,
    description: string,
    blockType: BlockType,
  ) => Block;
  updateStatus: (blockId: string, status: BlockStatus) => void;
  copyPreviousWeekPlan: (currentWeekKey: string) => Promise<number>;
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
}

const EMPTY_DATA: PersistedData = {
  blocks: [],
  diaryEntries: {},
  reflection: "",
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

function loadFromStorage(): PersistedData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as PersistedData & {
      diaryEntries?: Record<string, Record<string, string>>;
    };
    const blocks = (parsed.blocks ?? []).map((b) => createBlock(b));
    return {
      blocks,
      diaryEntries: migrateDiaryEntries(parsed.diaryEntries),
      reflection: parsed.reflection ?? "",
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
  } catch {
    // Storage full or unavailable
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedData = EMPTY_DATA;
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
      (parsed.reflection ?? "").length > 0
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
  for (const block of data.blocks) {
    try {
      await upsertBlock(
        userId,
        block.weekPlanId,
        block.dayOfWeek,
        block.slot,
        block.blockType,
        block.title,
        block.description,
      );
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
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
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

const PLAN_CHANGES_STORAGE_KEY = (userIdOrAnon: string) =>
  `block6:planChanges:${userIdOrAnon}`;

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const notify = useNotify();

  // SSR-safe read of localStorage
  const localData = useSyncExternalStore(
    subscribeToStorage,
    getStorageSnapshot,
    getServerSnapshot,
  );

  // Supabase-sourced state (only used when logged in)
  const [supaBlocks, setSupaBlocks] = useState<Block[]>([]);
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
  const blocks = isLoggedIn ? supaBlocks : localData.blocks;
  const diaryEntries = isLoggedIn ? supaDiary : localData.diaryEntries;
  const reflection = isLoggedIn ? supaReflection : localData.reflection;

  const taskTitleSuggestions = useMemo<TitleSuggestion[]>(() => {
    const counts = new Map<string, number>();
    for (const b of blocks) {
      const title = b.title.trim();
      if (!title) continue;
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
  }, [blocks]);

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
          setSupaBlocks((prev) => {
            const withoutThisWeek = prev.filter(
              (b) => b.weekPlanId !== weekKey,
            );
            return [...withoutThisWeek, ...fetched];
          });
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
      return blocks.filter((b) => b.weekPlanId === weekKey);
    },
    [blocks],
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
          const existing = prev.find(
            (b) =>
              b.weekPlanId === weekKey &&
              b.dayOfWeek === dayOfWeek &&
              b.slot === slot,
          );
          if (existing) {
            const updated = createBlock({
              ...existing,
              title,
              description,
              blockType,
            });
            resultBlock = updated;
            return prev.map((b) => (b.id === existing.id ? updated : b));
          }
          const created = createBlock({
            id: crypto.randomUUID(),
            ...newBlockData,
            status: BlockStatus.Planned,
          });
          resultBlock = created;
          return [...prev, created];
        });

        upsertBlock(
          user.id,
          weekKey,
          dayOfWeek,
          slot,
          blockType,
          title,
          description,
        )
          .then((saved) => {
            setSupaBlocks((prev) =>
              prev.map((b) =>
                b.weekPlanId === weekKey &&
                b.dayOfWeek === dayOfWeek &&
                b.slot === slot
                  ? saved
                  : b,
              ),
            );
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
    [user, notify],
  );

  const updateStatus = useCallback(
    (blockId: string, status: BlockStatus) => {
      if (user) {
        setSupaBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? createBlock({ ...b, status }) : b,
          ),
        );
        updateBlockStatus(blockId, status).catch((err) => {
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
    [user, notify],
  );

  const copyPreviousWeekPlan = useCallback(
    async (currentWeekKey: string): Promise<number> => {
      if (!user) return 0;

      const currentDate = new Date(currentWeekKey);
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      const previousWeekKey = formatDateKey(prev);

      const prevBlocks = await fetchBlocksForWeek(user.id, previousWeekKey);
      if (prevBlocks.length === 0) return 0;

      const prevSubtasks = await fetchSubtasksForBlocks(
        prevBlocks.map((b) => b.id),
      );
      const subtasksByBlock = new Map<string, typeof prevSubtasks>();
      for (const s of prevSubtasks) {
        const list = subtasksByBlock.get(s.blockId) ?? [];
        list.push(s);
        subtasksByBlock.set(s.blockId, list);
      }

      const currentBlocks = supaBlocks.filter(
        (b) => b.weekPlanId === currentWeekKey,
      );
      const occupied = new Set(
        currentBlocks.map((b) => `${b.dayOfWeek}-${b.slot}`),
      );

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

      // Force re-fetch of this week's data
      loadedWeeks.current.delete(currentWeekKey);
      loadWeek(currentWeekKey);

      return inserted;
    },
    [user, supaBlocks, loadWeek],
  );

  const swapBlocks = useCallback(
    async (idA: string, idB: string) => {
      setSupaBlocks((prev) => {
        const a = prev.find((b) => b.id === idA);
        const b = prev.find((b) => b.id === idB);
        if (!a || !b) return prev;
        return prev.map((block) => {
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
    [user, notify],
  );

  const moveBlock = useCallback(
    async (id: string, dayOfWeek: number, slot: number) => {
      setSupaBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? createBlock({ ...block, dayOfWeek, slot }) : block,
        ),
      );
      if (user) {
        try {
          await moveBlockInDb(id, dayOfWeek, slot);
        } catch (err) {
          console.error(err);
          notify.error("區塊移動失敗");
        }
      }
    },
    [user, notify],
  );

  const saveDiary = useCallback(
    (dateKey: string, bad: string, good: string, next: string) => {
      if (user) {
        setSupaDiary((prev) => ({
          ...prev,
          [dateKey]: { bad, good, next },
        }));
        upsertDiary(user.id, dateKey, bad, good, next).catch((err) => {
          console.error(err);
          notify.error("日記儲存失敗");
        });
      } else {
        const current = loadFromStorage();
        current.diaryEntries[dateKey] = { bad, good, next };
        saveToStorage(current);
      }
    },
    [user, notify],
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
    (blockId: string, title: string) => {
      if (!user) return;
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
    [user, subtasks, notify],
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
      const weekBlocks = blocks.filter((b) => b.weekPlanId === weekKey);
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
    [blocks, timerSessions],
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
    async (blockId: string) => {
      if (!user) return;
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
    [user, activeTimer, notify],
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
    async (blockId: string, startedAt: Date, endedAt: Date) => {
      if (!user) return;
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
    [user, notify],
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
        allBlocks: blocks,
        getBlocksForWeek,
        saveBlock,
        updateStatus,
        copyPreviousWeekPlan,
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
