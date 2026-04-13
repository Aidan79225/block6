"use client";
import { useState, useCallback } from "react";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function useWeekPlan() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  }, []);

  return { weekStart, goToPreviousWeek, goToNextWeek };
}
