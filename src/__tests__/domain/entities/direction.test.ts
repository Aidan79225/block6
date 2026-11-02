import { describe, it, expect } from "vitest";
import {
  assignTitle,
  createDirection,
  directionOfTitle,
  type Direction,
} from "@/domain/entities/direction";

function direction(
  id: string,
  position: number,
  titles: string[] = [],
): Direction {
  return createDirection({
    id,
    userId: "u1",
    position,
    text: `方向 ${id}`,
    titles,
  });
}

describe("createDirection", () => {
  it("trims the text and drops blank or repeated titles", () => {
    const d = createDirection({
      id: "d1",
      userId: "u1",
      position: 0,
      text: "  寫一本書 ",
      titles: ["寫作", " 寫作 ", "", "讀書"],
    });
    expect(d.text).toBe("寫一本書");
    expect(d.titles).toEqual(["寫作", "讀書"]);
  });

  it("requires some text", () => {
    expect(() =>
      createDirection({
        id: "d1",
        userId: "u1",
        position: 0,
        text: "  ",
        titles: [],
      }),
    ).toThrow("Direction text is required");
  });

  it("allows only three directions", () => {
    expect(() => direction("d4", 3)).toThrow(
      "position must be between 0 and 2",
    );
  });
});

describe("directionOfTitle", () => {
  const directions = [direction("a", 0, ["寫作"]), direction("b", 1, ["健身"])];

  it("finds the direction an activity belongs to", () => {
    expect(directionOfTitle(directions, " 健身 ")?.id).toBe("b");
  });

  it("finds none for an untagged or empty title", () => {
    expect(directionOfTitle(directions, "上班")).toBeNull();
    expect(directionOfTitle(directions, "")).toBeNull();
  });
});

describe("assignTitle", () => {
  const directions = [direction("a", 0, ["寫作"]), direction("b", 1)];

  it("moves a title from one direction to another", () => {
    const next = assignTitle(directions, "寫作", "b");
    expect(next[0].titles).toEqual([]);
    expect(next[1].titles).toEqual(["寫作"]);
  });

  it("untags a title when given no direction", () => {
    const next = assignTitle(directions, "寫作", null);
    expect(next.every((d) => d.titles.length === 0)).toBe(true);
  });
});
