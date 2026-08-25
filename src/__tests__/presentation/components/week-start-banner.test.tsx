import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekStartBanner } from "@/presentation/components/dashboard/week-start-banner";

function renderBanner(
  overrides: Partial<Parameters<typeof WeekStartBanner>[0]> = {},
) {
  const props = {
    emptyCellCount: 27,
    isCopying: false,
    isApplyingTemplate: false,
    onCopy: () => {},
    onApplyTemplate: () => {},
    ...overrides,
  };
  render(<WeekStartBanner {...props} />);
}

describe("WeekStartBanner", () => {
  it("shows the empty-cell count in the message", () => {
    renderBanner();
    expect(screen.getByText(/27 格/)).toBeInTheDocument();
  });

  it("calls onCopy when the copy button is clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    renderBanner({ onCopy: () => (clicked = true) });
    await user.click(screen.getByRole("button", { name: /複製/ }));
    expect(clicked).toBe(true);
  });

  it("calls onApplyTemplate when the template button is clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    renderBanner({ onApplyTemplate: () => (clicked = true) });
    await user.click(screen.getByRole("button", { name: /預設節奏/ }));
    expect(clicked).toBe(true);
  });

  it("disables both actions while an action is running", () => {
    renderBanner({ isCopying: true });
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("disables both actions while the template is being applied", () => {
    renderBanner({ isApplyingTemplate: true });
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
