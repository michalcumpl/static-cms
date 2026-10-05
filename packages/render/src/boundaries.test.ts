import { importViolations } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";

// Imports go one way only: model ← render ← export (package-split design decision 5), and the
// package's entry needs no filesystem (decision 4).
describe("package boundaries", () => {
  it("imports only @webmio/model, and no Node modules", () => {
    expect(importViolations(new URL("./", import.meta.url), ["@webmio/model"])).toEqual([]);
  });
});
