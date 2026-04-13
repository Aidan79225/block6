import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryForm } from "@/presentation/components/side-panel/diary-form";

describe("DiaryForm", () => {
  it("renders 3 input fields", () => {
    render(<DiaryForm line1="" line2="" line3="" onSave={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(3);
  });

  it("calls onSave with all 3 lines", async () => {
    const user = userEvent.setup();
    let saved: { line1: string; line2: string; line3: string } | null = null;
    render(<DiaryForm line1="" line2="" line3="" onSave={(l1, l2, l3) => { saved = { line1: l1, line2: l2, line3: l3 }; }} />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "今天很專注");
    await user.type(inputs[1], "完成度很高");
    await user.type(inputs[2], "明天繼續加油");
    await user.click(screen.getByRole("button", { name: /save|儲存/i }));
    expect(saved).toEqual({ line1: "今天很專注", line2: "完成度很高", line3: "明天繼續加油" });
  });
});
