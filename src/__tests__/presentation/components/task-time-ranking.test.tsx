import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskTimeRanking } from "@/presentation/components/review/task-time-ranking";

describe("TaskTimeRanking", () => {
  it("renders 'no records' when items is empty", () => {
    render(<TaskTimeRanking items={[]} />);
    expect(screen.getByText(/本週尚無計時紀錄/)).toBeInTheDocument();
  });

  it("renders items with formatted durations", () => {
    render(
      <TaskTimeRanking
        items={[
          { title: "專案開發", totalSeconds: 3 * 3600 + 15 * 60 },
          { title: "閱讀", totalSeconds: 45 * 60 },
        ]}
      />,
    );
    expect(screen.getByText("專案開發")).toBeInTheDocument();
    expect(screen.getByText("閱讀")).toBeInTheDocument();
    expect(screen.getByText("3h 15m")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
  });
});
