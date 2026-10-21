import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RangeNamingPanel } from "@/presentation/components/side-panel/range-naming-panel";
import { BlockType } from "@/domain/entities/block";

function renderPanel(onApply = vi.fn(), onClose = vi.fn()) {
  render(
    <RangeNamingPanel
      slotCount={15}
      titleSuggestions={[]}
      onApply={onApply}
      onClose={onClose}
    />,
  );
  return { onApply, onClose };
}

describe("RangeNamingPanel", () => {
  it("says how many slots it will name", () => {
    renderPanel();
    expect(screen.getByText("一次命名 15 格")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "套用到 15 格" }),
    ).toBeInTheDocument();
  });

  it("applies one title and type to the whole range", async () => {
    const user = userEvent.setup();
    const { onApply } = renderPanel();

    await user.click(screen.getByRole("button", { name: "休息" }));
    await user.type(screen.getByPlaceholderText("任務名稱"), "  午休 ");
    await user.click(screen.getByRole("button", { name: "套用到 15 格" }));

    expect(onApply).toHaveBeenCalledWith("午休", BlockType.Rest);
  });

  it("defaults to core when no type is picked", async () => {
    const user = userEvent.setup();
    const { onApply } = renderPanel();

    await user.type(screen.getByPlaceholderText("任務名稱"), "上班");
    await user.click(screen.getByRole("button", { name: "套用到 15 格" }));

    expect(onApply).toHaveBeenCalledWith("上班", BlockType.Core);
  });

  it("closes without applying", async () => {
    const user = userEvent.setup();
    const { onApply, onClose } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Close panel" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
  });
});
