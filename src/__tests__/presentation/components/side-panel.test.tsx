import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

vi.mock("@/presentation/providers/app-state-provider", () => ({
  useAppState: () => ({ taskTitleSuggestions: [] }),
}));

import { SidePanel } from "@/presentation/components/side-panel/side-panel";

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
    ...overrides,
  };
}

describe("SidePanel diary rendering", () => {
  it('renders DiaryForm when diaryMode is "editable"', () => {
    render(<SidePanel {...makeProps({ diaryMode: "editable" })} />);
    expect(screen.getByRole("button", { name: /儲存/ })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
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
    expect(screen.getByText("分心")).toBeInTheDocument();
    expect(screen.getByText("完成")).toBeInTheDocument();
    expect(screen.getByText("調整")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /儲存/ })).toBeNull();
  });

  it('renders neither form nor read-only view when diaryMode is "readonly" and diaryLines is null', () => {
    render(
      <SidePanel
        {...makeProps({ diaryMode: "readonly", diaryLines: null })}
      />,
    );
    expect(screen.queryByText("情緒日記")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it('renders neither when diaryMode is "hidden"', () => {
    render(
      <SidePanel
        {...makeProps({
          diaryMode: "hidden",
          diaryLines: { bad: "x", good: "y", next: "z" },
        })}
      />,
    );
    expect(screen.queryByText("情緒日記")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
