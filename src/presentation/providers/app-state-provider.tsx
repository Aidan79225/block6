"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";
import { useAuth } from "./auth-provider";
import {
  fetchBlocksForWeek,
  upsertBlock,
  updateBlockStatus,
  fetchDiary,
  upsertDiary,
  fetchReflection,
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
}

// --- localStorage helpers ---

const STORAGE_KEY = "block6-data";
const MIGRATED_KEY = "block6-migrated";

interface PersistedData {
  blocks: Block[];
  diaryEntries: Record<string, DiaryLines>;
  reflection: string;
}

function loadFromStorage(): PersistedData {
  if (typeof window === "undefined") {
    return { blocks: [], diaryEntries: {}, reflection: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { blocks: [], diaryEntries: {}, reflection: "" };
    const parsed = JSON.parse(raw) as PersistedData;
    const blocks = (parsed.blocks ?? []).map((b) => createBlock(b));
    return {
      blocks,
      diaryEntries: parsed.diaryEntries ?? {},
      reflection: parsed.reflection ?? "",
    };
  } catch {
    return { blocks: [], diaryEntries: {}, reflection: "" };
  }
}

function saveToStorage(data: PersistedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
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

// --- Migration: push local data to Supabase ---

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

// --- Determine initial state based on auth ---

function getInitialState(): PersistedData {
  // If user is already logged in (session restored), start empty
  // so Supabase data gets loaded via loadWeek.
  // If not logged in, load from localStorage.
  // We can't check auth synchronously here, so always start from localStorage.
  // The migration effect will clear it if user is logged in.
  return loadFromStorage();
}

// --- Provider ---

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>(() => getInitialState().blocks);
  const [diaryEntries, setDiaryEntries] = useState<Record<string, DiaryLines>>(
    () => getInitialState().diaryEntries,
  );
  const [reflection, setReflectionState] = useState(
    () => getInitialState().reflection,
  );
  const localPersistEnabled = useRef(true);
  const loadedWeeks = useRef<Set<string>>(new Set());
  const migrating = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Handle auth state transitions
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserId.current;
    lastUserId.current = currentUserId;

    if (currentUserId && !previousUserId) {
      // Just logged in
      localPersistEnabled.current = false;

      if (!wasMigrated() && hasLocalData()) {
        // Migrate local data to Supabase
        migrating.current = true;
        const localData = loadFromStorage();
        migrateLocalToSupabase(currentUserId, localData)
          .then(() => {
            clearStorage();
            markMigrated();
            // Clear in-memory state so loadWeek fetches from Supabase
            setBlocks([]);
            setDiaryEntries({});
            setReflectionState("");
            loadedWeeks.current.clear();
          })
          .catch((err) => {
            console.error("[BLOCK6] Migration failed:", err);
          })
          .finally(() => {
            migrating.current = false;
          });
      } else {
        // No local data or already migrated — clear state for Supabase
        Promise.resolve().then(() => {
          setBlocks([]);
          setDiaryEntries({});
          setReflectionState("");
          loadedWeeks.current.clear();
        });
      }
    } else if (!currentUserId && previousUserId) {
      // Just logged out — restore from localStorage
      localPersistEnabled.current = true;
      Promise.resolve().then(() => {
        const local = loadFromStorage();
        setBlocks(local.blocks);
        setDiaryEntries(local.diaryEntries);
        setReflectionState(local.reflection);
        loadedWeeks.current.clear();
      });
    }
  }, [user?.id]);

  // Persist to localStorage only when not logged in
  useEffect(() => {
    if (!localPersistEnabled.current) return;
    saveToStorage({ blocks, diaryEntries, reflection });
  }, [blocks, diaryEntries, reflection]);

  // Load a week's blocks from Supabase
  const loadWeek = useCallback(
    (weekKey: string) => {
      if (!user || loadedWeeks.current.has(weekKey)) return;
      loadedWeeks.current.add(weekKey);
      fetchBlocksForWeek(user.id, weekKey)
        .then((fetched) => {
          setBlocks((prev) => {
            const withoutThisWeek = prev.filter(
              (b) => b.weekPlanId !== weekKey,
            );
            return [...withoutThisWeek, ...fetched];
          });
        })
        .catch((err) => {
          console.error("[BLOCK6] Failed to load week:", err);
          loadedWeeks.current.delete(weekKey);
        });
    },
    [user],
  );

  // Load diary for a specific date from Supabase
  const loadDiary = useCallback(
    (dateKey: string) => {
      if (!user || diaryEntries[dateKey]) return;
      fetchDiary(user.id, dateKey).then((entry) => {
        if (entry) {
          setDiaryEntries((prev) => ({ ...prev, [dateKey]: entry }));
        }
      });
    },
    [user, diaryEntries],
  );

  // Load reflection for a week from Supabase
  const loadReflection = useCallback(
    (weekKey: string) => {
      if (!user) return;
      fetchReflection(user.id, weekKey).then((text) => {
        setReflectionState(text);
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
      setBlocks((prev) => {
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
        const newBlock = createBlock({
          id: crypto.randomUUID(),
          weekPlanId: weekKey,
          dayOfWeek,
          slot,
          blockType,
          title,
          description,
          status: BlockStatus.Planned,
        });
        return [...prev, newBlock];
      });

      if (user) {
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
            setBlocks((prev) =>
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
            console.error("[BLOCK6] Failed to save block:", err);
          });
      }
    },
    [user],
  );

  const updateStatus = useCallback(
    (blockId: string, status: BlockStatus) => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? createBlock({ ...b, status }) : b,
        ),
      );
      if (user) {
        updateBlockStatus(blockId, status).catch((err) => {
          console.error("[BLOCK6] Failed to update status:", err);
        });
      }
    },
    [user],
  );

  const saveDiary = useCallback(
    (dateKey: string, line1: string, line2: string, line3: string) => {
      setDiaryEntries((prev) => ({
        ...prev,
        [dateKey]: { line1, line2, line3 },
      }));
      if (user) {
        upsertDiary(user.id, dateKey, line1, line2, line3).catch((err) => {
          console.error("[BLOCK6] Failed to save diary:", err);
        });
      }
    },
    [user],
  );

  const getDiary = useCallback(
    (dateKey: string): DiaryLines | null => {
      return diaryEntries[dateKey] ?? null;
    },
    [diaryEntries],
  );

  const setReflection = useCallback((text: string) => {
    setReflectionState(text);
  }, []);

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
