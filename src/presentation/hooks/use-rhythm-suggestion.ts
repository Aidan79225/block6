"use client";

import { useEffect, useState } from "react";
import type { RhythmSlot } from "@/domain/entities/rhythm-slot";
import {
  rhythmSuggestion,
  suggestionWeekKeys,
} from "@/domain/usecases/suggest-rhythm";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useUseCases } from "@/presentation/providers/dependency-provider";
import { formatDateKey, getMonday } from "@/lib/date-helpers";

const DISMISSED_KEY = "block6:rhythmSuggestionDismissed";

/**
 * Rhythm auto-detection: slots the last weeks all held the same way, offered
 * as an addition to the rhythm. "不用" quiets it until next week.
 */
export function useRhythmSuggestion() {
  const { user, loading } = useAuth();
  const useCases = useUseCases();
  const { getBlocksForWeek, rhythmSlots, addSlotsToRhythm } = useAppState();
  const [fetched, setFetched] = useState<RhythmSlot[]>([]);
  // undefined until read: avoids a flash of the suggestion before it is known
  // whether it was turned down this week.
  const [dismissedWeek, setDismissedWeek] = useState<string | null>();
  const thisWeek = formatDateKey(getMonday(new Date()));

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        setDismissedWeek(localStorage.getItem(DISMISSED_KEY));
      } catch {
        setDismissedWeek(null);
      }
    });
  }, []);

  // Signed in, past weeks are not in memory: ask the use case, again whenever
  // the rhythm changes.
  useEffect(() => {
    if (loading || !user) return;
    useCases.suggestRhythm
      .execute(user.id, new Date())
      .then(setFetched)
      .catch((err) => console.error(err));
  }, [loading, user, useCases, rhythmSlots]);

  // Guests have every week in memory already.
  const suggested = user
    ? fetched
    : rhythmSuggestion(
        suggestionWeekKeys(new Date()).map((weekKey) =>
          getBlocksForWeek(weekKey),
        ),
        rhythmSlots,
      );

  return {
    slots:
      dismissedWeek === undefined || dismissedWeek === thisWeek
        ? []
        : suggested,
    accept: async () => {
      await addSlotsToRhythm(suggested);
      setFetched([]);
    },
    dismiss: () => {
      try {
        localStorage.setItem(DISMISSED_KEY, thisWeek);
      } catch {
        // Storage unavailable: it just comes back next visit.
      }
      setDismissedWeek(thisWeek);
    },
  };
}
