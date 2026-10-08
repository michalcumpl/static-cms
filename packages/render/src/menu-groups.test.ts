import { type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";
import { MENU_SCRIPT } from "./menu-script.js";

// Groups of links in the menu (menu-groups, site-rendering delta).

/** Scénografie in miniature: four project pages grouped under "Projekty", then two pages. */
function site(grouped = true): SiteDocument {
  const s = siteBuilder({ name: "Scénografie", lang: "cs", description: "Scénografie." });
  s.location({ street: "Na Pankráci 1", city: "Praha" });
  s.page({ title: "Úvod", slug: "uvod" }, []);
  if (grouped) s.menuGroup("Projekty", ["tv-a-film", "eventy", "vystavy", "interiery"]);
  for (const [title, slug] of [
    ["TV a film", "tv-a-film"],
    ["Eventy", "eventy"],
    ["Výstavy", "vystavy"],
    ["Interiéry", "interiery"],
  ] as const) {
    s.page({ title, slug, menu: !grouped }, []);
  }
  s.page({ title: "O nás", slug: "o-nas", menu: true }, []);
  s.page({ title: "Kontakty", slug: "kontakty", menu: true }, []);
  return s.build();
}

function render(doc: SiteDocument) {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const page = (path: string) => result.site.pages.find((p) => p.path === path)?.html ?? "";
  return { page, scripts: result.site.scripts, notFound: result.site.notFound };
}

/** The menu's markup with its whitespace between tags removed. */
const menu = (html: string) =>
  (html.match(/<nav class="site-nav">([\s\S]*?)<\/nav>/)?.[1] ?? "").replace(/>\s+</g, "><").trim();

describe("menu groups", () => {
  it("Projects grouped", () => {
    expect(menu(render(site()).page("index.html"))).toBe(
      '<ul><li class="menu-group"><details name="site-menu"><summary>Projekty</summary><ul>' +
        '<li><a href="/tv-a-film/">TV a film</a></li><li><a href="/eventy/">Eventy</a></li>' +
        '<li><a href="/vystavy/">Výstavy</a></li><li><a href="/interiery/">Interiéry</a></li>' +
        '</ul></details></li><li><a href="/o-nas/">O nás</a></li>' +
        '<li><a href="/kontakty/">Kontakty</a></li></ul>',
    );
  });

  it("Current page inside a group", () => {
    const eventy = render(site()).page("eventy/index.html");
    expect(menu(eventy)).toContain('<li><a href="/eventy/" aria-current="page">Eventy</a></li>');
    expect(eventy.match(/aria-current/g)).toHaveLength(1);
  });

  it("loads the menu script on every page of a site with groups, the 404 page too", () => {
    const { page, scripts, notFound } = render(site());
    const tag = '<script src="/assets/menu.js" defer></script>';
    expect(page("index.html")).toContain(tag);
    expect(page("kontakty/index.html")).toContain(tag);
    expect(notFound).toContain(tag);
    expect(scripts).toEqual({ "menu.js": MENU_SCRIPT });
  });

  it("No groups, no script", () => {
    const { page, scripts } = render(site(false));
    expect(page("index.html")).not.toContain("menu.js");
    expect(scripts).toEqual({});
  });

  it("leaves out a group without links, and its script", () => {
    const doc = site();
    const group = Object.values(doc.nodes).find((n) => n.type === "menu_group");
    if (group?.type !== "menu_group") throw new Error("no group");
    group.items.nodes = [];
    const { page, scripts } = render(doc);
    expect(page("index.html")).not.toContain("Projekty");
    expect(scripts).toEqual({});
  });

  it("passes html-validate", async () => {
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(render(site()).page("eventy/index.html"));
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});
