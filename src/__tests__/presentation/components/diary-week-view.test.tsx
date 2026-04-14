import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiaryWeekView } from "@/presentation/components/review/diary-week-view";

describe("DiaryWeekView", () => {
  it("renders 7 day cells", () => {
    render(<DiaryWeekView entries={new Array(7).fill(null)} />);
    expect(screen.getByText("週一")).toBeInTheDocument();
    expect(screen.getByText("週二")).toBeInTheDocument();
    expect(screen.getByText("週日")).toBeInTheDocument();
  });

  it("renders diary content for filled entries with Bad/Good/Next labels", () => {
    render(
      <DiaryWeekView
        entries={[
          {
            dayOfWeek: 1,
            bad: "分心了",
            good: "完成 API",
            next: "明天早點",
          },
          null,
          null,
          null,
          null,
          null,
          null,
        ]}
      />,
    );
    expect(screen.getByText("分心了")).toBeInTheDocument();
    expect(screen.getByText("完成 API")).toBeInTheDocument();
    expect(screen.getByText("明天早點")).toBeInTheDocument();
  });
});
