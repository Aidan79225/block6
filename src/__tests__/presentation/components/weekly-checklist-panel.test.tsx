import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklyChecklistPanel } from "@/presentation/components/checklist/weekly-checklist-panel";
import type { WeeklyTask } from "@/domain/entities/weekly-task";

function makeTask(overrides: Partial<WeeklyTask> = {}): WeeklyTask {
  return {
    id: "t-1",
    userId: "u-1",
    title: "每週運動",
    position: 0,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("WeeklyChecklistPanel", () => {
  it("renders each task title", () => {
    render(
      <WeeklyChecklistPanel
        tasks={[
          makeTask({ id: "a", title: "運動" }),
          makeTask({ id: "b", title: "閱讀", position: 1 }),
        ]}
        completedIds={new Set()}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByText("運動")).toBeInTheDocument();
    expect(screen.getByText("閱讀")).toBeInTheDocument();
  });

  it("shows checkbox checked for completed tasks", () => {
    render(
      <WeeklyChecklistPanel
        tasks={[makeTask({ id: "a" })]}
        completedIds={new Set(["a"])}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onToggle when checkbox clicked", async () => {
    const user = userEvent.setup();
    let toggled: string | null = null;
    render(
      <WeeklyChecklistPanel
        tasks={[makeTask({ id: "a" })]}
        completedIds={new Set()}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={(id) => {
          toggled = id;
        }}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(toggled).toBe("a");
  });

  it("calls onAdd with new title on Enter", async () => {
    const user = userEvent.setup();
    let added: string | null = null;
    render(
      <WeeklyChecklistPanel
        tasks={[]}
        completedIds={new Set()}
        onAdd={(title) => {
          added = title;
        }}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={() => {}}
        onReorder={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText(/新增任務/);
    await user.type(input, "新任務{Enter}");
    expect(added).toBe("新任務");
  });

  it("calls onDisable when disable button clicked", async () => {
    const user = userEvent.setup();
    let disabled: string | null = null;
    render(
      <WeeklyChecklistPanel
        tasks={[makeTask({ id: "a" })]}
        completedIds={new Set()}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDisable={(id) => {
          disabled = id;
        }}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /disable/i }));
    expect(disabled).toBe("a");
  });
});
