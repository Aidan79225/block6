import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiaryReadOnlyView } from "@/presentation/components/side-panel/diary-readonly-view";

describe("DiaryReadOnlyView", () => {
  it("renders bad, good, next values as plain text", () => {
    render(<DiaryReadOnlyView bad="分心了" good="完成專案" next="明天早點" />);
    expect(screen.getByText("分心了")).toBeInTheDocument();
    expect(screen.getByText("完成專案")).toBeInTheDocument();
    expect(screen.getByText("明天早點")).toBeInTheDocument();
  });

  it("renders em-dash placeholder for empty fields", () => {
    render(<DiaryReadOnlyView bad="" good="完成專案" next="" />);
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(2);
  });

  it("renders the 情緒日記 heading and Bad/Good/Next sub-labels in order", () => {
    render(<DiaryReadOnlyView bad="a" good="b" next="c" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("情緒日記");
    const badIdx = text.indexOf("Bad");
    const goodIdx = text.indexOf("Good");
    const nextIdx = text.indexOf("Next");
    expect(badIdx).toBeGreaterThan(-1);
    expect(goodIdx).toBeGreaterThan(badIdx);
    expect(nextIdx).toBeGreaterThan(goodIdx);
  });

  it("renders no input fields and no buttons", () => {
    render(<DiaryReadOnlyView bad="a" good="b" next="c" />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
