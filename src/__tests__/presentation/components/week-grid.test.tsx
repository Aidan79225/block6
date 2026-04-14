import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekGrid } from "@/presentation/components/week-grid/week-grid";

describe("WeekGrid", () => {
  it("renders 7 day columns with labels", () => {
    render(<WeekGrid blocks={[]} onBlockClick={() => {}} onSwapBlocks={() => {}} onMoveBlock={() => {}} />);
    expect(screen.getByText("一")).toBeInTheDocument();
    expect(screen.getByText("二")).toBeInTheDocument();
    expect(screen.getByText("三")).toBeInTheDocument();
    expect(screen.getByText("四")).toBeInTheDocument();
    expect(screen.getByText("五")).toBeInTheDocument();
    expect(screen.getByText("六")).toBeInTheDocument();
    expect(screen.getByText("日")).toBeInTheDocument();
  });

  it("renders 42 cells (7 days x 6 slots)", () => {
    render(<WeekGrid blocks={[]} onBlockClick={() => {}} onSwapBlocks={() => {}} onMoveBlock={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(42);
  });
});
