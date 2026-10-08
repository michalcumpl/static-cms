import { blocks, type ImageInput, type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { RenderContext, type SiteLanguage } from "./context.js";
import { type RenderOptions, renderSite } from "./index.js";

// Projects, item pages and links to them (collection-pages, site-rendering delta).

const photo = (src: string, alt: string): ImageInput => ({ src, alt, width: 1600, height: 1000 });

interface Options {
  lang?: "cs" | "en";
  projectPages?: boolean;
  servicePages?: boolean;
  projectCount?: number;
  limit?: number;
  layout?: "cards" | "list" | "accordion";
}

/** Punk Film in miniature: projects under "Work", services under "Services". */
function site(options: Options = {}): SiteDocument {
  const en = (options.lang ?? "en") === "en";
  const s = siteBuilder({
    name: "Punk Film",
    lang: options.lang ?? "en",
    baseUrl: "https://punkfilm.cz",
  });
  s.location({ street: "Veslařský ostrov 62", city: "Praha", phone: "+420 776 853 699" });
  const film = s.projectCategory(en ? "Film & TV" : "Film a TV");
  s.project({
    name: en ? "The Last Race" : "Poslední závod",
    slug: en ? "the-last-race" : "posledni-zavod",
    category: film,
    summary: en ? "A true story of 1913." : "Skutečný příběh z roku 1913.",
    body: en
      ? "The drama.\n\n## The race\n\n- 1913\n- Giant Mountains"
      : "Drama.\n\n## Závod\n\n- 1913\n- Krkonoše",
    facts: [
      [en ? "Director" : "Režie", "Tomáš Hodan"],
      ["DOP", "Jan Baset Střítežský"],
    ],
    cover: photo("race.jpg", en ? "Skiers on the ridge" : "Lyžaři na hřebeni"),
    photos: Array.from({ length: 9 }, (_, i) => ({
      image: photo(`race-${i}.jpg`, `Still ${i + 1}`),
    })),
    video: "https://vimeo.com/697475416",
  });
  for (let i = 2; i <= (options.projectCount ?? 2); i++) {
    s.project({ name: `Commercial ${i}`, cover: photo(`c${i}.jpg`, `Commercial ${i}`) });
  }
  s.service({
    name: en ? "Labour law" : "Pracovní právo",
    slug: en ? "labour-law" : "pracovni-pravo",
    description: en ? "Contracts and disputes." : "Smlouvy a spory.",
    price: "2 000 Kč / h",
    page: "We advise on:\n\n- contracts\n- dismissals\n- disputes\n- collective bargaining\n- health and safety\n- audits",
  });
  s.service({ name: en ? "Real estate" : "Nemovitosti", slug: en ? "real-estate" : "nemovitosti" });
  s.page({ title: en ? "Home" : "Úvod", slug: en ? "home" : "uvod", menu: true }, [
    blocks.projects(en ? "Latest work" : "Nejnovější", { limit: options.limit ?? 0 }),
    blocks.services(en ? "Services" : "Služby", undefined, options.layout),
  ]);
  s.page({ title: en ? "Work" : "Práce", slug: en ? "work" : "prace", menu: true }, [
    blocks.projects("", { category: film }),
  ]);
  s.page({ title: en ? "Services" : "Služby", slug: en ? "services" : "sluzby", menu: true }, [
    blocks.services(),
  ]);
  s.itemPages({
    ...(options.projectPages === false ? {} : { projects: en ? "work" : "prace" }),
    ...(options.servicePages ? { services: en ? "services" : "sluzby" } : {}),
  });
  return s.build();
}

function render(doc: SiteDocument, options: RenderOptions = {}) {
  const result = renderSite(doc, options);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const page = (path: string) => {
    const found = result.site.pages.find((p) => p.path === path);
    if (!found) throw new Error(`no ${path}; pages: ${result.site.pages.map((p) => p.path)}`);
    return found.html;
  };
  return { page, paths: result.site.pages.map((p) => p.path) };
}

const section = (html: string, cls: string) => {
  const start = html.indexOf(`<section class="block ${cls}`);
  return start < 0 ? "" : html.slice(start, html.indexOf("</section>", start));
};

const validate = async (html: string) => {
  const report = await new HtmlValidate({
    extends: ["html-validate:recommended"],
    rules: { "doctype-style": "off" },
  }).validateString(html);
  return report.results.flatMap((r) => r.messages.map((m) => m.message));
};

describe("item routes", () => {
  it("puts each project under its listing page, after the document's pages", () => {
    const { paths } = render(site({ projectCount: 3 }));
    expect(paths).toEqual([
      "index.html",
      "work/index.html",
      "services/index.html",
      "work/the-last-race/index.html",
      "work/commercial-2/index.html",
      "work/commercial-3/index.html",
    ]);
  });

  it("gives no pages without a listing page", () => {
    const { paths } = render(site({ projectPages: false }));
    expect(paths).toEqual(["index.html", "work/index.html", "services/index.html"]);
  });
});

describe("projects block", () => {
  it("Tiles that link", () => {
    const work = section(render(site()).page("work/index.html"), "projects");
    expect(work).toMatch(
      /<a class="project-link" href="\/work\/the-last-race\/"><img class="project-cover" [^>]*alt="Skiers on the ridge"[^>]*loading="lazy">\s*<span class="project-name">The Last Race<\/span><\/a>/,
    );
    expect(work).toContain('<p class="project-category">Film &amp; TV</p>');
    // The category page shows only its category.
    expect(work).not.toContain("Commercial 2");
  });

  it("Latest four with a link to all", () => {
    const home = section(
      render(site({ projectCount: 30, limit: 4 })).page("index.html"),
      "projects",
    );
    expect(home.match(/<li class="project-tile">/g)).toHaveLength(4);
    expect(home).toContain('<p class="projects-more"><a href="/work/">All projects</a></p>');
  });

  it("No listing page", () => {
    const home = section(
      render(site({ projectPages: false, projectCount: 6, limit: 4 })).page("index.html"),
      "projects",
    );
    expect(home).not.toContain("<a ");
    expect(home).toContain('<div class="project-link">');
    expect(home).not.toContain("projects-more");
  });
});

describe("item pages", () => {
  it("Project page", async () => {
    const { page } = render(site(), { siteUrl: "https://punkfilm.cz" });
    const race = page("work/the-last-race/index.html");
    expect(race.match(/<h1[ >]/g)).toHaveLength(1);
    expect(race).toContain('<h1 class="page-title">The Last Race</h1>');
    expect(race).toMatch(
      /<dl class="project-facts">[\s\S]*<dt>Director<\/dt>\s*<dd>Tomáš Hodan<\/dd>[\s\S]*<dt>DOP<\/dt>/,
    );
    expect(race.match(/<li>\s*<figure>/g)).toHaveLength(9);
    // The Vimeo trailer plays on the page, with the cover as its poster, after a click.
    expect(race).toContain(
      '<figure class="video" data-embed="https://player.vimeo.com/video/697475416?dnt=1&amp;autoplay=1" data-title="The Last Race">',
    );
    expect(race).toContain('<a class="video-play" href="https://vimeo.com/697475416">');
    expect(race).toContain('<script src="/assets/video.js" defer></script>');
    expect(race).toContain('<p class="back-link"><a href="/work/">Work</a></p>');
    expect(race).toContain('<a href="/work/" aria-current="page">Work</a>');
    expect(race).toContain("<title>The Last Race – Punk Film</title>");
    expect(race).toContain('<meta name="description" content="A true story of 1913.">');
    expect(race).toContain('<link rel="canonical" href="https://punkfilm.cz/work/the-last-race/">');
    expect(race).toContain(
      '<meta property="og:image" content="https://punkfilm.cz/assets/images/race.jpg-share.jpg">',
    );
    // The trailer takes the cover's place at the top, the cover as its poster, not lazy.
    expect(race).not.toContain("project-page-cover");
    // The page's heading names the trailer; no title under it.
    expect(race).not.toContain('class="video-name"');
    expect(race).toMatch(/<img class="video-poster" [^>]*height="1000">/);
    expect(race.indexOf('class="video"')).toBeLessThan(race.indexOf('class="project-facts"'));
    expect(await validate(race)).toEqual([]);
    await expect(race).toMatchFileSnapshot("__snapshots__/items/project.html");
  });

  it("Service page with a scope list", async () => {
    const { page } = render(site({ servicePages: true }));
    const law = page("services/labour-law/index.html");
    expect(law).toContain('<h1 class="page-title">Labour law</h1>');
    expect(law).toContain("<p>We advise on:</p>");
    expect(law.match(/<li>[a-z]/g)).toHaveLength(6);
    expect(law).toContain('<meta name="description" content="Contracts and disputes.">');
    expect(law).toContain('<p class="service-price">2 000 Kč / h</p>');
    // Without a page text, the description stands in.
    expect(page("services/real-estate/index.html")).toContain('<a href="/services/">Services</a>');
    expect(await validate(law)).toEqual([]);
    await expect(law).toMatchFileSnapshot("__snapshots__/items/service.html");
  });

  it("Alternates between languages", () => {
    const cs = site({ lang: "cs" });
    const en = site({ lang: "en" });
    const languages = languagesOf([
      ["cs", cs, "/"],
      ["en", en, "/en/"],
    ]);
    const enRace = render(en, {
      basePath: "/en/",
      assetBasePath: "/",
      siteUrl: "https://punkfilm.cz",
      languages,
    }).page("work/the-last-race/index.html");
    expect(enRace).toContain(
      '<link rel="alternate" hreflang="cs" href="https://punkfilm.cz/prace/posledni-zavod/">',
    );
    expect(enRace).toContain(
      '<link rel="alternate" hreflang="en" href="https://punkfilm.cz/en/work/the-last-race/">',
    );
    // The language switcher leads to the same project.
    expect(enRace).toContain(
      '<a href="/prace/posledni-zavod/" lang="cs" hreflang="cs">Čeština</a>',
    );
  });

  it("Language without a listing page", () => {
    const cs = site({ lang: "cs" });
    const en = site({ lang: "en", projectPages: false });
    const languages = languagesOf([
      ["cs", cs, "/"],
      ["en", en, "/en/"],
    ]);
    const csRace = render(cs, { siteUrl: "https://punkfilm.cz", languages }).page(
      "prace/posledni-zavod/index.html",
    );
    expect(csRace).not.toContain('hreflang="en" href');
    expect(render(en, { basePath: "/en/", assetBasePath: "/", languages }).paths).not.toContain(
      "work/the-last-race/index.html",
    );
  });
});

describe("links from service cards", () => {
  it("Card links to its page", async () => {
    const home = render(site({ servicePages: true })).page("index.html");
    expect(section(home, "services")).toContain(
      '<p class="service-name"><a href="/services/labour-law/">Labour law</a></p>',
    );
    expect(await validate(home)).toEqual([]);
  });

  it("links an opened accordion row to the page", async () => {
    const home = render(site({ servicePages: true, layout: "accordion" })).page("index.html");
    expect(section(home, "services")).toContain(
      '<p class="service-more"><a href="/services/labour-law/">More about this service</a></p>',
    );
    expect(await validate(home)).toEqual([]);
  });

  it("Unchanged without pages", () => {
    const home = section(render(site()).page("index.html"), "services");
    expect(home).toContain('<p class="service-name">Labour law</p>');
  });
});

/** Every language as rendering sees it, each document's pages by translation key. */
function languagesOf(
  entries: [lang: string, doc: SiteDocument, basePath: string][],
): SiteLanguage[] {
  return entries.map(([lang, doc, basePath], i) => {
    const ctx = new RenderContext(doc, basePath);
    return {
      lang,
      name: lang === "cs" ? "Čeština" : "English",
      basePath,
      primary: i === 0,
      pages: ctx.translationUrls(),
      home: ctx.pageUrl(ctx.homeId),
    };
  });
}
