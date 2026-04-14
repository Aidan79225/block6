import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyLastWeekBanner } from "@/presentation/components/dashboard/copy-last-week-banner";

describe("CopyLastWeekBanner", () => {
  it("shows the empty-cell count in the message", () => {
    render(
      <CopyLastWeekBanner
        emptyCellCount={27}
        isCopying={false}
        onCopy={() => {}}
      />,
    );
    expect(screen.getByText(/27 格/)).toBeInTheDocument();
  });

  it("calls onCopy when button clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <CopyLastWeekBanner
        emptyCellCount={10}
        isCopying={false}
        onCopy={() => {
          clicked = true;
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /複製/ }));
    expect(clicked).toBe(true);
  });

  it("disables the button while copying", () => {
    render(
      <CopyLastWeekBanner
        emptyCellCount={10}
        isCopying={true}
        onCopy={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /複製/ })).toBeDisabled();
  });
});
