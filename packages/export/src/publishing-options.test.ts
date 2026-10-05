import { editableDemoSite, loadDemoMedia, loadDemoSite } from "@webmio/model/testing";
import { renderSite } from "@webmio/render";
import { describe, expect, it } from "vitest";
import { exportSite } from "./index.js";

const decode = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);

function pages(siteUrl?: string) {
  const result = renderSite(loadDemoSite(), siteUrl === undefined ? {} : { siteUrl });
  if (!result.ok) throw new Error(JSON.stringify(result.problems));
  return Object.fromEntries(result.site.pages.map((p) => [p.path, p.html]));
}

describe("canonical links", () => {
  it("give each page its absolute URL", () => {
    const html = pages("https://anideti.cz");
    expect(html["kontakt/index.html"]).toContain(
      '<link rel="canonical" href="https://anideti.cz/kontakt/">',
    );
    expect(html["index.html"]).toContain('<link rel="canonical" href="https://anideti.cz/">');
  });

  it("ignore a trailing slash on the site address", () => {
    expect(pages("https://anideti.cz/")["index.html"]).toContain(
      '<link rel="canonical" href="https://anideti.cz/">',
    );
  });

  it("are left out without a site address", () => {
    for (const html of Object.values(pages())) expect(html).not.toContain("canonical");
  });

  it("refuse a site address that isn't an absolute http(s) URL", () => {
    for (const siteUrl of ["anideti.cz", "ftp://anideti.cz", "https://anideti.cz/?x=1"]) {
      const result = renderSite(loadDemoSite(), { siteUrl });
      expect(result.ok, siteUrl).toBe(false);
      expect(!result.ok && result.problems[0]?.code).toBe("invalid-site-url");
    }
  });
});

describe("site address in export", () => {
  it("is the sitemap's base URL, over the document's", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.base_url = "";
    const result = exportSite(doc, loadDemoMedia(), { siteUrl: "https://sc-p1.netlify.app" });
    if (!result.ok) throw new Error(JSON.stringify(result.problems));
    const sitemap = decode(result.files.get("sitemap.xml"));
    expect(sitemap).toContain("<loc>https://sc-p1.netlify.app/</loc>");
    expect(sitemap).toContain("<loc>https://sc-p1.netlify.app/kontakt/</loc>");
    expect(decode(result.files.get("index.html"))).toContain(
      '<link rel="canonical" href="https://sc-p1.netlify.app/">',
    );
    expect(result.warnings.map((w) => w.code)).not.toContain("no-base-url");
  });
});

describe("redirects file", () => {
  it("writes one 301 line per redirect, in order", () => {
    const result = exportSite(loadDemoSite(), loadDemoMedia(), {
      redirects: [
        { from: "/kontakt/", to: "/napiste-nam/" },
        { from: "/o-nas/", to: "/" },
      ],
    });
    if (!result.ok) throw new Error(JSON.stringify(result.problems));
    expect(decode(result.files.get("_redirects"))).toBe(
      "/kontakt/ /napiste-nam/ 301\n/o-nas/ / 301\n",
    );
  });

  it("is left out without redirects", () => {
    for (const redirects of [undefined, []]) {
      const result = exportSite(loadDemoSite(), loadDemoMedia(), redirects ? { redirects } : {});
      expect(result.ok && result.files.has("_redirects")).toBe(false);
    }
  });

  it("refuses paths without a leading slash or with spaces", () => {
    for (const redirect of [
      { from: "kontakt/", to: "/" },
      { from: "/a b/", to: "/" },
      { from: "/a/", to: "/b/ 302" },
    ]) {
      const result = exportSite(loadDemoSite(), loadDemoMedia(), { redirects: [redirect] });
      expect(!result.ok && result.problems[0]?.code, JSON.stringify(redirect)).toBe(
        "invalid-redirect",
      );
    }
  });
});
