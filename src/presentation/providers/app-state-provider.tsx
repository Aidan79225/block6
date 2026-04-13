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

// --- localStorage fallback (for unauthenticated use) ---

const STORAGE_KEY = "block6-data";

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

// --- Provider ---

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>(
    () => loadFromStorage().blocks,
  );
  const [diaryEntries, setDiaryEntries] = useState<Record<string, DiaryLines>>(
    () => loadFromStorage().diaryEntries,
  );
  const [reflection, setReflectionState] = useState(
    () => loadFromStorage().reflection,
  );
  const initialized = useRef(false);
  const loadedWeeks = useRef<Set<string>>(new Set());

  // Persist to localStorage when not logged in
  useEffect(() => {
    if (user) return;
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage({ blocks, diaryEntries, reflection });
  }, [blocks, diaryEntries, reflection, user]);

  // Load a week's blocks from Supabase
  const loadWeek = useCallback(
    (weekKey: string) => {
      if (!user || loadedWeeks.current.has(weekKey)) return;
      loadedWeeks.current.add(weekKey);
      fetchBlocksForWeek(user.id, weekKey).then((fetched) => {
        setBlocks((prev) => {
          const withoutThisWeek = prev.filter((b) => b.weekPlanId !== weekKey);
          return [...withoutThisWeek, ...fetched];
        });
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
      // Optimistic local update
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

      // Persist to Supabase if logged in
      if (user) {
        upsertBlock(
          user.id,
          weekKey,
          dayOfWeek,
          slot,
          blockType,
          title,
          description,
        ).then((saved) => {
          // Sync the server-generated ID back
          setBlocks((prev) =>
            prev.map((b) =>
              b.weekPlanId === weekKey &&
              b.dayOfWeek === dayOfWeek &&
              b.slot === slot
                ? saved
                : b,
            ),
          );
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
        updateBlockStatus(blockId, status);
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
        upsertDiary(user.id, dateKey, line1, line2, line3);
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
      setReflectionState(text);
      // Note: caller should provide weekKey via saveReflection if needed
    },
    [],
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
