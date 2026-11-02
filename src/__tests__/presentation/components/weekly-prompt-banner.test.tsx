import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklyPromptBanner } from "@/presentation/components/dashboard/weekly-prompt-banner";

function renderBanner(canRemind: boolean, remindEnabled: boolean) {
  const onDismiss = vi.fn();
  const onEnableReminder = vi.fn();
  render(
    <WeeklyPromptBanner
      canRemind={canRemind}
      remindEnabled={remindEnabled}
      onDismiss={onDismiss}
      onEnableReminder={onEnableReminder}
    />,
  );
  return { onDismiss, onEnableReminder };
}

describe("WeeklyPromptBanner", () => {
  it("asks what is different this week, not to plan", () => {
    renderBanner(false, false);
    expect(screen.getByText("這週有什麼不一樣嗎？")).toBeInTheDocument();
  });

  it("offers the Monday reminder where notifications work", async () => {
    const user = userEvent.setup();
    const { onEnableReminder, onDismiss } = renderBanner(true, false);

    await user.click(screen.getByRole("button", { name: "每週一提醒我" }));
    await user.click(screen.getByRole("button", { name: "知道了" }));

    expect(onEnableReminder).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("stops offering the reminder once it is on, or where it cannot work", () => {
    renderBanner(true, true);
    expect(screen.queryByRole("button", { name: "每週一提醒我" })).toBeNull();
  });
});
