import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockTimer } from "@/presentation/components/side-panel/block-timer";

describe("BlockTimer", () => {
  it("formats elapsed seconds as HH:MM:SS", () => {
    render(
      <BlockTimer
        elapsedSeconds={3661}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("01:01:01")).toBeInTheDocument();
  });

  it("shows start button when not active", () => {
    render(
      <BlockTimer
        elapsedSeconds={0}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
        onClear={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /開始計時/ }),
    ).toBeInTheDocument();
  });

  it("shows stop button when active", () => {
    render(
      <BlockTimer
        elapsedSeconds={60}
        isActive={true}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
        onClear={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /停止計時/ }),
    ).toBeInTheDocument();
  });

  it("calls onStart when start clicked (no other active)", async () => {
    const user = userEvent.setup();
    let started = false;
    render(
      <BlockTimer
        elapsedSeconds={0}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {
          started = true;
        }}
        onStop={() => {}}
        onAddManual={() => {}}
        onClear={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /開始計時/ }));
    expect(started).toBe(true);
  });

  it("opens manual entry form", async () => {
    const user = userEvent.setup();
    render(
      <BlockTimer
        elapsedSeconds={0}
        isActive={false}
        otherBlockIsActive={false}
        onStart={() => {}}
        onStop={() => {}}
        onAddManual={() => {}}
        onClear={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /手動新增/ }));
    expect(screen.getByLabelText(/開始時間/)).toBeInTheDocument();
    expect(screen.getByLabelText(/結束時間/)).toBeInTheDocument();
  });
});
