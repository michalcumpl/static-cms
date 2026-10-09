import { validateSite } from "@webmio/model";
import { editableDemoSite, type LooseNodes, loadFixture } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./registry.js";
import { STANDARD } from "./standard.js";
import type { Template } from "./types.js";
import { upgradeSite } from "./upgrade.js";

type Doc = { document_id: string; nodes: LooseNodes };

const only = (template: Template) => (id: string) => (id === template.id ? template : undefined);

describe("upgrading to a template's current release", () => {
  it("leaves a site at the current release as it is", () => {
    const { doc } = editableDemoSite();
    expect(upgradeSite(doc)).toEqual(doc);
  });

  it("upgrades the schema first: a version-12 document becomes Standard at release 1", () => {
    const upgraded = upgradeSite(loadFixture("demo-site-v12.json")) as Doc;
    expect(upgraded.nodes.site_1).toMatchObject({
      schema_version: 13,
      template: "standard",
      template_release: 1,
    });
  });

  it("Release without document changes", () => {
    const { doc } = editableDemoSite();
    const release2: Template = { ...STANDARD, release: 2 };
    const upgraded = upgradeSite(doc, only(release2)) as Doc;
    expect(upgraded.nodes.site_1.template_release).toBe(2);
    const { site_1: site, ...rest } = upgraded.nodes;
    const { site_1: before, ...restBefore } = doc.nodes as LooseNodes;
    expect(rest).toEqual(restBefore);
    expect(site).toEqual({ ...before, template_release: 2 });
  });

  it("Release with an upgrade step", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.template_release = 2;
    const coverHeroes = (d: Doc) => {
      for (const node of Object.values(d.nodes)) {
        if (node.type === "hero" && node.layout === "beside") node.layout = "cover";
      }
    };
    const release3: Template = {
      ...STANDARD,
      release: 3,
      looks: { ...STANDARD.looks, hero: "cover" },
      upgrades: { 3: coverHeroes },
    };
    const upgraded = upgradeSite(doc, only(release3)) as Doc;
    expect(upgraded.nodes.hero_1.layout).toBe("cover");
    expect(upgraded.nodes.site_1.template_release).toBe(3);
    expect(nodes.hero_1.layout).toBe("beside");
  });

  it("runs every later release's step, in order", () => {
    const { doc } = editableDemoSite();
    const ran: number[] = [];
    const t: Template = {
      ...STANDARD,
      release: 4,
      upgrades: { 2: () => ran.push(2), 4: () => ran.push(4), 3: () => ran.push(3) },
    };
    upgradeSite(doc, only(t));
    expect(ran).toEqual([2, 3, 4]);
  });

  it("leaves a release from the future and an unknown template for validation to report", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.template_release = 4;
    expect(upgradeSite(doc)).toEqual(doc);
    nodes.site_1.template_release = 1;
    nodes.site_1.template = "bakery";
    expect(upgradeSite(doc)).toEqual(doc);
  });
});

describe("upgrade step checks", () => {
  const FIXTURES = ["demo-site.json", "image-blocks-site.json", "starter-site.json"];
  /** Node types whose content is the owner's: collections, images and the theme. */
  const OWNERS = new Set([
    "theme",
    "image",
    "service_item",
    "person",
    "testimonial",
    "faq_item",
    "project",
    "project_category",
    "fact",
    "gallery_item",
  ]);
  const isText = (v: unknown) =>
    typeof v === "object" && v !== null && typeof (v as { content?: unknown }).content === "string";

  /**
   * What a template's upgrade steps break on a fixture, from each older release: problems in the
   * upgraded document, and changes to the owner's texts, images, collections or theme.
   */
  function upgradeProblems(template: Template, fixture: string): string[] {
    const problems: string[] = [];
    for (let from = 1; from < template.release; from++) {
      const doc = loadFixture(fixture) as Doc;
      Object.assign(doc.nodes[doc.document_id], { template: template.id, template_release: from });
      const upgraded = upgradeSite(doc, only(template)) as Doc;
      const where = `Template "${template.id}" from release ${from} on ${fixture}`;
      for (const p of validateSite(upgraded, {
        templates: new Map([[template.id, template.release]]),
      }).problems.filter((p) => p.severity === "error")) {
        problems.push(`${where}: ${p.message}`);
      }
      for (const [id, before] of Object.entries(doc.nodes)) {
        const after = upgraded.nodes[id];
        for (const [key, value] of Object.entries(before)) {
          const owners =
            OWNERS.has(before.type) || (id === doc.document_id && key !== "template_release");
          if ((owners || isText(value)) && JSON.stringify(after?.[key]) !== JSON.stringify(value)) {
            problems.push(`${where}: ${id}.${key} changed.`);
          }
        }
      }
    }
    return problems;
  }

  it.each(FIXTURES)("every template's steps keep %s valid and the owner's content", (fixture) => {
    for (const template of TEMPLATES) expect(upgradeProblems(template, fixture)).toEqual([]);
  });

  it("fails a step that edits a heading", () => {
    const t: Template = {
      ...STANDARD,
      id: "pushy",
      release: 2,
      upgrades: {
        2: (d) => {
          const hero = d.nodes.hero_1;
          if (hero) hero.heading.content = "Nejlepší pekárna";
        },
      },
    };
    expect(upgradeProblems(t, "demo-site.json")).toEqual([
      `Template "pushy" from release 1 on demo-site.json: hero_1.heading changed.`,
    ]);
  });
});
