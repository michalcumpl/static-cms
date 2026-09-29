import { describe, expect, it } from "vitest";
import { graphemeLength, graphemes } from "./text.js";

describe("graphemes", () => {
  it("counts an emoji with a modifier as one position", () => {
    expect(graphemeLength("a👋🏽b")).toBe(3);
  });

  it("counts a decomposed diacritic as one position", () => {
    expect(graphemes("Světe")).toEqual(["S", "v", "ě", "t", "e"]);
  });
});
