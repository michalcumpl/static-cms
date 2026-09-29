import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadDemoMedia, loadDemoSite } from "../test/fixtures.js";
import { validateSite } from "../validate/index.js";
import { type PropertyDef, siteSchema } from "./schema.js";

function matchesProperty(def: PropertyDef, value: unknown): boolean {
  switch (def.type) {
    case "string":
      return typeof value === "string";
    case "integer":
      return Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "node":
      return typeof value === "string";
    case "text":
    case "node_array": {
      const v = value as Record<string, unknown>;
      const main = def.type === "text" ? typeof v?.content === "string" : Array.isArray(v?.nodes);
      return main && Array.isArray(v.marks) && Array.isArray(v.annotations);
    }
  }
}

describe("demo site fixture", () => {
  const doc = loadDemoSite();

  it("has a site root", () => {
    expect(doc.nodes[doc.document_id]?.type).toBe("site");
  });

  it("matches the schema shape of every node", () => {
    for (const [key, node] of Object.entries(doc.nodes)) {
      const def: { properties: Record<string, PropertyDef> } | undefined = siteSchema[node.type];
      expect(def, `${key}: type ${node.type}`).toBeDefined();
      if (!def) continue;
      expect(Object.keys(node).sort(), key).toEqual(
        ["id", "type", ...Object.keys(def.properties)].sort(),
      );
      for (const [name, prop] of Object.entries(def.properties)) {
        const value = (node as unknown as Record<string, unknown>)[name];
        expect(matchesProperty(prop, value), `${key}.${name}`).toBe(true);
      }
    }
  });

  it("ships the media it references", () => {
    const media = loadDemoMedia();
    for (const node of Object.values(doc.nodes)) {
      if (node.type === "image") expect(media.has(node.src), node.src).toBe(true);
    }
  });
});

describe("starter site fixture", () => {
  const starter = JSON.parse(
    readFileSync(new URL("../../fixtures/starter-site.json", import.meta.url), "utf8"),
  );

  it("is a valid one-page site with no problems and no images", () => {
    expect(validateSite(starter)).toEqual({ valid: true, problems: [] });
    expect(starter.nodes[starter.document_id].pages.nodes).toEqual(["page_home"]);
    expect(Object.values(starter.nodes).some((n) => (n as { type: string }).type === "image")).toBe(
      false,
    );
  });
});
