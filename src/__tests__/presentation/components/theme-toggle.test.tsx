import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/presentation/components/header/theme-toggle";

describe("ThemeToggle", () => {
  it("renders a toggle button", () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    let called = false;
    render(<ThemeToggle theme="dark" onToggle={() => { called = true; }} />);
    await user.click(screen.getByRole("button", { name: /theme/i }));
    expect(called).toBe(true);
  });
});
