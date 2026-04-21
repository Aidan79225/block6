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

  it("disables save button when any field is empty", async () => {
    const user = userEvent.setup();

    // Test with empty bad field
    const { unmount: unmount1 } = render(
      <DiaryForm bad="" good="good" next="next" onSave={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /儲存/ })).toBeDisabled();
    unmount1();

    // Test with empty good field
    const { unmount: unmount2 } = render(
      <DiaryForm bad="bad" good="" next="next" onSave={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /儲存/ })).toBeDisabled();
    unmount2();

    // Test with whitespace-only bad field
    const { unmount: unmount3 } = render(
      <DiaryForm bad="   " good="good" next="next" onSave={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /儲存/ })).toBeDisabled();
    unmount3();

    // Test with all fields valid
    const { unmount: unmount4 } = render(
      <DiaryForm bad="bad" good="good" next="next" onSave={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /儲存/ })).not.toBeDisabled();
    unmount4();

    // Test dynamic validation: start invalid, type to make valid
    render(
      <DiaryForm bad="" good="good" next="next" onSave={() => {}} />,
    );
    const saveButton = screen.getByRole("button", { name: /儲存/ });
    expect(saveButton).toBeDisabled();

    // Now update the bad field (which is first input)
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "分心了");
    expect(saveButton).not.toBeDisabled();
  });
});
