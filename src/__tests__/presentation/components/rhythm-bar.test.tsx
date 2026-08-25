import { describe, it, expect } from "vitest";
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
});
