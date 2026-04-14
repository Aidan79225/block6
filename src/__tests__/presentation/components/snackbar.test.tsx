import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Snackbar } from "@/presentation/components/notifications/snackbar";

describe("Snackbar", () => {
  it("renders the message", () => {
    render(
      <Snackbar
        id="1"
        message="Saved successfully"
        type="success"
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    let closed = false;
    render(
      <Snackbar
        id="1"
        message="Error happened"
        type="error"
        onClose={() => {
          closed = true;
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(closed).toBe(true);
  });

  it("applies error styling for error type", () => {
    render(
      <Snackbar
        id="1"
        message="Error happened"
        type="error"
        onClose={() => {}}
      />,
    );
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("data-type", "error");
  });
});
