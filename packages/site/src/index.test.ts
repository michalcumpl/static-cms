import { describe, expect, it } from "vitest";
import { siteSchema, slugify, validateSite } from "./index.js";
import { loadDemoSite } from "./test/fixtures.js";

describe("slugify", () => {
  it("lowercases, strips diacritics and joins words with dashes", () => {
    expect(slugify("  Hello, Světe! ")).toBe("hello-svete");
  });
});

describe("package entry", () => {
  it("exposes the schema and validateSite", () => {
    expect(siteSchema.site.kind).toBe("document");
    expect(validateSite(loadDemoSite()).valid).toBe(true);
  });
});
