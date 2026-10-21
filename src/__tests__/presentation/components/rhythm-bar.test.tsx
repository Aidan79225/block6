import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RhythmBar } from "@/presentation/components/dashboard/rhythm-bar";

function renderBar(overrides: Partial<Parameters<typeof RhythmBar>[0]> = {}) {
  const props = {
    rhythmSlotCount: 0,
    weekBlockCount: 42,
    isBusy: false,
    onSetFromWeek: () => {},
    onClear: () => {},
    ...overrides,
  };
  render(<RhythmBar {...props} />);
}

describe("RhythmBar", () => {
  it("invites the user to adopt a rhythm when none is set", () => {
    renderBar();
    expect(
      screen.getByRole("button", { name: "把這週設為節奏" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "清除" })).toBeNull();
  });

  it("reports how many slots the rhythm covers", () => {
    renderBar({ rhythmSlotCount: 32 });
    expect(screen.getByText(/常駐節奏 32 格/)).toBeInTheDocument();
  });

  it("offers to update an existing rhythm rather than create one", () => {
    renderBar({ rhythmSlotCount: 32 });
    expect(
      screen.getByRole("button", { name: "更新為這週" }),
    ).toBeInTheDocument();
  });

  it("cannot adopt a week with no blocks", () => {
    renderBar({ weekBlockCount: 0 });
    expect(
      screen.getByRole("button", { name: "把這週設為節奏" }),
    ).toBeDisabled();
  });

  it("calls onSetFromWeek when adopting the week", async () => {
    const user = userEvent.setup();
    let called = 0;
    renderBar({ onSetFromWeek: () => (called += 1) });
    await user.click(screen.getByRole("button", { name: "把這週設為節奏" }));
    expect(called).toBe(1);
  });

  it("asks for confirmation before clearing the rhythm", async () => {
    const user = userEvent.setup();
    let cleared = 0;
    renderBar({ rhythmSlotCount: 32, onClear: () => (cleared += 1) });

    await user.click(screen.getByRole("button", { name: "清除" }));
    expect(cleared).toBe(0);

    await user.click(screen.getByRole("button", { name: "確認清除" }));
    expect(cleared).toBe(1);
  });

  it("lets the user back out of clearing", async () => {
    const user = userEvent.setup();
    let cleared = 0;
    renderBar({ rhythmSlotCount: 32, onClear: () => (cleared += 1) });

    await user.click(screen.getByRole("button", { name: "清除" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(cleared).toBe(0);
    expect(screen.getByRole("button", { name: "清除" })).toBeInTheDocument();
  });

  it("disables its actions while busy", () => {
    renderBar({ rhythmSlotCount: 32, isBusy: true });
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("offers to add slots that stayed the same for weeks", async () => {
    const user = userEvent.setup();
    const onAcceptSuggestion = vi.fn();
    const onDismissSuggestion = vi.fn();
    renderBar({ suggestionCount: 10, onAcceptSuggestion, onDismissSuggestion });

    expect(
      screen.getByText("最近 3 週有 10 格每週都一樣 — 設成常駐節奏？"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "加入節奏" }));
    await user.click(screen.getByRole("button", { name: "不用" }));
    expect(onAcceptSuggestion).toHaveBeenCalledOnce();
    expect(onDismissSuggestion).toHaveBeenCalledOnce();
  });

  it("says nothing when there is nothing to suggest", () => {
    renderBar();
    expect(screen.queryByRole("button", { name: "加入節奏" })).toBeNull();
  });
});
