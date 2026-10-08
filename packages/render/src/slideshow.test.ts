import { blocks, type ImageInput, type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";
import { SLIDESHOW_SCRIPT } from "./slideshow-script.js";

// The hero slideshow (hero-slideshow, site-rendering delta).

const photo = (src: string, alt: string): ImageInput => ({ src, alt, width: 1920, height: 1080 });

/** Punk Film in miniature: a slideshow of `count` projects on the home page. */
function site(count = 6): SiteDocument {
  const s = siteBuilder({ name: "PUNKFILM", lang: "en" });
  s.location({ street: "Veslařský ostrov 62", city: "Prague" });
  const projects = Array.from({ length: count }, (_, i) =>
    s.project({
      name: `Project ${i + 1}`,
      slug: `project-${i + 1}`,
      cover: photo(`p${i}.jpg`, "x"),
    }),
  );
  s.page({ title: "Home", slug: "home" }, [
    blocks.hero({
      heading: "Such a happy company for your movies",
      text: "Commercials, films and series.",
      image: photo("hero.jpg", "A still"),
      action: { label: "Our work", page: "work" },
      layout: "slideshow",
      slides: projects.map((item, i) => ({
        image: photo(`s${i}.jpg`, `Still ${i + 1}`),
        title: `Project ${i + 1}`,
        item,
      })),
    }),
  ]);
  s.page({ title: "Work", slug: "work", menu: true }, [blocks.projects()]);
  s.itemPages({ projects: "work" });
  return s.build();
}

function render(doc: SiteDocument) {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const page = (path: string) => result.site.pages.find((p) => p.path === path)?.html ?? "";
  return { page, scripts: result.site.scripts };
}

describe("hero slideshow", () => {
  it("Six projects: a carousel of slides, then the heading", () => {
    const { page, scripts } = render(site(6));
    const home = page("index.html");
    expect(home).toContain('<section class="block hero hero-slideshow">');
    expect(home).toContain(
      '<section class="slideshow" aria-roledescription="carousel" aria-label="Such a happy company for your movies" data-labels=',
    );
    const slides = [
      ...home.matchAll(
        /<li class="slide" role="group" aria-roledescription="slide" aria-label="(\d) of 6">/g,
      ),
    ];
    expect(slides.map((m) => m[1])).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(home).toContain('<p class="slide-title"><a href="/work/project-1/">Project 1</a></p>');
    // Only the first photo loads up front.
    expect(home.match(/class="slide-image"[^>]*loading="lazy"/g)).toHaveLength(5);
    expect(home.match(/<h1>/g)).toHaveLength(1);
    expect(home.indexOf("<h1>")).toBeGreaterThan(home.lastIndexOf('class="slide"'));
    expect(home).toContain('<script src="/assets/slideshow.js" defer></script>');
    expect(scripts).toEqual({ "slideshow.js": SLIDESHOW_SCRIPT });
    // The script's words are in the region, in the site's language.
    expect(home).toContain("&quot;previous&quot;:&quot;Previous slide&quot;");
  });

  it("One slide left: shows as a full photo, with no script", () => {
    const { page, scripts } = render(site(1));
    const home = page("index.html");
    expect(home).toContain('<section class="block hero hero-cover">');
    expect(home).not.toContain("slideshow");
    expect(scripts).toEqual({});
  });

  it("Slideshow script only with a slideshow", () => {
    const { page } = render(site(3));
    expect(page("work/index.html")).not.toContain("<script src=");
  });

  it("passes html-validate", async () => {
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(render(site(3)).page("index.html"));
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});
