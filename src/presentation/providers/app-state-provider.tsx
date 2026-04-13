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

interface DiaryLines {
  line1: string;
  line2: string;
  line3: string;
}

interface AppState {
  blocks: Block[];
  saveBlock: (
    weekPlanId: string,
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
}

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

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>(
    () => loadFromStorage().blocks,
  );
  const [diaryEntries, setDiaryEntries] = useState<Record<string, DiaryLines>>(
    () => loadFromStorage().diaryEntries,
  );
  const [reflection, setReflectionState] = useState(
    () => loadFromStorage().reflection,
  );

  // Track whether initial render is done to avoid persisting on mount
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage({ blocks, diaryEntries, reflection });
  }, [blocks, diaryEntries, reflection]);

  const saveBlock = useCallback(
    (
      weekPlanId: string,
      dayOfWeek: number,
      slot: number,
      title: string,
      description: string,
      blockType: BlockType,
    ) => {
      setBlocks((prev) => {
        const existing = prev.find(
          (b) => b.dayOfWeek === dayOfWeek && b.slot === slot,
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
          weekPlanId,
          dayOfWeek,
          slot,
          blockType,
          title,
          description,
          status: BlockStatus.Planned,
        });
        return [...prev, newBlock];
      });
    },
    [],
  );

  const updateStatus = useCallback((blockId: string, status: BlockStatus) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? createBlock({ ...b, status }) : b)),
    );
  }, []);

  const saveDiary = useCallback(
    (dateKey: string, line1: string, line2: string, line3: string) => {
      setDiaryEntries((prev) => ({
        ...prev,
        [dateKey]: { line1, line2, line3 },
      }));
    },
    [],
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
        blocks,
        saveBlock,
        updateStatus,
        diaryEntries,
        saveDiary,
        getDiary,
        reflection,
        setReflection,
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
