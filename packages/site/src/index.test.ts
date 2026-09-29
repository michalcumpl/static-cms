import { describe, expect, it } from "vitest";
import { isSafeHref, siteSchema, slugify, uniqueSlug, validateSite } from "./index.js";
import { loadDemoSite } from "./test/fixtures.js";

describe("slugify", () => {
  it("lowercases, strips diacritics and joins words with dashes", () => {
    expect(slugify("  Hello, Světe! ")).toBe("hello-svete");
  });
});

describe("uniqueSlug", () => {
  it("keeps a free slug", () => {
    expect(uniqueSlug("kontakt", ["uvod"])).toBe("kontakt");
  });

  it("adds the first free numeric suffix", () => {
    expect(uniqueSlug("kontakt", ["kontakt"])).toBe("kontakt-2");
    expect(uniqueSlug("kontakt", ["kontakt", "kontakt-2", "kontakt-3"])).toBe("kontakt-4");
  });

  it("uses page for an empty base", () => {
    expect(uniqueSlug("", [])).toBe("page");
    expect(uniqueSlug("", ["page"])).toBe("page-2");
  });
});

describe("package entry", () => {
  it("exposes the schema and validateSite", () => {
    expect(siteSchema.site.kind).toBe("document");
    expect(validateSite(loadDemoSite()).valid).toBe(true);
  });

  it("exposes isSafeHref for link editors", () => {
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
  });
});
