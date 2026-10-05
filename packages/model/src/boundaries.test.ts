import { describe, expect, it } from "vitest";
import { importViolations } from "./testing.js";

// Imports go one way only: model ← render ← export (package-split design decision 5), and the
// package's entry needs no filesystem (decision 4).
describe("package boundaries", () => {
  it("imports only its own files, and no Node modules", () => {
    expect(importViolations(new URL("./", import.meta.url), [], ["testing.ts"])).toEqual([]);
  });
});
