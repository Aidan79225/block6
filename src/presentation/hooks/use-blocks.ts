"use client";
import { useState, useCallback } from "react";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus, createBlock } from "@/domain/entities/block";

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);

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

  return { blocks, saveBlock, updateStatus };
}
