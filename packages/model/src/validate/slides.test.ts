import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../testing.js";
import { validateSite } from "./index.js";

// The hero slideshow's slides (hero-slideshow, site-document delta).

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** The demo site with its home hero a slideshow of `count` slides, each with a photo and title. */
function site(count = 6, layout = "slideshow") {
  const { doc, nodes } = editableDemoSite();
  const ids = Array.from({ length: count }, (_, i) => {
    const id = `slide_${i + 1}`;
    nodes[`slide_img_${i + 1}`] = { ...nodes.image_hero, id: `slide_img_${i + 1}` };
    nodes[id] = {
      id,
      type: "slide",
      image: list([`slide_img_${i + 1}`]),
      title: text(`Projekt ${i + 1}`),
      target_id: "page_contact",
      url: "",
    };
    return id;
  });
  Object.assign(nodes.hero_1, { layout, slides: list(ids) });
  return { doc, nodes };
}

const problems = (doc: unknown) =>
  validateSite(doc).problems.map((p) => ({
    code: p.code,
    severity: p.severity,
    message: p.message,
  }));

describe("hero slides", () => {
  it("Latest work", () => {
    expect(problems(site().doc)).toEqual([]);
  });

  it("One slide", () => {
    const { doc } = site(1);
    expect(problems(doc)).toEqual([
      expect.objectContaining({ code: "slideshow-too-short", severity: "warning" }),
    ]);
    expect(validateSite(doc).valid).toBe(true);
  });

  it("Slide without a photo", () => {
    const { doc, nodes } = site();
    nodes.slide_3.image = list();
    delete nodes.slide_img_3;
    expect(problems(doc)).toEqual([
      { code: "missing-image", severity: "error", message: 'Slide 3 on "Úvod" needs a photo.' },
    ]);
  });

  it("Slides kept in another look", () => {
    const { doc, nodes } = site(2, "cover");
    nodes.slide_1.title = text("");
    expect(problems(doc)).toEqual([]);
  });

  it("reports nine slides, a title missing, and links that lead nowhere or aren't safe", () => {
    expect(problems(site(9).doc)).toEqual([expect.objectContaining({ code: "too-many-items" })]);
    const { doc, nodes } = site(3);
    nodes.slide_1.title = text(" ");
    nodes.slide_2.target_id = "project_gone";
    Object.assign(nodes.slide_3, { target_id: "", url: "javascript:alert(1)" });
    expect(
      problems(doc)
        .map((p) => p.code)
        .sort(),
    ).toEqual(["broken-card-link", "empty-title", "unsafe-link"]);
  });
});
