import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockCell } from "@/presentation/components/week-grid/block-cell";
import { BlockType, BlockStatus } from "@/domain/entities/block";

describe("BlockCell", () => {
  it("renders block title and type color", () => {
    render(
      <BlockCell
        block={{ id: "b1", weekPlanId: "wp-1", dayOfWeek: 1, slot: 1, blockType: BlockType.Core, title: "專案開發", description: "", status: BlockStatus.Planned }}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("專案開發")).toBeInTheDocument();
  });

  it("renders empty cell when no block", () => {
    render(<BlockCell block={null} onClick={() => {}} />);
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(<BlockCell block={null} onClick={() => { clicked = true; }} />);
    await user.click(screen.getByText("+"));
    expect(clicked).toBe(true);
  });

  it("shows completion indicator for completed blocks", () => {
    render(
      <BlockCell
        block={{ id: "b1", weekPlanId: "wp-1", dayOfWeek: 1, slot: 1, blockType: BlockType.Core, title: "Done", description: "", status: BlockStatus.Completed }}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("\u2713")).toBeInTheDocument();
  });
});
