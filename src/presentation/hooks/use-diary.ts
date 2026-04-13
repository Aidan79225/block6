"use client";
import { useState, useCallback } from "react";

interface DiaryLines { line1: string; line2: string; line3: string; }

export function useDiary() {
  const [entries, setEntries] = useState<Record<string, DiaryLines>>({});

  const saveDiary = useCallback((dateKey: string, line1: string, line2: string, line3: string) => {
    setEntries((prev) => ({ ...prev, [dateKey]: { line1, line2, line3 } }));
  }, []);

  const getDiary = useCallback((dateKey: string): DiaryLines | null => {
    return entries[dateKey] ?? null;
  }, [entries]);

  return { saveDiary, getDiary };
}
