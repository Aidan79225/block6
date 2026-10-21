import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrajectoryChart } from "@/presentation/components/direction/trajectory-chart";
import { YearStrip } from "@/presentation/components/direction/year-strip";
import { FocusPicker } from "@/presentation/components/review/focus-picker";
import { FocusBanner } from "@/presentation/components/dashboard/focus-banner";
import { createDirection } from "@/domain/entities/direction";

const book = createDirection({
  id: "book",
  userId: "u1",
  position: 0,
  text: "寫一本書",
  titles: ["寫作"],
});
const body = createDirection({
  id: "body",
  userId: "u1",
  position: 1,
  text: "身體",
  titles: ["健身"],
});

describe("TrajectoryChart", () => {
  it("describes each week's split, untagged blocks included", () => {
    render(
      <TrajectoryChart
        directions={[book]}
        weeks={[
          { weekKey: "2026-10-12", byDirection: { book: 12 }, untagged: 20 },
          { weekKey: "2026-10-19", byDirection: { book: 2 }, untagged: 30 },
        ]}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "10/19 那週：寫一本書 2 格、未標 30 格",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("未標")).toBeInTheDocument();
  });
});

describe("YearStrip", () => {
  it("counts the weeks left in the year", () => {
    render(
      <YearStrip
        weekKeys={["2026-12-14", "2026-12-21", "2026-12-28"]}
        currentWeekKey="2026-12-14"
        weeks={[]}
        directions={[]}
      />,
    );
    expect(screen.getByText("今年只有 3 週")).toBeInTheDocument();
    expect(screen.getByText("還剩 2 週。")).toBeInTheDocument();
  });
});

describe("FocusPicker", () => {
  it("picks, and picks again to clear, the direction to pull back", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <FocusPicker
        directions={[book, body]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: "身體" }));
    expect(onSelect).toHaveBeenLastCalledWith("body");

    rerender(
      <FocusPicker
        directions={[book, body]}
        selectedId="body"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: "身體" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "身體" }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("points to the direction page when there are no directions yet", () => {
    render(
      <FocusPicker directions={[]} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("link", { name: "方向" })).toHaveAttribute(
      "href",
      "/direction",
    );
  });
});

describe("FocusBanner", () => {
  it("compares this week's blocks with last week's", () => {
    render(<FocusBanner direction={book} count={4} previousCount={1} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "這週想把「寫一本書」拉回來：目前 4 格（上週 1 格）",
    );
  });
});
