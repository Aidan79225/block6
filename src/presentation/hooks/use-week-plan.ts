"use client";
import { useState, useCallback } from "react";
import { getMonday } from "@/lib/date-helpers";

export function useWeekPlan() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  return { weekStart, goToPreviousWeek, goToNextWeek };
}
