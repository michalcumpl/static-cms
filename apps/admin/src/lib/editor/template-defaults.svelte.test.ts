import type { Template } from "@webmio/templates";
import { describe, expect, it, vi } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { imageBlocksSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import { insertBlockAt } from "./structure";

// Template defaults for new blocks (template-system, site-editing delta). The registry only holds
// Standard, so a made-up template with other looks is added to it here.
vi.mock("@webmio/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@webmio/templates")>();
  const photo: Template = {
    ...actual.STANDARD,
    id: "photo",
    looks: { hero: "cover", services: "list", team: "list", gallery: "whole", cards: "over" },
  };
  return {
    ...actual,
    templateById: (id: string) => (id === "photo" ? photo : actual.templateById(id)),
  };
});

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function insertAll(template: string) {
  const document = imageBlocksSite() as { nodes: Record<string, AnyNode> };
  Object.assign(document.nodes.site_1 ?? {}, { template });
  const editor = new EditorState({ document, version: "v1", problems: [] }, projectPaths("p"));
  editor.showPage("page_contact");
  const { session } = editor;
  const path = ["site_1", "pages", 1, "blocks"];
  for (const type of ["cards", "gallery", "team", "services", "hero"] as const) {
    expect(insertBlockAt(session, path, 0, type)).toBe(true);
  }
  const get = (id: string) => session.get(id) as AnyNode;
  const [hero, services, team, gallery, cards] = get("page_contact").blocks.nodes.map(get);
  return { hero, services, team, gallery, cards };
}

describe("template defaults for new blocks", () => {
  it("Template prefers the full photo", () => {
    const { hero, services, team, gallery, cards } = insertAll("photo");
    expect(hero).toMatchObject({ type: "hero", layout: "cover" });
    expect(services).toMatchObject({ type: "services", layout: "list" });
    expect(team).toMatchObject({ type: "team", layout: "list" });
    expect(gallery).toMatchObject({ type: "gallery", image_fit: "whole" });
    expect(cards).toMatchObject({ type: "cards", layout: "over" });
  });

  it("Standard: the looks before templates existed", () => {
    const { hero, services, team, gallery, cards } = insertAll("standard");
    expect(hero).toMatchObject({ layout: "beside" });
    expect(services).toMatchObject({ layout: "cards" });
    expect(team).toMatchObject({ layout: "cards" });
    expect(gallery).toMatchObject({ image_fit: "fill" });
    expect(cards).toMatchObject({ layout: "below" });
  });
});
