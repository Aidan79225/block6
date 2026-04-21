import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReflectionEditor } from "@/presentation/components/review/reflection-editor";

describe("ReflectionEditor", () => {
  it("disables 儲存反思 button when reflection is empty or whitespace", async () => {
    const user = userEvent.setup();

    render(<ReflectionEditor reflection="" onSave={() => {}} />);
    const button = () => screen.getByRole("button", { name: /儲存反思/ });

    expect(button()).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "a real reflection");
    expect(button()).not.toBeDisabled();

    await user.clear(screen.getByRole("textbox"));
    expect(button()).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "   ");
    expect(button()).toBeDisabled();
  });
});
