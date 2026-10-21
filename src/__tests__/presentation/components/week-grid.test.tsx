import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";

describe("WeekGrid", () => {
  it("renders 7 day columns with labels", () => {
    render(
      <WeekGrid
        blocks={[]}
        onBlockClick={() => {}}
        onSwapBlocks={() => {}}
        onMoveBlock={() => {}}
      />,
    );
    expect(screen.getByText("一")).toBeInTheDocument();
    expect(screen.getByText("二")).toBeInTheDocument();
    expect(screen.getByText("三")).toBeInTheDocument();
    expect(screen.getByText("四")).toBeInTheDocument();
    expect(screen.getByText("五")).toBeInTheDocument();
    expect(screen.getByText("六")).toBeInTheDocument();
    expect(screen.getByText("日")).toBeInTheDocument();
  });

  it("renders 42 cells (7 days x 6 slots)", () => {
    render(
      <WeekGrid
        blocks={[]}
        onBlockClick={() => {}}
        onSwapBlocks={() => {}}
        onMoveBlock={() => {}}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(42);
  });

  it("reports Shift+click so the page can select a range", async () => {
    const user = userEvent.setup();
    const onBlockClick = vi.fn();
    render(
      <WeekGrid
        blocks={[]}
        onBlockClick={onBlockClick}
        onSwapBlocks={() => {}}
        onMoveBlock={() => {}}
      />,
    );
    const cells = screen.getAllByRole("button");
    await user.click(cells[0]);
    await user.keyboard("{Shift>}");
    await user.click(cells[8]);
    await user.keyboard("{/Shift}");

    expect(onBlockClick).toHaveBeenNthCalledWith(1, 1, 1, false);
    expect(onBlockClick).toHaveBeenNthCalledWith(2, 2, 2, true);
  });

  it("selects a whole day from its header", async () => {
    const user = userEvent.setup();
    const onSelectDay = vi.fn();
    render(
      <WeekGrid
        blocks={[]}
        onBlockClick={() => {}}
        onSwapBlocks={() => {}}
        onMoveBlock={() => {}}
        onSelectDay={onSelectDay}
      />,
    );
    await user.click(screen.getByRole("button", { name: "選取週三整天" }));
    expect(onSelectDay).toHaveBeenCalledWith(3);
  });
});
