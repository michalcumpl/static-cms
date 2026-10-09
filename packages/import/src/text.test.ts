import { blocks, siteBuilder } from "@webmio/model";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { externalTarget, type InlineContext, inlineText } from "./text.js";

const base = new URL("https://pekarna-ulipy.cz/");
const ctx: InlineContext = {
  base,
  link: (url) =>
    url.pathname === "/nase-pecivo/" ? "page:nase-pecivo" : externalTarget(base)(url),
};
const text = (html: string) => inlineText(load(`<p>${html}</p>`)("p"), ctx);

/** What the builder makes of a text: its content, and its marks as [start, end, type]. */
function built(source: string) {
  const site = siteBuilder({ name: "Pekárna", lang: "cs" });
  site.page({ title: "Naše pečivo", slug: "nase-pecivo" }, [blocks.text(source)]);
  const doc = site.build();
  type Mark = { start_offset: number; end_offset: number; node_id: string };
  const nodes = doc.nodes as unknown as Record<
    string,
    { type: string; content?: { content: string; marks: Mark[] } }
  >;
  const paragraph = Object.values(nodes).find((n) => n.type === "paragraph")?.content;
  if (!paragraph) throw new Error("no paragraph");
  return {
    content: paragraph.content,
    marks: paragraph.marks.map((m) => [m.start_offset, m.end_offset, nodes[m.node_id]?.type]),
  };
}

describe("imported texts", () => {
  it("keeps bold, italic and links, and joins white space", () => {
    const source = text(
      'Každý den <strong>kváskový chléb</strong>,\n  rohlíky. Dorty <em>na objednávku</em>, viz <a href="https://mlyn.example.cz/">mlýn</a>.',
    );
    expect(source).toBe(
      "Každý den **kváskový chléb**, rohlíky. Dorty *na objednávku*, viz [mlýn](https://mlyn.example.cz/).",
    );
    expect(built(source)).toEqual({
      content: "Každý den kváskový chléb, rohlíky. Dorty na objednávku, viz mlýn.",
      marks: [
        [10, 24, "strong"],
        [41, 54, "emphasis"],
        [60, 64, "link"],
      ],
    });
  });

  it("links an imported page to its new page, and drops links to the old site's other pages", () => {
    const source = text(
      'V <a href="/nase-pecivo/">pečivu</a> a v <a href="/stary-cenik/">ceníku</a>.',
    );
    expect(source).toBe("V [pečivu](page:nase-pecivo) a v ceníku.");
    expect(built(source).marks).toEqual([[2, 8, "internal_link"]]);
  });

  it("keeps literal asterisks, brackets and parentheses as text", () => {
    const source = text("Ceny označené * platí jen v sobotu, [akce] (mimo dorty).");
    expect(built(source)).toEqual({
      content: "Ceny označené * platí jen v sobotu, [akce] (mimo dorty).",
      marks: [],
    });
  });

  it("keeps a link whose address has parentheses, and drops unsafe ones", () => {
    const source = text(
      '<a href="https://cs.wikipedia.org/wiki/Chléb_(potravina)">chléb</a> <a href="javascript:alert(1)">x</a>',
    );
    expect(built(source).marks).toEqual([[0, 5, "link"]]);
    expect(built(source).content).toBe("chléb x");
  });

  it("keeps one level of marks: the outer one", () => {
    expect(text('<strong>Kontakt: <a href="tel:+420321123456">321 123 456</a></strong>')).toBe(
      "**Kontakt: 321 123 456**",
    );
    expect(text('<a href="mailto:info@pekarna.cz"><strong>Napište</strong></a>')).toBe(
      "[Napište](mailto:info@pekarna.cz)",
    );
  });
});
