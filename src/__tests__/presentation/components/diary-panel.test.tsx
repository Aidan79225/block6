import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DiaryPanel,
  type DiaryDay,
} from "@/presentation/components/side-panel/diary-panel";

const days: DiaryDay[] = [
  { dateKey: "2026-10-18", label: "週日 10/18", mode: "readonly" },
  { dateKey: "2026-10-20", label: "週二 10/20", mode: "editable" },
  { dateKey: "2026-10-22", label: "週四 10/22", mode: "hidden" },
];

function renderPanel(
  selectedDateKey: string | null,
  lines: { bad: string; good: string; next: string } | null = null,
) {
  const onSelectDay = vi.fn();
  const onSave = vi.fn();
  render(
    <DiaryPanel
      days={days}
      selectedDateKey={selectedDateKey}
      onSelectDay={onSelectDay}
      lines={lines}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  return { onSelectDay, onSave };
}

describe("DiaryPanel", () => {
  it("lets a writable day be written", () => {
    renderPanel("2026-10-20");
    expect(screen.getByPlaceholderText(/Bad — /)).toBeInTheDocument();
  });

  it("shows a past day's entry read-only", () => {
    renderPanel("2026-10-18", { bad: "累", good: "有跑步", next: "早睡" });
    expect(screen.queryByPlaceholderText(/Bad — /)).toBeNull();
    expect(screen.getByText("有跑步")).toBeInTheDocument();
  });

  it("says so when a past day has no entry", () => {
    renderPanel("2026-10-18");
    expect(screen.getByText("這天沒有寫日記。")).toBeInTheDocument();
  });

  it("has nothing to write for a day still ahead", () => {
    renderPanel("2026-10-22");
    expect(screen.queryByPlaceholderText(/Bad — /)).toBeNull();
    expect(screen.getByText("這天還沒到。")).toBeInTheDocument();
  });

  it("switches days, but not to days still ahead", async () => {
    const user = userEvent.setup();
    const { onSelectDay } = renderPanel("2026-10-20");

    await user.click(screen.getByRole("button", { name: "週日 10/18" }));
    expect(onSelectDay).toHaveBeenCalledWith("2026-10-18");
    expect(screen.getByRole("button", { name: "週四 10/22" })).toBeDisabled();
  });
});
