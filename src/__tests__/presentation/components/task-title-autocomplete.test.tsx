import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskTitleAutocomplete } from "@/presentation/components/side-panel/task-title-autocomplete";

const SUGGESTIONS = [
  { title: "閱讀", count: 5 },
  { title: "閱讀論文", count: 2 },
  { title: "運動", count: 3 },
];

describe("TaskTitleAutocomplete", () => {
  it("does not show dropdown initially", () => {
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText("閱讀")).not.toBeInTheDocument();
  });

  it("shows full dropdown on focus", async () => {
    const user = userEvent.setup();
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole("textbox"));
    expect(screen.getByText("閱讀")).toBeInTheDocument();
    expect(screen.getByText("運動")).toBeInTheDocument();
    expect(screen.getByText("閱讀論文")).toBeInTheDocument();
  });

  it("filters dropdown by case-insensitive includes", async () => {
    const user = userEvent.setup();
    let currentValue = "";
    const { rerender } = render(
      <TaskTitleAutocomplete
        value={currentValue}
        suggestions={SUGGESTIONS}
        onChange={(v) => {
          currentValue = v;
        }}
      />,
    );
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.type(input, "閱");

    rerender(
      <TaskTitleAutocomplete
        value={currentValue}
        suggestions={SUGGESTIONS}
        onChange={(v) => {
          currentValue = v;
        }}
      />,
    );

    expect(screen.getByText("閱讀")).toBeInTheDocument();
    expect(screen.getByText("閱讀論文")).toBeInTheDocument();
    expect(screen.queryByText("運動")).not.toBeInTheDocument();
  });

  it("calls onChange with clicked suggestion title", async () => {
    const user = userEvent.setup();
    let picked: string | null = null;
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={(v) => {
          picked = v;
        }}
      />,
    );
    await user.click(screen.getByRole("textbox"));
    await user.click(screen.getByText("運動"));
    expect(picked).toBe("運動");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    const input = screen.getByRole("textbox");
    await user.click(input);
    expect(screen.getByText("閱讀")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("閱讀")).not.toBeInTheDocument();
  });

  it("shows count next to each suggestion", async () => {
    const user = userEvent.setup();
    render(
      <TaskTitleAutocomplete
        value=""
        suggestions={SUGGESTIONS}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole("textbox"));
    expect(screen.getByText("×5")).toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
  });
});
