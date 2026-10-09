import { importViolations } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";

// The reading half of the import is pure (site-import design decision 1): it gets the pages and
// returns the site, and the admin does the fetching. No Node modules, so it is tested on strings.
describe("package boundaries", () => {
  it("imports only @webmio/model, @webmio/templates and its parsers, and no Node modules", () => {
    expect(
      importViolations(
        new URL("./", import.meta.url),
        ["@webmio/model", "@webmio/templates"],
        ["testing.ts"],
      ),
    ).toEqual([]);
  });
});
