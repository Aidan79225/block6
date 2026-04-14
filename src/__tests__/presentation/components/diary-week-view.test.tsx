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

  it("renders diary lines for filled entries", () => {
    render(
      <DiaryWeekView
        entries={[
          {
            dayOfWeek: 1,
            line1: "今天很專注",
            line2: "完成 API",
            line3: "明天加油",
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
    expect(screen.getByText("今天很專注")).toBeInTheDocument();
    expect(screen.getByText("完成 API")).toBeInTheDocument();
    expect(screen.getByText("明天加油")).toBeInTheDocument();
  });
});
