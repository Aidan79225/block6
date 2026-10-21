"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WeekTrajectory } from "@/domain/usecases/direction-trajectory";
import type { DirectionDraft } from "@/domain/usecases/set-directions";
import { DirectionEditor } from "@/presentation/components/direction/direction-editor";
import { TrajectoryChart } from "@/presentation/components/direction/trajectory-chart";
import { YearStrip } from "@/presentation/components/direction/year-strip";
import { useAppState } from "@/presentation/providers/app-state-provider";
import { useDirections } from "@/presentation/providers/direction-provider";
import { useNotify } from "@/presentation/providers/notification-provider";
import {
  addWeeks,
  formatDateKey,
  getMonday,
  weekKeysFrom,
  weekKeysOfYear,
} from "@/lib/date-helpers";

// Enough weeks to see a drift build up, few enough to read each bar.
const RECENT_WEEKS = 12;

export default function DirectionPage() {
  const { directions, saveDirections, loadTrajectory } = useDirections();
  const { rhythmSlots, taskTitleSuggestions } = useAppState();
  const notify = useNotify();
  const [now] = useState(() => new Date());
  const [weeks, setWeeks] = useState<WeekTrajectory[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const currentWeekKey = formatDateKey(getMonday(now));
  const yearWeekKeys = weekKeysOfYear(now.getFullYear());
  const firstRecent = addWeeks(currentWeekKey, -(RECENT_WEEKS - 1));
  // One load covers both views: the recent weeks and the year so far.
  const firstLoaded =
    yearWeekKeys[0] && yearWeekKeys[0] < firstRecent
      ? yearWeekKeys[0]
      : firstRecent;

  useEffect(() => {
    loadTrajectory(weekKeysFrom(firstLoaded, currentWeekKey))
      .then(setWeeks)
      .catch((err) => {
        console.error(err);
        notify.error("載入軌跡失敗");
      });
    // Directions are a dependency so the counts follow a save.
  }, [loadTrajectory, firstLoaded, currentWeekKey, directions, notify]);

  // Activities to sort into directions: the standing rhythm first, since that
  // is where most hours come from, then everything else used lately.
  const titles = [
    ...new Set([
      ...rhythmSlots.map((s) => s.title.trim()).filter(Boolean),
      ...taskTitleSuggestions.map((s) => s.title),
    ]),
  ];

  const handleSave = async (drafts: DirectionDraft[]) => {
    setIsSaving(true);
    try {
      await saveDirections(drafts);
      notify.info("方向已儲存");
    } catch (err) {
      console.error(err);
      notify.error("儲存方向失敗，請稍後再試");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-accent)",
          }}
        >
          方向
        </h1>
        <Link
          href="/"
          style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
        >
          &larr; 回到儀表板
        </Link>
      </div>
      <DirectionEditor
        key={directions.map((d) => `${d.id}:${d.text}`).join("|")}
        directions={directions}
        titles={titles}
        onSave={handleSave}
        isSaving={isSaving}
      />
      <TrajectoryChart
        directions={directions}
        weeks={weeks.filter((w) => w.weekKey >= firstRecent)}
      />
      <YearStrip
        weekKeys={yearWeekKeys}
        currentWeekKey={currentWeekKey}
        weeks={weeks}
        directions={directions}
      />
    </div>
  );
}
