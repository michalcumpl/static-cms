import { describe, expect, it } from "vitest";
import { projectsShown } from "../collections.js";
import type { SiteDocument } from "../schema/index.js";
import { editableDemoSite, type LooseNodes } from "../testing.js";
import { validateSite } from "./index.js";

// Projects, the projects block and item pages (collection-pages, site-document delta).

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** The demo site with categories "Výstavy" and "Eventy" and `count` projects in "Výstavy". */
function site(count = 1) {
  const { doc, nodes } = editableDemoSite();
  nodes.category_vystavy = {
    id: "category_vystavy",
    type: "project_category",
    name: text("Výstavy"),
  };
  nodes.category_eventy = { id: "category_eventy", type: "project_category", name: text("Eventy") };
  nodes.site_1.project_categories = list(["category_vystavy", "category_eventy"]);
  const ids = Array.from({ length: count }, (_, i) => project(nodes, i + 1));
  nodes.site_1.projects = list(ids);
  return { doc, nodes };
}

function project(nodes: LooseNodes, n: number, category = "category_vystavy"): string {
  const id = `project_${n}`;
  nodes[`cover_${n}`] = {
    id: `cover_${n}`,
    type: "image",
    src: `cover-${n}.jpg`,
    alt: `Projekt ${n}`,
    decorative: false,
    width: 1200,
    height: 800,
  };
  nodes[id] = {
    id,
    type: "project",
    name: text(`Projekt ${n}`),
    category_id: category,
    summary: text(""),
    body: list(),
    facts: list(),
    cover: list([`cover_${n}`]),
    photos: list(),
    video_url: "",
    slug: `projekt-${n}`,
  };
  return id;
}

function projectsBlock(nodes: LooseNodes, props: Record<string, unknown> = {}) {
  nodes.projects_1 = {
    id: "projects_1",
    type: "projects",
    heading: text("Realizace"),
    show: "all",
    chosen: list(),
    category_id: "",
    limit: 0,
    ...props,
  };
  nodes.page_contact.blocks.nodes.push("projects_1");
  return nodes.projects_1 as never;
}

const problems = (doc: unknown) =>
  validateSite(doc).problems.map((p) => ({
    code: p.code,
    severity: p.severity,
    message: p.message,
  }));
const errors = (doc: unknown) => problems(doc).filter((p) => p.severity === "error");

describe("projects", () => {
  it("A project with everything", () => {
    const { doc, nodes } = site();
    nodes.p1 = { id: "p1", type: "paragraph", content: text("Výstava k výročí.") };
    nodes.li1 = { id: "li1", type: "list_item", content: text("návrh") };
    nodes.l1 = { id: "l1", type: "list", items: list(["li1"]) };
    nodes.fact_1 = { id: "fact_1", type: "fact", label: text("Rok"), value: text("2024") };
    nodes.fact_2 = {
      id: "fact_2",
      type: "fact",
      label: text("Klient"),
      value: text("Národní technické muzeum"),
    };
    const photos = Array.from({ length: 7 }, (_, i) => {
      nodes[`photo_img_${i}`] = { ...nodes.cover_1, id: `photo_img_${i}`, src: `p${i}.jpg` };
      nodes[`photo_${i}`] = {
        id: `photo_${i}`,
        type: "gallery_item",
        image: list([`photo_img_${i}`]),
        caption: text(`Detail ${i}`),
      };
      return `photo_${i}`;
    });
    Object.assign(nodes.project_1, {
      name: text("PETROF 160"),
      summary: text("Klavír jako technické dílo"),
      body: list(["p1", "l1"]),
      facts: list(["fact_1", "fact_2"]),
      photos: list(photos),
    });
    expect(problems(doc)).toEqual([]);
  });

  it("Category that doesn't exist", () => {
    const { doc, nodes } = site();
    nodes.project_1.category_id = "category_gone";
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "missing-category",
        message: expect.stringContaining("Project 1"),
      }),
    ]);
  });

  it("Fact without a value", () => {
    const { doc, nodes } = site(2);
    nodes.fact_1 = { id: "fact_1", type: "fact", label: text("Director"), value: text("") };
    nodes.project_2.facts = list(["fact_1"]);
    expect(errors(doc)).toEqual([
      {
        code: "empty-value",
        severity: "error",
        message: `Project 2's fact "Director" needs a value; edit it in What you offer.`,
      },
    ]);
  });

  it("Project without a cover", () => {
    const { doc, nodes } = site(4);
    nodes.project_4.cover = list();
    delete nodes.cover_4;
    expect(problems(doc)).toEqual([
      expect.objectContaining({ code: "missing-cover", severity: "warning" }),
    ]);
    expect(validateSite(doc).valid).toBe(true);
  });

  it("Video that isn't https", () => {
    const { doc, nodes } = site();
    nodes.project_1.video_url = "http://vimeo.com/697475416";
    expect(errors(doc)).toEqual([expect.objectContaining({ code: "unsafe-link" })]);
  });

  it("names a category without a name", () => {
    const { doc, nodes } = site();
    nodes.category_eventy.name = text(" ");
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "empty-name",
        message: expect.stringContaining("Project category 2"),
      }),
    ]);
  });
});

describe("projects block", () => {
  it("One category", () => {
    const { doc, nodes } = site(10);
    for (const n of [2, 5, 8]) nodes[`project_${n}`].category_id = "category_eventy";
    const block = projectsBlock(nodes, { category_id: "category_eventy" });
    expect(problems(doc)).toEqual([]);
    expect(projectsShown(doc as SiteDocument, block).map((p) => p.id)).toEqual([
      "project_2",
      "project_5",
      "project_8",
    ]);
  });

  it("Latest four", () => {
    const { doc, nodes } = site(30);
    const block = projectsBlock(nodes, { limit: 4 });
    expect(projectsShown(doc as SiteDocument, block).map((p) => p.id)).toEqual([
      "project_1",
      "project_2",
      "project_3",
      "project_4",
    ]);
  });

  it("Negative number", () => {
    const { doc, nodes } = site();
    projectsBlock(nodes, { limit: -1 });
    expect(errors(doc)).toEqual([expect.objectContaining({ code: "invalid-value" })]);
  });

  it("reports a category that no longer exists, and warns about one without projects", () => {
    const gone = site();
    projectsBlock(gone.nodes, { category_id: "category_gone" });
    expect(errors(gone.doc)).toEqual([expect.objectContaining({ code: "missing-category" })]);
    const empty = site();
    projectsBlock(empty.nodes, { category_id: "category_eventy" });
    expect(problems(empty.doc)).toEqual([
      expect.objectContaining({ code: "empty-block", severity: "warning" }),
    ]);
  });
});

describe("item pages", () => {
  it("Practice areas with pages", () => {
    const { doc, nodes } = site();
    nodes.site_1.services_page_id = "page_contact";
    nodes.service_bread.slug = "kvaskovy-chleb";
    nodes.service_rolls.slug = "rohliky";
    nodes.service_cakes.slug = "dorty";
    expect(problems(doc)).toEqual([]);
  });

  it("Two projects with one address", () => {
    const { doc, nodes } = site(5);
    nodes.site_1.projects_page_id = "page_contact";
    nodes.project_2.slug = "designblok";
    nodes.project_5.slug = "designblok";
    expect(errors(doc)).toEqual([
      {
        code: "duplicate-slug",
        severity: "error",
        message: `Project 2 and Project 5 have the same address "designblok".`,
      },
    ]);
  });

  it("Home page as the listing page", () => {
    const { doc, nodes } = site();
    nodes.site_1.projects_page_id = nodes.site_1.home_page_id;
    expect(errors(doc)).toEqual([expect.objectContaining({ code: "invalid-listing-page" })]);
  });

  it("Addresses don't matter without pages", () => {
    const { doc, nodes } = site();
    nodes.project_1.slug = "";
    expect(problems(doc)).toEqual([]);
  });

  it("needs addresses that are slugs while the items have pages", () => {
    const { doc, nodes } = site();
    nodes.site_1.services_page_id = "page_contact";
    expect(errors(doc).map((p) => p.message)).toContain(
      "Service 1 needs an address for its page; edit it in What you offer.",
    );
    nodes.site_1.services_page_id = "page_gone";
    expect(errors(doc)).toEqual([expect.objectContaining({ code: "missing-page" })]);
  });
});
