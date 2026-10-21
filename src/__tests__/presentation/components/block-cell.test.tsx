import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { BlockCell } from "@/presentation/components/week-grid/block-cell";
import type { Block } from "@/domain/entities/block";
import { BlockType, BlockStatus } from "@/domain/entities/block";
function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "b1",
    weekPlanId: "wp-1",
    dayOfWeek: 1,
    slot: 1,
    blockType: BlockType.Core,
    title: "專案開發",
    description: "",
    status: BlockStatus.Planned,
    keyResultId: null,
    projectId: null,
    ...overrides,
  };
}

describe("BlockCell", () => {
  it("renders block title and type color", () => {
    render(
      <DndContext>
        <BlockCell
          block={{
            id: "b1",
            weekPlanId: "wp-1",
            dayOfWeek: 1,
            slot: 1,
            blockType: BlockType.Core,
            title: "專案開發",
            description: "",
            status: BlockStatus.Planned,
            keyResultId: null,
            projectId: null,
          }}
          dayOfWeek={1}
          slot={1}
          onClick={() => {}}
        />
      </DndContext>,
    );
    expect(screen.getByText("專案開發")).toBeInTheDocument();
  });

  it("renders empty cell when no block", () => {
    render(
      <DndContext>
        <BlockCell block={null} dayOfWeek={1} slot={1} onClick={() => {}} />
      </DndContext>,
    );
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <DndContext>
        <BlockCell
          block={null}
          dayOfWeek={1}
          slot={1}
          onClick={() => {
            clicked = true;
          }}
        />
      </DndContext>,
    );
    await user.click(screen.getByText("+"));
    expect(clicked).toBe(true);
  });

  it("shows completion indicator for completed blocks", () => {
    render(
      <DndContext>
        <BlockCell
          block={{
            id: "b1",
            weekPlanId: "wp-1",
            dayOfWeek: 1,
            slot: 1,
            blockType: BlockType.Core,
            title: "Done",
            description: "",
            status: BlockStatus.Completed,
            keyResultId: null,
            projectId: null,
          }}
          dayOfWeek={1}
          slot={1}
          onClick={() => {}}
        />
      </DndContext>,
    );
    expect(screen.getByText("\u2713")).toBeInTheDocument();
  });
  it("renders a placeholder for a block with no title yet", () => {
    render(
      <DndContext>
        <BlockCell
          block={makeBlock({ title: "" })}
          dayOfWeek={1}
          slot={1}
          onClick={() => {}}
        />
      </DndContext>,
    );
    expect(screen.getByText("未命名")).toBeInTheDocument();
  });

  it("toggles completion without opening the panel", async () => {
    const user = userEvent.setup();
    let toggled = 0;
    let opened = 0;
    render(
      <DndContext>
        <BlockCell
          block={makeBlock({ status: BlockStatus.Planned })}
          dayOfWeek={1}
          slot={1}
          onClick={() => {
            opened += 1;
          }}
          onToggleComplete={() => {
            toggled += 1;
          }}
        />
      </DndContext>,
    );
    await user.click(screen.getByRole("button", { name: "標記完成" }));
    expect(toggled).toBe(1);
    expect(opened).toBe(0);
  });

  it("offers to undo completion on a completed block", async () => {
    const user = userEvent.setup();
    let toggled = 0;
    render(
      <DndContext>
        <BlockCell
          block={makeBlock({ status: BlockStatus.Completed })}
          dayOfWeek={1}
          slot={1}
          onClick={() => {}}
          onToggleComplete={() => {
            toggled += 1;
          }}
        />
      </DndContext>,
    );
    await user.click(screen.getByRole("button", { name: "取消完成" }));
    expect(toggled).toBe(1);
  });

  it("disables the toggle when no handler is supplied", () => {
    render(
      <DndContext>
        <BlockCell
          block={makeBlock({})}
          dayOfWeek={1}
          slot={1}
          onClick={() => {}}
        />
      </DndContext>,
    );
    expect(screen.getByRole("button", { name: "標記完成" })).toBeDisabled();
  });
});
