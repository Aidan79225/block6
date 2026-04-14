"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";
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
  toggleSubtaskCompleted as dbToggleSubtask,
  deleteSubtask as dbDeleteSubtask,
  reorderSubtasks as dbReorderSubtasks,
  fetchTimerSessionsForBlocks,
  fetchActiveSession,
  startTimerForBlock,
  stopActiveSession,
  addManualSession as dbAddManualSession,
} from "@/infrastructure/supabase/database";
import type { DiaryLines } from "@/infrastructure/supabase/database";

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
  ) => void;
  updateStatus: (blockId: string, status: BlockStatus) => void;
  diaryEntries: Record<string, DiaryLines>;
  saveDiary: (
    dateKey: string,
    line1: string,
    line2: string,
    line3: string,
  ) => void;
  getDiary: (dateKey: string) => DiaryLines | null;
  reflection: string;
  setReflection: (text: string) => void;
  loadWeek: (weekKey: string) => void;
  loadDiary: (dateKey: string) => void;
  loadReflection: (weekKey: string) => void;
  subtasks: Subtask[];
  getSubtasksForBlock: (blockId: string) => Subtask[];
  addSubtask: (blockId: string, title: string) => void;
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

function loadFromStorage(): PersistedData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as PersistedData;
    const blocks = (parsed.blocks ?? []).map((b) => createBlock(b));
    return {
      blocks,
      diaryEntries: parsed.diaryEntries ?? {},
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
      await upsertDiary(userId, dateKey, entry.line1, entry.line2, entry.line3);
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
  const [supaReflection, setSupaReflection] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [timerSessions, setTimerSessions] = useState<TimerSession[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimerSession | null>(null);

  const loadedWeeks = useRef<Set<string>>(new Set());
  const migrationDone = useRef(false);

  const isLoggedIn = !authLoading && !!user;

  // Pick data source based on auth state
  const blocks = isLoggedIn ? supaBlocks : localData.blocks;
  const diaryEntries = isLoggedIn ? supaDiary : localData.diaryEntries;
  const reflection = isLoggedIn ? supaReflection : localData.reflection;

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

  const loadDiary = useCallback(
    (dateKey: string) => {
      if (!user || supaDiary[dateKey]) return;
      fetchDiary(user.id, dateKey).then((entry) => {
        if (entry) {
          setSupaDiary((prev) => ({ ...prev, [dateKey]: entry }));
        }
      });
    },
    [user, supaDiary],
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
    ) => {
      const newBlockData = {
        weekPlanId: weekKey,
        dayOfWeek,
        slot,
        blockType,
        title,
        description,
      };

      if (user) {
        // Optimistic update to Supabase state
        setSupaBlocks((prev) => {
          const existing = prev.find(
            (b) =>
              b.weekPlanId === weekKey &&
              b.dayOfWeek === dayOfWeek &&
              b.slot === slot,
          );
          if (existing) {
            return prev.map((b) =>
              b.id === existing.id
                ? createBlock({ ...b, title, description, blockType })
                : b,
            );
          }
          return [
            ...prev,
            createBlock({
              id: crypto.randomUUID(),
              ...newBlockData,
              status: BlockStatus.Planned,
            }),
          ];
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
      } else {
        // Local mode: update localStorage directly
        const current = loadFromStorage();
        const existing = current.blocks.find(
          (b) =>
            b.weekPlanId === weekKey &&
            b.dayOfWeek === dayOfWeek &&
            b.slot === slot,
        );
        if (existing) {
          current.blocks = current.blocks.map((b) =>
            b.id === existing.id
              ? createBlock({ ...b, title, description, blockType })
              : b,
          );
        } else {
          current.blocks.push(
            createBlock({
              id: crypto.randomUUID(),
              ...newBlockData,
              status: BlockStatus.Planned,
            }),
          );
        }
        saveToStorage(current);
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

  const saveDiary = useCallback(
    (dateKey: string, line1: string, line2: string, line3: string) => {
      if (user) {
        setSupaDiary((prev) => ({
          ...prev,
          [dateKey]: { line1, line2, line3 },
        }));
        upsertDiary(user.id, dateKey, line1, line2, line3).catch((err) => {
          console.error(err);
          notify.error("日記儲存失敗");
        });
      } else {
        const current = loadFromStorage();
        current.diaryEntries[dateKey] = { line1, line2, line3 };
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

  const getElapsedSeconds = useCallback(
    (blockId: string, now: Date): number => {
      const sessions = timerSessions.filter((s) => s.blockId === blockId);
      let total = 0;
      for (const s of sessions) {
        if (s.endedAt) {
          total += s.durationSeconds ?? 0;
        } else {
          total += Math.floor(
            (now.getTime() - s.startedAt.getTime()) / 1000,
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

  return (
    <AppStateContext.Provider
      value={{
        allBlocks: blocks,
        getBlocksForWeek,
        saveBlock,
        updateStatus,
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
        toggleSubtask,
        deleteSubtask,
        reorderSubtasks,
        timerSessions,
        activeTimer,
        getElapsedSeconds,
        startTimer,
        stopTimer,
        addManualTimer,
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
