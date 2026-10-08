import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../testing.js";
import { validateSite } from "./index.js";

// The videos block and project video addresses (video, site-document delta).

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** The demo site with a videos block of `urls` at the top of "Kontakt". */
function site(urls: string[] = ["https://youtu.be/wNdrFte2T4w"]) {
  const { doc, nodes } = editableDemoSite();
  const ids = urls.map((url, i) => video(nodes, i + 1, url));
  nodes.videos_1 = { id: "videos_1", type: "videos", heading: text("Filmy"), items: list(ids) };
  nodes.page_contact.blocks.nodes.unshift("videos_1");
  return { doc, nodes };
}

function video(nodes: LooseNodes, n: number, url: string): string {
  const id = `video_${n}`;
  nodes[id] = {
    id,
    type: "video",
    url,
    title: text(`Film ${n}`),
    caption: text(""),
    poster: list(),
  };
  return id;
}

const problems = (doc: unknown) =>
  validateSite(doc).problems.map((p) => ({
    code: p.code,
    severity: p.severity,
    message: p.message,
  }));

describe("videos", () => {
  it("Videos block", () => {
    expect(problems(site().doc)).toEqual([]);
  });

  it("Films from YouTube", () => {
    const { doc, nodes } = site([
      "https://youtu.be/wNdrFte2T4w",
      "https://www.youtube.com/watch?v=GIN7sl9hRvg",
      "https://www.youtube.com/watch?v=eYZ_uyrNvGs",
    ]);
    nodes.video_1.poster = list(["image_hero"]);
    expect(problems(doc)).toEqual([]);
  });

  it("Address that isn't a video", () => {
    const { doc } = site(["https://youtu.be/wNdrFte2T4w", "https://www.youtube.com/@anideti"]);
    expect(problems(doc)).toEqual([
      {
        code: "unsupported-video",
        severity: "error",
        message: `Video 2 on "Kontakt" has an address that isn't a video on YouTube or Vimeo: "https://www.youtube.com/@anideti".`,
      },
    ]);
  });

  it("Video without a title", () => {
    const { doc, nodes } = site(["https://vimeo.com/697475416"]);
    nodes.video_1.title = text("");
    expect(problems(doc)).toEqual([
      expect.objectContaining({
        code: "empty-title",
        message: 'Video 1 on "Kontakt" needs a title.',
      }),
    ]);
  });

  it("reports an empty address, no videos and thirteen", () => {
    expect(problems(site([""]).doc)).toEqual([
      expect.objectContaining({ code: "unsupported-video" }),
    ]);
    expect(problems(site([]).doc)).toEqual([expect.objectContaining({ code: "empty-block" })]);
    const many = Array.from({ length: 13 }, () => "https://vimeo.com/1");
    expect(problems(site(many).doc)).toEqual([expect.objectContaining({ code: "too-many-items" })]);
  });

  it("Trailer somewhere else", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.project_1 = {
      id: "project_1",
      type: "project",
      name: text("Poslední závod"),
      category_id: "",
      summary: text(""),
      body: list(),
      facts: list(),
      cover: list(["image_hero"]),
      photos: list(),
      video_url: "https://www.csfd.cz/film/123/",
      slug: "",
    };
    nodes.site_1.projects = list(["project_1"]);
    expect(problems(doc)).toEqual([
      expect.objectContaining({ code: "video-as-link", severity: "warning" }),
    ]);
    expect(validateSite(doc).valid).toBe(true);
  });
});
