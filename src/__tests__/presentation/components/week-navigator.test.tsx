import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekNavigator } from "@/presentation/components/header/week-navigator";

describe("WeekNavigator", () => {
  it("displays the week range", () => {
    render(
      <WeekNavigator
        weekStart={new Date("2026-04-13")}
        onPreviousWeek={() => {}}
        onNextWeek={() => {}}
      />,
    );
    expect(screen.getByText(/4\/13/)).toBeInTheDocument();
    expect(screen.getByText(/4\/19/)).toBeInTheDocument();
  });

  it("calls onPreviousWeek when left arrow clicked", async () => {
    const user = userEvent.setup();
    let called = false;
    render(
      <WeekNavigator
        weekStart={new Date("2026-04-13")}
        onPreviousWeek={() => {
          called = true;
        }}
        onNextWeek={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(called).toBe(true);
  });

  it("calls onNextWeek when right arrow clicked", async () => {
    const user = userEvent.setup();
    let called = false;
    render(
      <WeekNavigator
        weekStart={new Date("2026-04-13")}
        onPreviousWeek={() => {}}
        onNextWeek={() => {
          called = true;
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(called).toBe(true);
  });
});
