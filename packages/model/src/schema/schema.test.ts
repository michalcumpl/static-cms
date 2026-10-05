import { describe, expect, it } from "vitest";
import { type NodeSchema, nodeTypes, siteSchema } from "./schema.js";
import type { NodeType } from "./types.js";

// Must list every member of `NodeType` exactly once: a missing or extra key is a type error.
const typesFromTs: Record<NodeType, true> = {
  site: true,
  theme: true,
  nav: true,
  page_link: true,
  external_link: true,
  page: true,
  hero: true,
  rich_text: true,
  paragraph: true,
  subheading: true,
  list: true,
  list_item: true,
  services: true,
  service_item: true,
  text_with_image: true,
  gallery: true,
  gallery_item: true,
  team: true,
  person: true,
  logos: true,
  logo_item: true,
  contact: true,
  call_to_action: true,
  testimonials: true,
  testimonial: true,
  faq: true,
  faq_item: true,
  item_ref: true,
  social_link: true,
  opening_hours: true,
  business: true,
  location: true,
  opening_day: true,
  time_range: true,
  image: true,
  strong: true,
  emphasis: true,
  link: true,
  internal_link: true,
};

const schema: Record<string, NodeSchema> = siteSchema;

describe("siteSchema", () => {
  it("defines exactly the node types of the TypeScript model", () => {
    expect([...nodeTypes].sort()).toEqual(Object.keys(typesFromTs).sort());
  });

  it("only references node types it defines, with the right kinds (as Svedit requires)", () => {
    for (const [type, def] of Object.entries(schema)) {
      for (const [name, prop] of Object.entries(def.properties)) {
        const where = `${type}.${name}`;
        expect(name, where).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
        if (prop.type === "node" || prop.type === "node_array") {
          for (const ref of prop.node_types) expect(schema[ref], where).toBeDefined();
        }
        if (prop.type === "text" || prop.type === "node_array") {
          for (const ref of prop.mark_types ?? []) expect(schema[ref]?.kind, where).toBe("mark");
        }
      }
    }
  });

  it("gives text-kind nodes exactly one text property, named content", () => {
    for (const [type, def] of Object.entries(schema)) {
      if (def.kind !== "text") continue;
      const textProps = Object.entries(def.properties).filter(([, p]) => p.type === "text");
      expect(
        textProps.map(([name]) => name),
        type,
      ).toEqual(["content"]);
    }
  });
});
