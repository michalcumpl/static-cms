import { describe, expect, it } from "vitest";
import { editableDemoSite, loadDemoSite } from "../test/fixtures.js";
import { type RenderedSite, renderSite } from "./index.js";

function rendered(input: unknown = loadDemoSite(), basePath?: string): RenderedSite {
  const result = renderSite(input, basePath === undefined ? {} : { basePath });
  if (!result.ok) throw new Error(JSON.stringify(result.problems, null, 2));
  return result.site;
}

function page(site: RenderedSite, path: string): string {
  const found = site.pages.find((p) => p.path === path);
  if (!found) throw new Error(`No page at ${path}`);
  return found.html;
}

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

describe("renderSite: pages", () => {
  const site = rendered();
  const home = page(site, "index.html");
  const contact = page(site, "kontakt/index.html");

  it("renders one page per site page, home first", () => {
    expect(site.pages.map((p) => [p.pageId, p.path, p.url])).toEqual([
      ["page_home", "index.html", "/"],
      ["page_contact", "kontakt/index.html", "/kontakt/"],
    ]);
  });

  it("renders a complete document with language and landmarks", () => {
    for (const html of [home, contact]) {
      expect(html.startsWith("<!doctype html>\n")).toBe(true);
      expect(html).toContain('<html lang="cs">');
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
      );
      expect(html).toContain('<link rel="stylesheet" href="/assets/style.css">');
      for (const tag of ["header", "nav", "main", "footer"]) {
        expect(count(html, new RegExp(`<${tag}[ >]`, "g")), tag).toBe(1);
      }
    }
  });

  it("titles the home page with the site name and other pages with both", () => {
    expect(home).toContain("<title>Pekárna U Lípy</title>");
    expect(contact).toContain("<title>Kontakt – Pekárna U Lípy</title>");
  });

  it("adds a meta description only when the page has one", () => {
    expect(contact).toContain(
      '<meta name="description" content="Adresa, telefon a otevírací doba pekárny U Lípy v Kolíně.">',
    );
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.seo_description = "  ";
    expect(page(rendered(doc), "kontakt/index.html")).not.toContain('name="description"');
  });

  it("uses the hero heading as the only h1", () => {
    expect(count(home, /<h1[ >]/g)).toBe(1);
    expect(home).toContain("<h1>Čerstvý chléb každé ráno</h1>");
  });

  it("uses the page title as h1 when there is no hero, then h2 for block headings", () => {
    expect(count(contact, /<h1[ >]/g)).toBe(1);
    expect(contact).toMatch(/<h1 class="page-title">Kontakt<\/h1>[\s\S]*<h2>Kde nás najdete<\/h2>/);
  });

  it("marks only the current page in the navigation", () => {
    expect(contact).toContain('<li><a href="/kontakt/" aria-current="page">Kontakt</a></li>');
    expect(contact).toContain('<li><a href="/">Úvod</a></li>');
    expect(count(contact, /aria-current/g)).toBe(1);
    expect(home).toContain('<li><a href="/" aria-current="page">Úvod</a></li>');
    expect(count(home, /aria-current/g)).toBe(1);
  });

  it("renders external navigation links", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.ext_1 = {
      id: "ext_1",
      type: "external_link",
      label: { content: "Mapa", marks: [], annotations: [] },
      url: "https://www.openstreetmap.org/",
    };
    nodes.nav_1.items.nodes.push("ext_1");
    expect(page(rendered(doc), "index.html")).toContain(
      '<li><a href="https://www.openstreetmap.org/">Mapa</a></li>',
    );
  });

  it("escapes document text and contains no scripts or event handlers", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.para_about.content = {
      content: '<script>alert(1)</script><img src=x onerror="alert(1)">',
      marks: [],
      annotations: [],
    };
    nodes.site_1.name = 'Pekárna "<U Lípy>"';
    nodes.page_home.seo_description = '"><script>alert(1)</script>';
    const html = page(rendered(doc), "index.html");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("<title>Pekárna &quot;&lt;U Lípy&gt;&quot;</title>");
    expect(html).not.toMatch(/<script|<[^>]*\son[a-z]+=/i);
  });
});

describe("renderSite: base path", () => {
  it("prefixes every internal URL", () => {
    const site = rendered(loadDemoSite(), "/preview/");
    const home = page(site, "index.html");
    expect(site.pages.map((p) => p.url)).toEqual(["/preview/", "/preview/kontakt/"]);
    expect(home).toContain('<link rel="stylesheet" href="/preview/assets/style.css">');
    expect(home).toContain('<a class="site-name" href="/preview/">');
    expect(home).toContain('<li><a href="/preview/kontakt/">Kontakt</a></li>');
    expect(home).toContain('src="/preview/assets/images/hero.png"');
    expect(home).toContain('<a href="/preview/kontakt/">stránce Kontakt</a>');
    expect(home).not.toMatch(/(href|src)="\/(?!preview\/)/);
  });

  it("rejects a malformed base path", () => {
    const result = renderSite(loadDemoSite(), { basePath: "preview" });
    expect(result).toEqual({
      ok: false,
      problems: [expect.objectContaining({ severity: "error", code: "invalid-base-path" })],
    });
  });
});

describe("renderSite: invalid documents", () => {
  it("returns the validation errors instead of HTML", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.alt = "";
    const result = renderSite(doc);
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.problems.map((p) => p.code)).toEqual(["missing-alt"]);
  });

  it("passes warnings along with the output", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_2 = { ...nodes.hero_1, id: "hero_2" };
    const result = renderSite(doc);
    expect(result.ok && result.warnings.map((p) => p.code)).toEqual(["unreachable-node"]);
  });
});
