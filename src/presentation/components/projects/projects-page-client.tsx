"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/domain/entities/project";
import { ProjectStep } from "@/domain/entities/project-step";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useUseCases } from "@/presentation/providers/dependency-provider";
import { useNotify } from "@/presentation/providers/notification-provider";
import { ProjectCard } from "./project-card";

export function ProjectsPageClient() {
  const { user } = useAuth();
  const useCases = useUseCases();
  const notify = useNotify();

  const [projects, setProjects] = useState<Project[]>([]);
  const [stepsByProject, setStepsByProject] = useState<
    Record<string, ProjectStep[]>
  >({});
  const [krOptions, setKrOptions] = useState<
    { keyResultId: string; title: string; objectiveTitle: string }[]
  >([]);
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const [list, allKrs] = await Promise.all([
      useCases.listProjects.execute(user.id),
      useCases.listAllKeyResultsForUser.execute(user.id),
    ]);
    setProjects(list);
    setKrOptions(allKrs);
    const entries = await Promise.all(
      list.map(async (p) => {
        const steps = await useCases.listProjectStepsByProject.execute(p.id);
        return [p.id, steps] as const;
      }),
    );
    setStepsByProject(Object.fromEntries(entries));
  }, [user, useCases]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state set after await, not synchronously
    load().catch((e) => {
      console.error(e);
      notify.error("載入專案失敗");
    });
  }, [load, notify]);

  const visible = projects.filter((p) =>
    showArchived ? true : p.status !== "archived",
  );

  const handleAddProject = async () => {
    if (!user || !newTitle.trim()) return;
    await useCases.createProject.execute(user.id, newTitle.trim());
    setNewTitle("");
    await load();
  };

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
          Projects
        </h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label
            style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{" "}
            顯示已歸檔
          </label>
          <Link
            href="/"
            style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
          >
            &larr; 回到儀表板
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px" }}>
        <input
          placeholder="新增專案標題"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              handleAddProject().catch((err) => {
                console.error(err);
                notify.error("新增專案失敗");
              });
          }}
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
            handleAddProject().catch((err) => {
              console.error(err);
              notify.error("新增專案失敗");
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
          ＋ 專案
        </button>
      </div>

      {visible.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          steps={stepsByProject[project.id] ?? []}
          keyResultOptions={krOptions}
          onSetKeyResult={async (keyResultId) => {
            await useCases.updateProject.execute(project.id, {
              title: project.title,
              keyResultId,
              status: project.status,
            });
            await load();
          }}
          onAddStep={async (title) => {
            await useCases.createProjectStep.execute(project.id, title);
            await load();
          }}
          onRenameStep={async (stepId, title) => {
            await useCases.updateProjectStep.execute(stepId, title);
            await load();
          }}
          onDeleteStep={async (stepId) => {
            await useCases.deleteProjectStep.execute(stepId);
            await load();
          }}
          onArchiveToggle={async () => {
            await useCases.updateProject.execute(project.id, {
              title: project.title,
              keyResultId: project.keyResultId,
              status: project.status === "archived" ? "active" : "archived",
            });
            await load();
          }}
          onDeleteProject={async () => {
            await useCases.deleteProject.execute(project.id);
            await load();
          }}
        />
      ))}
    </div>
  );
}
