import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusToggle } from "@/presentation/components/side-panel/status-toggle";
import { BlockStatus } from "@/domain/entities/block";

describe("StatusToggle", () => {
  it("renders all status options", () => {
    render(<StatusToggle status={BlockStatus.Planned} onChange={() => {}} />);
    expect(screen.getByText("planned")).toBeInTheDocument();
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("skipped")).toBeInTheDocument();
  });

  it("highlights current status", () => {
    render(<StatusToggle status={BlockStatus.Completed} onChange={() => {}} />);
    const completedButton = screen.getByText("completed");
    expect(completedButton).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange when a status is clicked", async () => {
    const user = userEvent.setup();
    let newStatus: BlockStatus | null = null;
    render(
      <StatusToggle
        status={BlockStatus.Planned}
        onChange={(s) => {
          newStatus = s;
        }}
      />,
    );
    await user.click(screen.getByText("completed"));
    expect(newStatus).toBe(BlockStatus.Completed);
  });
});
