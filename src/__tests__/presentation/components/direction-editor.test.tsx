import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DirectionEditor } from "@/presentation/components/direction/direction-editor";
import { createDirection } from "@/domain/entities/direction";

const book = createDirection({
  id: "book",
  userId: "u1",
  position: 0,
  text: "寫一本書",
  titles: ["寫作"],
});

function renderEditor(onSave = vi.fn()) {
  render(
    <DirectionEditor
      directions={[book]}
      titles={["寫作", "健身", "上班"]}
      onSave={onSave}
      isSaving={false}
    />,
  );
  return onSave;
}

describe("DirectionEditor", () => {
  it("offers three lines, filled with the saved directions", () => {
    renderEditor();
    expect(screen.getByLabelText("方向 1")).toHaveValue("寫一本書");
    expect(screen.getByLabelText("方向 2")).toHaveValue("");
    expect(screen.getByLabelText("方向 3")).toHaveValue("");
  });

  it("shows which direction each activity already belongs to", () => {
    renderEditor();
    expect(screen.getByLabelText("寫作 屬於哪個方向")).toHaveValue("0");
    expect(screen.getByLabelText("健身 屬於哪個方向")).toHaveValue("");
  });

  it("saves the lines with the activities sorted into them", async () => {
    const user = userEvent.setup();
    const onSave = renderEditor();

    await user.type(screen.getByLabelText("方向 2"), "身體");
    await user.selectOptions(screen.getByLabelText("健身 屬於哪個方向"), "1");
    await user.click(screen.getByRole("button", { name: "儲存" }));

    expect(onSave).toHaveBeenCalledWith([
      { id: "book", text: "寫一本書", titles: ["寫作"] },
      { id: undefined, text: "身體", titles: ["健身"] },
      { id: undefined, text: "", titles: [] },
    ]);
  });
});
