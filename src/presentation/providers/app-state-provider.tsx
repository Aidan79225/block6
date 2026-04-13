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

const localSnapshot = { current: EMPTY_DATA };
function getStorageSnapshot(): PersistedData {
  localSnapshot.current = loadFromStorage();
  return localSnapshot.current;
}
function getServerSnapshot(): PersistedData {
  return EMPTY_DATA;
}

// --- Provider ---

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

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
          console.error("[BLOCK6] Migration failed:", err);
        });
    }
  }, [isLoggedIn, user]);

  // Load a week's blocks from Supabase
  const loadWeek = useCallback(
    (weekKey: string) => {
      if (!user || loadedWeeks.current.has(weekKey)) return;
      loadedWeeks.current.add(weekKey);
      fetchBlocksForWeek(user.id, weekKey)
        .then((fetched) => {
          setSupaBlocks((prev) => {
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
            console.error("[BLOCK6] Failed to save block:", err);
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
    [user],
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
          console.error("[BLOCK6] Failed to update status:", err);
        });
      } else {
        const current = loadFromStorage();
        current.blocks = current.blocks.map((b) =>
          b.id === blockId ? createBlock({ ...b, status }) : b,
        );
        saveToStorage(current);
      }
    },
    [user],
  );

  const saveDiary = useCallback(
    (dateKey: string, line1: string, line2: string, line3: string) => {
      if (user) {
        setSupaDiary((prev) => ({
          ...prev,
          [dateKey]: { line1, line2, line3 },
        }));
        upsertDiary(user.id, dateKey, line1, line2, line3).catch((err) => {
          console.error("[BLOCK6] Failed to save diary:", err);
        });
      } else {
        const current = loadFromStorage();
        current.diaryEntries[dateKey] = { line1, line2, line3 };
        saveToStorage(current);
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
