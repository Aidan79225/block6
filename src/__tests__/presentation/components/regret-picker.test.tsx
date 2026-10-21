import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegretPicker } from "@/presentation/components/review/regret-picker";
import { BlockStatus, BlockType, createBlock } from "@/domain/entities/block";

function block(id: string, dayOfWeek: number, slot: number, regretted = false) {
  return createBlock({
    id,
    weekPlanId: "wp-1",
    dayOfWeek,
    slot,
    blockType: BlockType.General,
    title: `會議${id}`,
    description: "",
    status: BlockStatus.Completed,
    regretted,
  });
}

function renderPicker(
  blocks = [block("a", 1, 1), block("b", 3, 2, true)],
  rhythmSlotCount = 0,
) {
  const onToggle = vi.fn();
  const onRemoveFromRhythm = vi.fn();
  render(
    <RegretPicker
      blocks={blocks}
      onToggle={onToggle}
      rhythmSlotCount={rhythmSlotCount}
      onRemoveFromRhythm={onRemoveFromRhythm}
    />,
  );
  return { onToggle, onRemoveFromRhythm };
}

describe("RegretPicker", () => {
  it("asks which blocks were not worth it", () => {
    renderPicker([]);
    expect(screen.getByText("哪幾格不值得？")).toBeInTheDocument();
  });

  it("counts regretted blocks in blocks and hours", () => {
    renderPicker();
    expect(screen.getByText(/1 格不值得（約 2 小時）/)).toBeInTheDocument();
  });

  it("toggles the mark on a block", async () => {
    const user = userEvent.setup();
    const { onToggle } = renderPicker();

    await user.click(
      screen.getByRole("button", { name: "週一第 1 格：會議a" }),
    );
    await user.click(
      screen.getByRole("button", { name: "週三第 2 格：會議b" }),
    );

    expect(onToggle).toHaveBeenNthCalledWith(1, "a", true);
    expect(onToggle).toHaveBeenNthCalledWith(2, "b", false);
  });

  it("shows which blocks are marked", () => {
    renderPicker();
    expect(
      screen.getByRole("button", { name: "週三第 2 格：會議b" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("offers to drop rhythm slots only when the rhythm would bring them back", async () => {
    const user = userEvent.setup();
    const { onRemoveFromRhythm } = renderPicker(undefined, 1);

    await user.click(
      screen.getByRole("button", { name: "下週起從常駐節奏拿掉這 1 格" }),
    );
    expect(onRemoveFromRhythm).toHaveBeenCalledOnce();
  });

  it("hides the rhythm action when nothing would come back", () => {
    renderPicker(undefined, 0);
    expect(screen.queryByRole("button", { name: /常駐節奏/ })).toBeNull();
  });
});
