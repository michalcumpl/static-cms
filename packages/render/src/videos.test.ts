import { blocks, type ImageInput, type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";
import { VIDEO_SCRIPT } from "./video-script.js";

// Videos, played only when the visitor asks (video, site-rendering delta).

const photo = (src: string, alt: string): ImageInput => ({ src, alt, width: 1280, height: 720 });

/** Aniděti in miniature: a films page with `count` videos, and a contact page without any. */
function site(count = 1, project?: string): SiteDocument {
  const s = siteBuilder({ name: "Atelier Aniděti", lang: "cs" });
  s.location({ street: "Tylišovská 771/3", city: "Praha 6" });
  const films = [
    ["https://www.youtube.com/watch?v=wNdrFte2T4w", "Medvídku, vypravuj!"],
    ["https://youtu.be/GIN7sl9hRvg", "Viktoria"],
    ["https://vimeo.com/697475416", "Poslední závod"],
  ];
  if (project)
    s.project({
      name: "Poslední závod",
      slug: "zavod",
      video: project,
      cover: photo("c.jpg", "Závod"),
    });
  s.page({ title: "Filmy", slug: "filmy" }, [
    blocks.videos({
      heading: "Filmy",
      items: films.slice(0, count).map(([url, title], i) => ({
        url: url as string,
        title: title as string,
        caption: i === 0 ? "Příběh Doris Grozdanovičové" : undefined,
        poster: i === 0 ? photo("medvidek.jpg", "Medvídek") : undefined,
      })),
    }),
  ]);
  s.page({ title: "Kontakt", slug: "kontakt" }, [blocks.contact()]);
  if (project) s.itemPages({ projects: "kontakt" });
  return s.build();
}

function render(doc: SiteDocument) {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const page = (path: string) => result.site.pages.find((p) => p.path === path)?.html ?? "";
  return { page, script: result.site.scripts["video.js"] };
}

describe("videos", () => {
  it("A film before play: a link with the poster, nothing from YouTube loaded", () => {
    const { page } = render(site());
    const films = page("index.html");
    expect(films).toContain(
      '<figure class="video" data-embed="https://www.youtube-nocookie.com/embed/wNdrFte2T4w?autoplay=1" data-title="Medvídku, vypravuj!">',
    );
    expect(films).toMatch(
      /<a class="video-play" href="https:\/\/www.youtube.com\/watch\?v=wNdrFte2T4w"><img class="video-poster" [^>]*alt=""[^>]*loading="lazy"><span class="video-label">Přehrát: Medvídku, vypravuj!<\/span><\/a>/,
    );
    expect(films).toContain('<span class="video-source">Přehraje se z YouTube</span>');
    // The title shows under the poster too, then the caption.
    expect(films).toContain(
      '<figcaption><span class="video-name">Medvídku, vypravuj!</span><span class="video-caption">Příběh Doris Grozdanovičové</span>',
    );
    expect(films).not.toContain("<iframe");
    // No provider address is fetched: none in any src or srcset.
    for (const m of films.matchAll(/(?:src|srcset)="([^"]*)"/g)) {
      expect(m[1]).not.toMatch(/youtube|ytimg|vimeo/);
    }
  });

  it("Several videos: columns by number, each with its title under it", () => {
    const films = render(site(3)).page("index.html");
    expect(films).toContain('<ul class="video-list card-columns-3">');
    expect(films.match(/<a class="video-play"/g)).toHaveLength(3);
    expect(films).toContain('<span class="video-name">Viktoria</span>');
    expect(films.match(/<span class="video-name">/g)).toHaveLength(3);
    expect(films).toContain('<span class="video-source">Přehraje se z Vimeo</span>');
  });

  it("Script only with a video", () => {
    const { page, script } = render(site());
    expect(page("index.html").match(/<script src=/g)).toEqual(["<script src="]);
    expect(page("index.html")).toContain('<script src="/assets/video.js" defer></script>');
    expect(page("kontakt/index.html")).not.toContain("<script src=");
    expect(script).toBe(VIDEO_SCRIPT);
  });

  it("plays a project's YouTube or Vimeo trailer, and links to anything else", () => {
    const vimeo = render(site(1, "https://vimeo.com/697475416"));
    expect(vimeo.page("kontakt/zavod/index.html")).toContain(
      'data-embed="https://player.vimeo.com/video/697475416?dnt=1&amp;autoplay=1"',
    );
    const other = render(site(1, "https://www.csfd.cz/film/123/"));
    const zavod = other.page("kontakt/zavod/index.html");
    expect(zavod).toContain(
      '<a class="button" href="https://www.csfd.cz/film/123/">Přehrát video</a>',
    );
    expect(zavod).not.toContain("<script src=");
  });

  it("passes html-validate", async () => {
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(render(site(3)).page("index.html"));
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});

describe("the video script", () => {
  /** Runs the script against a fake document holding one figure, and clicks its link. */
  function press(embed: string) {
    let listener: ((event: unknown) => void) | undefined;
    const replaced: Record<string, unknown>[] = [];
    const figure = {
      getAttribute: (name: string) =>
        ({ "data-embed": embed, "data-title": 'Medvídku, <b>"vypravuj"</b>' })[name] ?? null,
    };
    const link = {
      closest: (selector: string) => (selector === ".video-play" ? link : figure),
      replaceWith: (node: Record<string, unknown>) => replaced.push(node),
    };
    const document = {
      addEventListener: (_type: string, fn: (event: unknown) => void) => {
        listener = fn;
      },
      createElement: () => ({ focus() {} }) as Record<string, unknown>,
    };
    new Function("document", VIDEO_SCRIPT)(document);
    let prevented = false;
    listener?.({ target: link, preventDefault: () => (prevented = true) });
    return { frame: replaced[0], prevented };
  }

  it("Press play: swaps the link for the player, titled with the video", () => {
    const { frame, prevented } = press(
      "https://www.youtube-nocookie.com/embed/wNdrFte2T4w?autoplay=1",
    );
    expect(prevented).toBe(true);
    expect(frame).toMatchObject({
      src: "https://www.youtube-nocookie.com/embed/wNdrFte2T4w?autoplay=1",
      // The title is a property, never parsed as HTML.
      title: 'Medvídku, <b>"vypravuj"</b>',
      allowFullscreen: true,
      className: "video-frame",
    });
  });

  it("leaves the link alone for any other player address", () => {
    const { frame, prevented } = press("https://evil.example/embed/x");
    expect(frame).toBeUndefined();
    expect(prevented).toBe(false);
  });
});
