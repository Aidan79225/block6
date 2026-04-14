import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubtaskList } from "@/presentation/components/side-panel/subtask-list";
import type { Subtask } from "@/domain/entities/subtask";

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: "s-1",
    blockId: "b-1",
    title: "寫測試",
    completed: false,
    position: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("SubtaskList", () => {
  it("renders each subtask title", () => {
    const items = [
      makeSubtask({ id: "s-1", title: "寫測試", position: 0 }),
      makeSubtask({ id: "s-2", title: "實作 API", position: 1 }),
    ];
    render(
      <SubtaskList
        blockId="b-1"
        items={items}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByText("寫測試")).toBeInTheDocument();
    expect(screen.getByText("實作 API")).toBeInTheDocument();
  });

  it("calls onAdd when user submits a new item", async () => {
    const user = userEvent.setup();
    let added: string | null = null;
    render(
      <SubtaskList
        blockId="b-1"
        items={[]}
        onAdd={(title) => {
          added = title;
        }}
        onEdit={() => {}}
        onToggle={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText(/新增細項/);
    await user.type(input, "新任務{Enter}");
    expect(added).toBe("新任務");
  });

  it("calls onToggle when checkbox clicked", async () => {
    const user = userEvent.setup();
    let toggled: string | null = null;
    render(
      <SubtaskList
        blockId="b-1"
        items={[makeSubtask({ id: "s-1", title: "寫測試" })]}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={(id) => {
          toggled = id;
        }}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(toggled).toBe("s-1");
  });

  it("calls onDelete when delete button clicked", async () => {
    const user = userEvent.setup();
    let deleted: string | null = null;
    render(
      <SubtaskList
        blockId="b-1"
        items={[makeSubtask({ id: "s-1", title: "寫測試" })]}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDelete={(id) => {
          deleted = id;
        }}
        onReorder={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(deleted).toBe("s-1");
  });

  it("shows advisory warning when more than 7 items", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeSubtask({ id: `s-${i}`, title: `任務 ${i}`, position: i }),
    );
    render(
      <SubtaskList
        blockId="b-1"
        items={items}
        onAdd={() => {}}
        onEdit={() => {}}
        onToggle={() => {}}
        onDelete={() => {}}
        onReorder={() => {}}
      />,
    );
    expect(screen.getByText(/建議不超過/)).toBeInTheDocument();
  });
});
