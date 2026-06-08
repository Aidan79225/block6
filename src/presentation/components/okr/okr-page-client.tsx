"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OkrCycle } from "@/domain/entities/okr-cycle";
import { Objective } from "@/domain/entities/objective";
import { KeyResult } from "@/domain/entities/key-result";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useUseCases } from "@/presentation/providers/dependency-provider";
import { useNotify } from "@/presentation/providers/notification-provider";
import { CycleSelector } from "./cycle-selector";
import { ObjectiveCard } from "./objective-card";

export function OkrPageClient() {
  const { user } = useAuth();
  const useCases = useUseCases();
  const notify = useNotify();

  const [cycles, setCycles] = useState<OkrCycle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [krsByObjective, setKrsByObjective] = useState<
    Record<string, KeyResult[]>
  >({});
  const [newObjectiveTitle, setNewObjectiveTitle] = useState("");

  const loadCycles = useCallback(async () => {
    if (!user) return;
    const list = await useCases.listOkrCycles.execute(user.id);
    setCycles(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
  }, [user, useCases]);

  const loadTree = useCallback(
    async (cycleId: string) => {
      const objs = await useCases.listObjectivesByCycle.execute(cycleId);
      setObjectives(objs);
      const entries = await Promise.all(
        objs.map(async (o) => {
          const krs = await useCases.listKeyResultsByObjective.execute(o.id);
          return [o.id, krs] as const;
        }),
      );
      setKrsByObjective(Object.fromEntries(entries));
    },
    [useCases],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load resolves after await; state is set in the resolved promise, not synchronously
    loadCycles().catch((e) => {
      console.error(e);
      notify.error("載入 OKR 週期失敗");
    });
  }, [loadCycles, notify]);

  useEffect(() => {
    if (selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async load resolves after await; state is set in the resolved promise, not synchronously
      loadTree(selectedId).catch((e) => {
        console.error(e);
        notify.error("載入目標失敗");
      });
    }
  }, [selectedId, loadTree, notify]);

  const handleCreateCycle = async (
    name: string,
    startDate: Date,
    endDate: Date,
  ) => {
    if (!user) return;
    const created = await useCases.createOkrCycle.execute(
      user.id,
      name,
      startDate,
      endDate,
    );
    await loadCycles();
    setSelectedId(created.id);
  };

  const handleAddObjective = async () => {
    if (!selectedId || !newObjectiveTitle.trim()) return;
    await useCases.createObjective.execute(selectedId, newObjectiveTitle.trim());
    setNewObjectiveTitle("");
    await loadTree(selectedId);
  };

  const refresh = () => selectedId && loadTree(selectedId);

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
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
          OKR
        </h1>
        <Link
          href="/"
          style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
        >
          &larr; 回到儀表板
        </Link>
      </div>

      <CycleSelector
        cycles={cycles}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={(n, s, e) =>
          handleCreateCycle(n, s, e).catch((err) => {
            console.error(err);
            notify.error("建立週期失敗");
          })
        }
      />

      {selectedId &&
        objectives.map((obj) => (
          <ObjectiveCard
            key={obj.id}
            objective={obj}
            keyResults={krsByObjective[obj.id] ?? []}
            onDeleteObjective={async () => {
              await useCases.deleteObjective.execute(obj.id);
              await refresh();
            }}
            onAddKeyResult={async (data) => {
              await useCases.createKeyResult.execute(obj.id, data);
              await refresh();
            }}
            onSaveKeyResultValue={async (krId, value) => {
              await useCases.updateKeyResultValue.execute(krId, value);
              await refresh();
            }}
            onDeleteKeyResult={async (krId) => {
              await useCases.deleteKeyResult.execute(krId);
              await refresh();
            }}
          />
        ))}

      {selectedId && (
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            placeholder="新增目標標題"
            value={newObjectiveTitle}
            onChange={(e) => setNewObjectiveTitle(e.target.value)}
            style={{
              flex: 1,
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
              padding: "8px 12px",
              fontSize: "14px",
            }}
          />
          <button
            type="button"
            onClick={() =>
              handleAddObjective().catch((err) => {
                console.error(err);
                notify.error("新增目標失敗");
              })
            }
            style={{
              background: "var(--color-accent)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              cursor: "pointer",
              padding: "8px 16px",
            }}
          >
            ＋ 目標
          </button>
        </div>
      )}
    </div>
  );
}
