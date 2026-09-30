import { describe, expect, it } from "vitest";
import { editableImageBlocksSite } from "../test/fixtures.js";
import { renderSite } from "./index.js";

function galleryPage(edit?: (nodes: ReturnType<typeof editableImageBlocksSite>["nodes"]) => void) {
  const { doc, nodes } = editableImageBlocksSite();
  edit?.(nodes);
  const result = renderSite(doc);
  if (!result.ok) throw new Error(JSON.stringify(result.problems));
  const page = result.site.pages.find((p) => p.path === "galerie/index.html");
  if (!page) throw new Error("no galerie page");
  return page.html;
}

/** The HTML of the section with this block class. */
function section(html: string, cls: string): string {
  const start = html.indexOf(`<section class="block ${cls}`);
  if (start < 0) throw new Error(`no ${cls} section`);
  return html.slice(start, html.indexOf("</section>", start));
}

describe("text with image", () => {
  it("names the image side, and renders heading, text, list and image", () => {
    const out = section(galleryPage(), "text-with-image");
    expect(out).toContain('<section class="block text-with-image image-left">');
    expect(out).toContain("<h2>Dárkový poukaz</h2>");
    expect(out).toContain("<p>Dárkový poukaz udělá radost každému malému umělci.</p>");
    expect(out).toContain("<li>Platí rok od koupě</li>");
    expect(out).toContain('sizes="(min-width: 48rem) 50vw, 100vw" alt="Dárkový poukaz ateliéru"');
    expect(out).toContain('loading="lazy"');
  });

  it("puts the image on the right by default, and leaves out a missing image", () => {
    const out = section(
      galleryPage((n) => {
        n.twi_voucher.image_side = "right";
        n.twi_voucher.image.nodes = [];
        delete n.image_voucher;
      }),
      "text-with-image",
    );
    expect(out).toContain("image-right");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("twi-image");
  });
});

describe("gallery", () => {
  it("links each photo to its largest variant, lazily, with the gallery sizes", () => {
    const out = section(
      galleryPage((n) => {
        Object.assign(n.image_gallery_1, { src: "dilna-1a2b3c4d", width: 3000, height: 2250 });
      }),
      "gallery",
    );
    expect(out).toContain('<a href="/assets/images/dilna-1a2b3c4d-2400.webp"><img');
    expect(out).toContain('sizes="(min-width: 48rem) 33vw, 50vw"');
    expect(out.match(/loading="lazy"/g)).toHaveLength(3);
    expect(out.match(/<figure>/g)).toHaveLength(3);
  });

  it("adds a caption only when there is one", () => {
    const out = section(galleryPage(), "gallery");
    expect(out.match(/<figcaption>/g)).toHaveLength(2);
    expect(out).toContain("<figcaption>Malování na plátno</figcaption>");
    expect(out).not.toMatch(/<figcaption><\/figcaption>/);
  });
});

describe("team", () => {
  it("renders names one level below the team heading", () => {
    const out = section(galleryPage(), "team");
    expect(out).toContain("<h2>Kdo jsme</h2>");
    expect(out).toContain('<h3 class="person-name">Kateřina</h3>');
    expect(out).toContain('<h3 class="person-name">Martina</h3>');
  });

  it("renders names as h2 without a team heading", () => {
    const out = section(
      galleryPage((n) => {
        n.team_1.heading.content = "";
      }),
      "team",
    );
    expect(out).not.toContain("<h2>Kdo jsme</h2>");
    expect(out).toContain('<h2 class="person-name">Kateřina</h2>');
  });

  it("shows a decorative round portrait, and no empty role or text", () => {
    const out = section(galleryPage(), "team");
    expect(out).toContain('class="portrait"');
    expect(out).toContain('sizes="10rem" alt=""');
    expect(out.match(/<img/g)).toHaveLength(1);
    expect(out.match(/person-role/g)).toHaveLength(1);
    expect(out.match(/person-text/g)).toHaveLength(1);
  });
});

describe("logos", () => {
  it("describes each logo by its name and links it when it has a link", () => {
    const out = section(galleryPage(), "logos");
    expect(out).toMatch(/<a href="https:\/\/harmonie\.example"><img [^>]*alt="Nadace Harmonie"/);
    expect(out).toMatch(/<a href="\/kontakt\/"><img [^>]*alt="Praha 6"/);
    expect(out).toContain('sizes="12rem"');
  });

  it("renders an unlinked logo without a link", () => {
    const out = section(
      galleryPage((n) => {
        n.logo_p6.page_id = "";
      }),
      "logos",
    );
    expect(out).toMatch(/<li><img [^>]*alt="Praha 6"[^>]*><\/li>/);
  });
});
