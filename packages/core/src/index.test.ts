import { describe, expect, it } from "vitest";
import { createEntry, slugify } from "./index.js";

describe("slugify", () => {
  it("lowercases, strips diacritics and joins words with dashes", () => {
    expect(slugify("  Hello, Světe! ")).toBe("hello-svete");
  });
});

describe("createEntry", () => {
  it("derives the slug from the title", () => {
    expect(createEntry("My First Post")).toEqual({
      slug: "my-first-post",
      title: "My First Post",
    });
  });
});
