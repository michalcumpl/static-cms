import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../test/fixtures.js";
import { validateSite } from "./index.js";
import { type ProblemCode, problemCategory } from "./problems.js";

describe("problem categories", () => {
  it("reports a dangling reference as structure and an empty subheading as site", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_home.blocks.nodes.push("services_9");
    nodes.sub_about.content.content = "";
    const problems = validateSite(doc).problems;
    expect(problems).toContainEqual(
      expect.objectContaining({ code: "missing-reference", category: "structure" }),
    );
    expect(problems).toContainEqual(
      expect.objectContaining({ code: "empty-heading", category: "site", nodeId: "sub_about" }),
    );
  });

  it("gives every problem a category matching its code", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.id = "hero_x";
    nodes.image_hero.alt = "";
    nodes.orphan = { id: "orphan", type: "strong" };
    for (const p of validateSite(doc).problems) {
      expect(p.category, p.code).toBe(problemCategory(p.code));
    }
  });

  it("has a category for every code", () => {
    // Codes a problem can carry, from the `ProblemCode` union; a missing one is a type error.
    const codes: Record<ProblemCode, true> = {
      "invalid-document": true,
      "invalid-id": true,
      "id-mismatch": true,
      "unknown-type": true,
      "invalid-value": true,
      "missing-reference": true,
      "disallowed-type": true,
      "invalid-range": true,
      "overlapping-marks": true,
      cycle: true,
      "unreachable-node": true,
      "root-not-site": true,
      "unsupported-version": true,
      "missing-site-name": true,
      "missing-language": true,
      "invalid-language": true,
      "invalid-base-url": true,
      "no-pages": true,
      "missing-home": true,
      "duplicate-reference": true,
      "missing-title": true,
      "invalid-slug": true,
      "duplicate-slug": true,
      "missing-page": true,
      "duplicate-menu-item": true,
      "hero-not-first": true,
      "too-many-items": true,
      "empty-heading": true,
      "heading-skip": true,
      "missing-alt": true,
      "decorative-with-alt": true,
      "invalid-media-key": true,
      "missing-image-size": true,
      "missing-image": true,
      "empty-name": true,
      "empty-block": true,
      "empty-link-label": true,
      "unsafe-link": true,
      "invalid-color": true,
      "invalid-theme-value": true,
      "low-contrast": true,
      "name-without-logo": true,
      "invalid-base-path": true,
      "invalid-site-url": true,
      "invalid-redirect": true,
      "missing-media": true,
      "no-base-url": true,
      "no-description": true,
      "small-share-image": true,
      "small-favicon": true,
      "invalid-phone": true,
      "invalid-email": true,
      "invalid-map-url": true,
      "invalid-country": true,
      "invalid-hours": true,
      "nothing-to-show": true,
      "empty-quote": true,
      "duplicate-translation-key": true,
    };
    for (const code of Object.keys(codes) as ProblemCode[]) {
      expect(["structure", "site"], code).toContain(problemCategory(code));
    }
  });
});
