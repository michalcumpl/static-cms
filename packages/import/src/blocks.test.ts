import { describe, expect, it } from "vitest";
import { type PageContent, readPage } from "./blocks.js";
import { ImageCollector } from "./images.js";
import { FIXTURE_ORIGINS, fixtureText } from "./testing.js";
import { externalTarget } from "./text.js";

const bakery = new URL(`${FIXTURE_ORIGINS.bakery}/`);

function read(path: string, html = fixtureText("bakery", path)): PageContent {
  return readPage(html, {
    ctx: { base: new URL(path, bakery), link: externalTarget(bakery) },
    images: new ImageCollector(),
    css: [fixtureText("bakery", "/style.css")],
    hero: path === "/",
    page: path,
  });
}

describe("page content", () => {
  it("A text page: subheadings at levels 2 and 3, paragraphs and a list", () => {
    const { title, segments } = read("/nase-pecivo/");
    expect(title).toBe("Naše pečivo");
    expect(segments[0]).toEqual({
      kind: "text",
      source: [
        "## Naše pecivo",
        "Pečeme z mouky z mlýna v Herálci. Ceny označené \\* platí jen v sobotu, \\[akce\\] neplatí na dorty.",
        "Každé ráno je na pultu nejméně deset druhů pečiva.",
        "### Chléb",
        "- Žitný kváskový, 1 kg\n- Pšeničný s kmínem, 750 g",
      ].join("\n\n"),
    });
  });

  it("puts a photo beside its text when they sit side by side", () => {
    const { segments } = read("/nase-pecivo/");
    expect(segments[1]).toEqual({
      kind: "text_with_image",
      heading: "Rohlíky",
      body: "Rohlíky pečeme dvakrát denně, ráno v pět a odpoledne ve dvě, aby byly vždycky křupavé a voňavé.",
      image: { ref: `${FIXTURE_ORIGINS.bakery}/images/rohliky.jpg`, alt: "Rohlíky na plechu" },
      side: "left",
    });
  });

  it("reads a CSS background photo as the photo beside its section's text", () => {
    const banner = read("/").segments.find((s) => s.kind === "text_with_image");
    expect(banner).toMatchObject({
      heading: "Pec, která nevyhasíná",
      image: { ref: `${FIXTURE_ORIGINS.bakery}/images/pec.jpg`, alt: "" },
    });
  });

  it("makes a gallery, a logo row and a videos block, each headed by the heading before it", () => {
    const { segments } = read("/");
    const kinds = segments.map((s) => [s.kind, "heading" in s ? s.heading : ""]);
    expect(kinds.slice(2)).toEqual([
      ["text_with_image", "Pec, která nevyhasíná"],
      ["gallery", "Z pekárny"],
      ["logos", "Naši dodavatelé"],
      ["videos", "Jak pečeme"],
      ["faq", "Časté otázky"],
    ]);
    const gallery = segments.find((s) => s.kind === "gallery");
    expect(gallery?.kind === "gallery" && gallery.items.map((i) => i.caption)).toEqual([
      "Těsto kyne přes noc",
      "Chleby v peci",
      "Ranní pult",
    ]);
    const logos = segments.find((s) => s.kind === "logos");
    expect(logos?.kind === "logos" && logos.items[0]).toMatchObject({
      name: "Mlýn Herálec",
      url: "https://mlyn.example.cz/",
    });
    expect(segments.find((s) => s.kind === "videos")).toMatchObject({
      items: [{ url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Jak pečeme chléb" }],
    });
  });

  it("Questions: details as questions, where they were", () => {
    const faq = read("/").segments.at(-1);
    expect(faq).toEqual({
      kind: "faq",
      heading: "Časté otázky",
      items: [
        { question: "Pečete i o víkendu?", answer: "V sobotu ráno ano, v neděli máme zavřeno." },
        { question: "Dá se objednat dort?", answer: "Ano, nejpozději tři dny předem." },
        { question: "Máte bezlepkové pečivo?", answer: "Zatím ne, ale chystáme ho." },
      ],
    });
  });

  it("Questions from FAQPage structured data, at the page's end, without repeating details", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Pečete i o víkendu?", acceptedAnswer: { text: "Ano." } },
        {
          "@type": "Question",
          name: "Vozíte?",
          acceptedAnswer: { "@type": "Answer", text: "<p>Po Kutné Hoře *zdarma*.</p>" },
        },
      ],
    })}</script></head><body><main><h1>Otázky</h1>
      <details><summary>Pečete i o víkendu?</summary><p>Ano.</p></details><p>Text.</p></main></body></html>`;
    expect(read("/otazky/", html).segments.at(-1)).toEqual({
      kind: "faq",
      heading: "",
      items: [{ question: "Vozíte?", answer: "Po Kutné Hoře \\*zdarma\\*." }],
    });
  });

  it("takes the home page's first photo out for the hero", () => {
    const home = read("/");
    expect(home.heroImage).toEqual({
      ref: `${FIXTURE_ORIGINS.bakery}/images/chleb.jpg`,
      alt: "Bochník chleba na pultu",
    });
    expect(JSON.stringify(home.segments)).not.toContain("chleb.jpg");
  });

  it("A contact form: a Contact us form under its heading; the hidden email isn't read", () => {
    const contact = read("/kontakt.html");
    expect(contact.leftOut).toEqual([]);
    expect(contact.segments).toContainEqual({
      kind: "contact_form",
      heading: "Napište nám",
      text: "",
      formKind: "contact",
      button: "Odeslat zprávu",
    });
    expect(contact.segments).toContainEqual({ kind: "map", heading: "", place: "" });
    expect(JSON.stringify(contact.segments)).not.toContain("protected");
  });

  it("A newsletter sign-up: left out and reported", () => {
    const html = `<main><h1>Novinky</h1><form><input type="email" name="email" placeholder="Váš e-mail"><button>Odebírat</button></form></main>`;
    const page = read("/novinky/", html);
    expect(page.segments).toEqual([]);
    expect(page.leftOut).toEqual([{ reason: "form", page: "/novinky/", detail: "" }]);
  });

  it.each([
    ["a search", `<form role="search"><input name="q"><textarea name="message"></textarea></form>`],
    ["a login", `<form><input name="email" type="email"><input type="password"></form>`],
  ])("leaves out %s", (_name, form) => {
    const page = read("/", `<main><h1>Úvod</h1>${form}</main>`);
    expect(page.leftOut.map((l) => l.reason)).toEqual(["form"]);
  });

  it("reads a form asking only for a name and a phone as a callback request", () => {
    const html = `<main><h1>Konzultace</h1><p>Úvodní konzultace zdarma.</p><form>
      <label for="n">Vaše jméno</label><input id="n" name="n">
      <input type="tel" name="t" placeholder="Telefon">
      <input type="submit" value="Zavolejte mi"></form></main>`;
    expect(read("/konzultace/", html).segments).toEqual([
      { kind: "text", source: "Úvodní konzultace zdarma." },
      { kind: "contact_form", heading: "", text: "", formKind: "callback", button: "Zavolejte mi" },
    ]);
  });

  it("reads an image shown through an embed as an image, and other embeds as left out", () => {
    const html = `<main><h1>Služby</h1><embed type="image/svg+xml" data-src="/ikona.svg" alt=""><embed src="/prezentace.swf"></main>`;
    const page = read("/sluzby/", html);
    expect(page.segments).toEqual([
      {
        kind: "gallery",
        heading: "",
        items: [{ image: { ref: `${FIXTURE_ORIGINS.bakery}/ikona.svg`, alt: "" }, caption: "" }],
      },
    ]);
    expect(page.leftOut).toEqual([{ reason: "embed", page: "/sluzby/", detail: "embed" }]);
  });

  it("reads tables row by row, and skips scripts, icons and the header", () => {
    const html = `<body><header><h2>Menu</h2></header><main><h1>Ceník</h1><script>var x</script>
      <img src="/i.png" width="16" height="16" alt="ikona"><table><tr><th>Chléb</th><td>89 Kč</td></tr></table></main></body>`;
    expect(read("/cenik/", html).segments).toEqual([{ kind: "text", source: "Chléb · 89 Kč" }]);
  });

  it("never skips a heading level: the first subheading is a main one", () => {
    const html = "<main><h1>O nás</h1><h3>Příběh</h3><p>Text.</p><h2>Tým</h2><p>Lidé.</p></main>";
    expect(read("/o-nas/", html).segments).toEqual([
      { kind: "text", source: "## Příběh\n\nText." },
      { kind: "text", source: "## Tým\n\nLidé." },
    ]);
  });
});
