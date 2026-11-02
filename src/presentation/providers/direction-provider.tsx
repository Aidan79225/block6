"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createDirection, type Direction } from "@/domain/entities/direction";
import {
  weekTrajectory,
  type WeekTrajectory,
} from "@/domain/usecases/direction-trajectory";
import type { DirectionDraft } from "@/domain/usecases/set-directions";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useUseCases } from "@/presentation/providers/dependency-provider";
import { useNotify } from "@/presentation/providers/notification-provider";

interface DirectionState {
  directions: Direction[];
  saveDirections: (drafts: readonly DirectionDraft[]) => Promise<void>;
  /** How the directions fared in each of the given weeks. */
  loadTrajectory: (weekKeys: readonly string[]) => Promise<WeekTrajectory[]>;
  /** Direction id each loaded week set out to pull back, if any. */
  weekFocus: Record<string, string | null>;
  loadWeekFocus: (weekKey: string) => void;
  setWeekFocus: (weekKey: string, directionId: string | null) => Promise<void>;
}

const STORAGE_KEY = "block6:directions";

interface GuestData {
  directions: Direction[];
  focus: Record<string, string>;
}

function loadGuest(): GuestData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { directions: [], focus: {} };
    const parsed = JSON.parse(raw) as Partial<GuestData>;
    return {
      directions: (parsed.directions ?? []).map((d) => createDirection(d)),
      focus: parsed.focus ?? {},
    };
  } catch {
    return { directions: [], focus: {} };
  }
}

function saveGuest(data: GuestData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

const DirectionContext = createContext<DirectionState | null>(null);

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const useCases = useUseCases();
  const notify = useNotify();
  const { getBlocksForWeek } = useAppState();
  const [directions, setDirections] = useState<Direction[]>([]);
  const [weekFocus, setWeekFocusState] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Deferred so the state update does not run inside the effect body.
      Promise.resolve().then(() => {
        const guest = loadGuest();
        setDirections(guest.directions);
        setWeekFocusState(guest.focus);
      });
      return;
    }
    Promise.resolve().then(() => setWeekFocusState({}));
    useCases.listDirections
      .execute(user.id)
      .then(setDirections)
      .catch((err) => {
        console.error(err);
        notify.error("載入方向失敗");
      });
  }, [authLoading, user, useCases, notify]);

  const saveDirections = useCallback(
    async (drafts: readonly DirectionDraft[]) => {
      if (user) {
        const saved = await useCases.setDirections.execute({
          userId: user.id,
          drafts,
        });
        setDirections(saved);
        return;
      }
      // Guests go through the same rules, against an in-browser store.
      const guest = loadGuest();
      const saved = drafts
        .filter((d) => d.text.trim())
        .map((d, position) =>
          createDirection({
            id: d.id ?? crypto.randomUUID(),
            userId: "local",
            position,
            text: d.text,
            titles: d.titles,
          }),
        );
      const ids = new Set(saved.map((d) => d.id));
      const focus = Object.fromEntries(
        Object.entries(guest.focus).filter(([, id]) => ids.has(id)),
      );
      saveGuest({ directions: saved, focus });
      setDirections(saved);
      setWeekFocusState(focus);
    },
    [user, useCases],
  );

  const loadTrajectory = useCallback(
    async (weekKeys: readonly string[]): Promise<WeekTrajectory[]> => {
      if (user) {
        const result = await useCases.getDirectionTrajectory.execute(
          user.id,
          weekKeys,
        );
        return result.weeks;
      }
      // Every guest week is already in memory, rhythm projection included.
      return weekKeys.map((weekKey) =>
        weekTrajectory(weekKey, getBlocksForWeek(weekKey), directions),
      );
    },
    [user, useCases, getBlocksForWeek, directions],
  );

  const loadWeekFocus = useCallback(
    (weekKey: string) => {
      if (!user) return; // Guests load every week's focus up front.
      useCases.getWeekFocus
        .execute(user.id, weekKey)
        .then((id) => setWeekFocusState((prev) => ({ ...prev, [weekKey]: id })))
        .catch((err) => console.error(err));
    },
    [user, useCases],
  );

  const setWeekFocus = useCallback(
    async (weekKey: string, directionId: string | null) => {
      setWeekFocusState((prev) => ({ ...prev, [weekKey]: directionId }));
      if (user) {
        try {
          await useCases.setWeekFocus.execute(user.id, weekKey, directionId);
        } catch (err) {
          console.error(err);
          notify.error("儲存失敗");
          loadWeekFocus(weekKey);
        }
        return;
      }
      const guest = loadGuest();
      if (directionId) guest.focus[weekKey] = directionId;
      else delete guest.focus[weekKey];
      saveGuest(guest);
    },
    [user, useCases, notify, loadWeekFocus],
  );

  return (
    <DirectionContext.Provider
      value={{
        directions,
        saveDirections,
        loadTrajectory,
        weekFocus,
        loadWeekFocus,
        setWeekFocus,
      }}
    >
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirections(): DirectionState {
  const ctx = useContext(DirectionContext);
  if (!ctx)
    throw new Error("useDirections must be used within DirectionProvider");
  return ctx;
}
