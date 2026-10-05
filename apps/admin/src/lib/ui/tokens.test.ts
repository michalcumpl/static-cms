import { readFileSync } from "node:fs";
import { contrastRatio } from "@webmio/site";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const token = (name: string) => {
  const value = new RegExp(`--ui-${name}:\\s*(#[0-9a-f]{6});`).exec(css)?.[1];
  if (!value) throw new Error(`no token --ui-${name}`);
  return value;
};

/** Every text colour the components put on a background, as [text, background]. */
const PAIRS: [string, string][] = [
  ["ink", "ground"],
  ["ink", "surface"],
  ["muted", "ground"],
  ["muted", "surface"],
  ["muted", "soft"],
  ["link", "surface"],
  ["link", "ground"],
  ["link", "soft"],
  ["button-label", "button"],
  ["button-label", "button-hover"],
  ["button-label", "soft"],
  ["ink", "soft"],
  ["success", "success-soft"],
  ["attention", "attention-soft"],
  ["problem", "problem-soft"],
  ["problem", "surface"],
];

describe("design tokens", () => {
  it("are the Glacier colours", () => {
    expect([
      token("ground"),
      token("ink"),
      token("button"),
      token("button-label"),
      token("link"),
    ]).toEqual(["#f3f8f9", "#18292d", "#b5e4ec", "#0a3c47", "#0e6475"]);
  });

  it.each(PAIRS)("%s on %s reaches 4.5:1", (text, background) => {
    expect(contrastRatio(token(text), token(background))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the focus ring visible against the ground (3:1 for non-text)", () => {
    expect(contrastRatio(token("focus"), token("ground"))).toBeGreaterThanOrEqual(3);
  });

  it("styles no elements but the body, so the site canvas is untouched", () => {
    const selectors = [...css.matchAll(/(^|\})\s*([^{}@/]+?)\s*\{/g)].map((m) => m[2]?.trim());
    expect(
      selectors.filter((s) => s !== ":root" && s !== "body" && s !== ":focus-visible"),
    ).toEqual([]);
  });
});
