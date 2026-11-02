import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

vi.mock("@/presentation/providers/app-state-provider", () => ({
  useAppState: () => ({ taskTitleSuggestions: [] }),
}));

import { SidePanel } from "@/presentation/components/side-panel/side-panel";
import { BlockType, BlockStatus } from "@/domain/entities/block";

type SidePanelProps = ComponentProps<typeof SidePanel>;

function makeProps(overrides: Partial<SidePanelProps> = {}): SidePanelProps {
  const noop = () => {};
  return {
    dayOfWeek: 1,
    slot: 1,
    block: null,
    diaryLines: null,
    diaryMode: "hidden",
    subtasks: [],
    elapsedSeconds: 0,
    isTimerActive: false,
    otherBlockIsActive: false,
    onSaveBlock: noop,
    onStatusChange: noop,
    onSaveDiary: noop,
    onAddSubtask: noop,
    onEditSubtask: noop,
    onToggleSubtask: noop,
    onDeleteSubtask: noop,
    onReorderSubtasks: noop,
    onStartTimer: noop,
    onStopTimer: noop,
    onAddManualTimer: noop,
    onClearTimer: noop,
    onClose: noop,
    onDeleteBlock: noop,
    keyResultOptions: [],
    onLinkBlockKeyResult: noop,
    projectOptions: [],
    onLinkBlockProject: noop,
    ...overrides,
  };
}

describe("SidePanel diary rendering", () => {
  it('renders DiaryForm when diaryMode is "editable"', () => {
    render(<SidePanel {...makeProps({ diaryMode: "editable" })} />);
    // DiaryForm-specific placeholders are present
    expect(screen.getByPlaceholderText(/Bad — /)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Good — /)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Next — /)).toBeInTheDocument();
    // DiaryReadOnlyView values are absent (no diaryLines supplied)
    expect(screen.queryByText("分心")).toBeNull();
  });

  it('renders DiaryReadOnlyView when diaryMode is "readonly" and diaryLines exist', () => {
    render(
      <SidePanel
        {...makeProps({
          diaryMode: "readonly",
          diaryLines: { bad: "分心", good: "完成", next: "調整" },
        })}
      />,
    );
    // DiaryReadOnlyView values are present
    expect(screen.getByText("分心")).toBeInTheDocument();
    expect(screen.getByText("完成")).toBeInTheDocument();
    expect(screen.getByText("調整")).toBeInTheDocument();
    // DiaryForm placeholders are absent
    expect(screen.queryByPlaceholderText(/Bad — /)).toBeNull();
  });

  it('renders neither form nor read-only view when diaryMode is "readonly" and diaryLines is null', () => {
    render(
      <SidePanel {...makeProps({ diaryMode: "readonly", diaryLines: null })} />,
    );
    // Neither DiaryForm nor DiaryReadOnlyView is rendered
    expect(screen.queryByPlaceholderText(/Bad — /)).toBeNull();
    expect(screen.queryByText("分心")).toBeNull();
  });

  it('renders neither when diaryMode is "hidden"', () => {
    render(
      <SidePanel
        {...makeProps({
          diaryMode: "hidden",
          diaryLines: { bad: "分心", good: "完成", next: "調整" },
        })}
      />,
    );
    // DiaryForm placeholders are absent
    expect(screen.queryByPlaceholderText(/Bad — /)).toBeNull();
    // DiaryReadOnlyView values are absent despite diaryLines being provided
    expect(screen.queryByText("分心")).toBeNull();
  });
});

describe("SidePanel block deletion", () => {
  const block = {
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
    suppressed: false,
  };

  it("offers no delete control when the slot is still empty", () => {
    render(<SidePanel {...makeProps({ block: null })} />);
    expect(screen.queryByRole("button", { name: "刪除區塊" })).toBeNull();
  });

  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    let deleted = 0;
    render(
      <SidePanel
        {...makeProps({ block, onDeleteBlock: () => (deleted += 1) })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "刪除區塊" }));
    expect(deleted).toBe(0);

    await user.click(screen.getByRole("button", { name: "確認刪除" }));
    expect(deleted).toBe(1);
  });

  it("lets the user back out of the confirmation", async () => {
    const user = userEvent.setup();
    let deleted = 0;
    render(
      <SidePanel
        {...makeProps({ block, onDeleteBlock: () => (deleted += 1) })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "刪除區塊" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(deleted).toBe(0);
    expect(
      screen.getByRole("button", { name: "刪除區塊" }),
    ).toBeInTheDocument();
  });
});
