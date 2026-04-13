"use client";

import { createContext, useContext, useState, useCallback } from "react";
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

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<Record<string, DiaryLines>>(
    {},
  );
  const [reflection, setReflection] = useState("");

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
