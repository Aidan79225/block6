import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanChangesLog } from "@/presentation/components/review/plan-changes-log";
import type { PlanChange } from "@/domain/entities/plan-change";

const deletion: PlanChange = {
  id: "c1",
  userId: "u1",
  weekKey: "2026-09-07",
  dayOfWeek: 3,
  slot: 2,
  blockTitleSnapshot: "健身",
  action: "delete",
  reason: "臨時加班",
  createdAt: new Date(2026, 8, 9, 9, 30).toISOString(),
};

describe("PlanChangesLog", () => {
  it("labels a deleted block as a deletion", () => {
    render(<PlanChangesLog changes={[deletion]} />);
    expect(screen.getByText("刪除")).toBeInTheDocument();
    expect(screen.getByText(/健身/)).toBeInTheDocument();
  });
});
