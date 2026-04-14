import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiaryForm } from "@/presentation/components/side-panel/diary-form";

describe("DiaryForm", () => {
  it("renders 3 input fields with Bad, Good, Next labels in order", () => {
    render(<DiaryForm bad="" good="" next="" onSave={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(3);
    const textContent = document.body.textContent ?? "";
    const badIdx = textContent.indexOf("Bad");
    const goodIdx = textContent.indexOf("Good");
    const nextIdx = textContent.indexOf("Next");
    expect(badIdx).toBeGreaterThan(-1);
    expect(goodIdx).toBeGreaterThan(badIdx);
    expect(nextIdx).toBeGreaterThan(goodIdx);
  });

  it("calls onSave with bad, good, next values", async () => {
    const user = userEvent.setup();
    let saved: { bad: string; good: string; next: string } | null = null;
    render(
      <DiaryForm
        bad=""
        good=""
        next=""
        onSave={(bad, good, next) => {
          saved = { bad, good, next };
        }}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "分心了");
    await user.type(inputs[1], "完成專案");
    await user.type(inputs[2], "明天早點");
    await user.click(screen.getByRole("button", { name: /save|儲存/i }));

    expect(saved).toEqual({
      bad: "分心了",
      good: "完成專案",
      next: "明天早點",
    });
  });
});
