import type { Weekday } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { type PageContent, readPage, type Segment } from "./blocks.js";
import { ImageCollector } from "./images.js";
import { FIXTURE_ORIGINS, fixtureText } from "./testing.js";
import { externalTarget } from "./text.js";

// Structures the import maps to Webmio's blocks (import-existing-blocks spec, "Page content").

const agency = new URL(`${FIXTURE_ORIGINS.agency}/`);
/** The agency's pages the import read, and their new slugs. */
const IMPORTED = new Map([
  ["/zajezdy/chorvatsko/", "chorvatsko"],
  ["/zajezdy/italie/", "italie"],
  ["/zajezdy/recko/", "recko"],
  ["/zajezdy/rakousko/", "rakousko"],
  ["/kontakt/", "kontakt"],
]);
const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat"];

function read(
  html: string,
  { path = "/", hours = [] as Weekday[], base = agency } = {},
): PageContent & { images: ImageCollector } {
  const images = new ImageCollector();
  const page = readPage(html, {
    ctx: {
      base: new URL(path, base),
      link: (target) => {
        const slug = target.host === base.host ? IMPORTED.get(target.pathname) : undefined;
        return slug ? `page:${slug}` : externalTarget(base)(target);
      },
    },
    images,
    css: [],
    hero: path === "/",
    page: path,
    hoursDays: new Set(hours),
  });
  return { ...page, images };
}

const kinds = (segments: Segment[]) => segments.map((s) => s.kind);
const agencyPage = (path: string) => fixtureText("agency", path);

describe("cards", () => {
  it("A grid of cards: one cards block with each photo, title, sentence and link", () => {
    const home = read(agencyPage("/"));
    const cards = home.segments.find((s) => s.kind === "cards");
    expect(cards).toMatchObject({ kind: "cards", heading: "Kam vyrazit" });
    expect(cards?.kind === "cards" && cards.items.slice(0, 2)).toEqual([
      {
        image: { ref: `${agency.origin}/images/chorvatsko.jpg`, alt: "Záliv na ostrově Hvar" },
        title: "Chorvatsko",
        text: "Ostrovy, čistá voda a večery v přístavech.",
        link: "page:chorvatsko",
      },
      {
        image: { ref: `${agency.origin}/images/italie.jpg`, alt: "Stará pec v toskánské vesnici" },
        title: "Itálie",
        text: "Toskánsko pomalu, s vínem a starými městy.",
        link: "page:italie",
      },
    ]);
    // The grid's photos are the cards', not a gallery's.
    expect(kinds(home.segments)).not.toContain("gallery");
    expect(home.segments.filter((s) => s.kind === "cards")).toHaveLength(1);
  });

  it("Cards linking to pages not imported: no link, the rest kept", () => {
    const cards = read(agencyPage("/")).segments.find((s) => s.kind === "cards");
    expect(cards?.kind === "cards" && cards.items.slice(4).map((c) => [c.title, c.link])).toEqual([
      ["Tipy na léto", ""],
      ["Jak se balit", ""],
    ]);
  });

  it("keeps a story with three photos and subheadings as text and photos", () => {
    const story = (n: number) =>
      `<section class="part"><h3>Kapitola ${n}</h3><img src="/p${n}.jpg" alt="Foto ${n}" width="800"><p>${"Dlouhé vyprávění o tom, jak jsme začínali. ".repeat(8)}</p></section>`;
    const page = read(`<main><h1>Příběh</h1><div>${[1, 2, 3].map(story).join("")}</div></main>`);
    expect(kinds(page.segments)).not.toContain("cards");
  });

  it("splits a grid of 14 cards into blocks of 12 in the site", () => {
    const card = (n: number) =>
      `<div class="card"><img src="/c${n}.jpg" alt="" width="400"><h3>Karta ${n}</h3></div>`;
    const page = read(
      `<main><h1>Vše</h1><h2>Nabídka</h2><div class="grid">${Array.from({ length: 14 }, (_, i) => card(i + 1)).join("")}</div></main>`,
    );
    const cards = page.segments.find((s) => s.kind === "cards");
    expect(cards?.kind === "cards" && cards.items).toHaveLength(14);
  });

  it("reads a recognised element's contents only once, as the structure", () => {
    const home = read(agencyPage("/"));
    // No card's title or sentence is also a text, nor its photo an image of its own.
    const texts = home.segments.filter((s) => s.kind === "text").map((s) => JSON.stringify(s));
    expect(texts.join()).not.toContain("Chorvatsko");
    expect(texts.join()).not.toContain("Ostrovy");
  });
});

describe("key figures and steps", () => {
  it("Key figures: values with their labels", () => {
    const page = read(fixtureText("bakery", "/o-nas/"), {
      path: "/o-nas/",
      base: new URL(`${FIXTURE_ORIGINS.bakery}/`),
    });
    expect(page.segments.find((s) => s.kind === "figures")).toEqual({
      kind: "figures",
      heading: "",
      items: [
        { value: "100 let", label: "rodinné tradice" },
        { value: "10+", label: "druhů pečiva každé ráno" },
        { value: "6", label: "lidí v pekárně" },
      ],
    });
  });

  it("keeps seven figures as text: a block holds six", () => {
    const stat = (n: number) => `<div><strong>${n}</strong><span>věc číslo ${n}</span></div>`;
    const page = read(
      `<main><h1>Čísla</h1><div class="stats">${Array.from({ length: 7 }, (_, i) => stat(i + 1)).join("")}</div></main>`,
    );
    expect(kinds(page.segments)).not.toContain("figures");
  });

  it("How it works: an ordered list of bold-titled steps under a heading", () => {
    const page = read(fixtureText("bakery", "/nase-pecivo/"), {
      path: "/nase-pecivo/",
      base: new URL(`${FIXTURE_ORIGINS.bakery}/`),
    });
    expect(page.segments.at(-1)).toEqual({
      kind: "steps",
      heading: "Jak to funguje",
      items: [
        { title: "Objednáte si", text: "telefonem nebo e-mailem den předem." },
        { title: "Upečeme", text: "vaše pečivo brzy ráno." },
        { title: "Vyzvednete si", text: "ho v pekárně od šesti hodin." },
      ],
    });
  });

  it("How it works: headings numbered 1, 2, 3 with their texts", () => {
    const page = read(
      `<main><h1>Služba</h1><h2>Jak to funguje</h2><h3>1. Zavoláte nám</h3><p>Domluvíme termín.</p><h3>2. Přijedeme</h3><p>Vše změříme.</p><h3>3. Hotovo</h3></main>`,
    );
    expect(page.segments).toEqual([
      {
        kind: "steps",
        heading: "Jak to funguje",
        items: [
          { title: "Zavoláte nám", text: "Domluvíme termín." },
          { title: "Přijedeme", text: "Vše změříme." },
          { title: "Hotovo", text: "" },
        ],
      },
    ]);
  });

  it("keeps steps without a heading as a list", () => {
    const page = read(
      `<main><h1>Služba</h1><p>Úvod.</p><ol><li><strong>Zavoláte</strong> nám.</li><li><strong>Přijedeme</strong> k vám.</li></ol></main>`,
    );
    expect(page.segments).toEqual([
      { kind: "text", source: "Úvod.\n\n- **Zavoláte** nám.\n- **Přijedeme** k vám." },
    ]);
  });
});

describe("opening hours", () => {
  const contact = fixtureText("bakery", "/kontakt.html");
  const bakery = new URL(`${FIXTURE_ORIGINS.bakery}/`);

  it("Opening hours shown on the page: the hours block where the table was", () => {
    const page = read(contact, { path: "/kontakt.html", base: bakery, hours: WEEK });
    expect(page.segments.at(-1)).toEqual({ kind: "hours", heading: "Otevírací doba" });
  });

  it("Opening hours without structured data: the table stays text", () => {
    const page = read(contact, { path: "/kontakt.html", base: bakery });
    expect(kinds(page.segments)).not.toContain("hours");
    expect(JSON.stringify(page.segments)).toContain("Pondělí · 6:00–18:00");
  });

  it("keeps a timetable of other days as text", () => {
    const page = read(
      `<main><h1>Kurzy</h1><h2>Rozvrh</h2><ul><li>Sobota 9:00 jóga</li><li>Neděle 10:00 pilates</li><li>Pátek 18:00 strečink</li></ul></main>`,
      { hours: ["mon", "tue", "wed", "thu", "fri"] },
    );
    expect(kinds(page.segments)).not.toContain("hours");
  });
});

describe("maps and booking", () => {
  it("A map: a Google map naming a place, one naming none, and Mapy.cz", () => {
    const page = read(agencyPage("/kontakt/"), { path: "/kontakt/" });
    expect(page.segments.find((s) => s.kind === "map")).toEqual({
      kind: "map",
      heading: "",
      place: "https://www.google.com/maps/search/?api=1&query=Masarykova%2012%2C%20Brno",
    });
    expect(page.leftOut).toEqual([]);
    const pb = read(
      `<main><h1>Kontakt</h1><iframe src="https://www.google.com/maps/embed?pb=xyz"></iframe></main>`,
    );
    expect(pb.segments).toEqual([{ kind: "map", heading: "", place: "" }]);
    const mapy = read(
      `<main><h1>Kontakt</h1><iframe src="https://frame.mapy.cz/?x=16.6&amp;y=49.19&amp;z=17"></iframe></main>`,
    );
    expect(mapy.segments).toEqual([
      { kind: "map", heading: "", place: "https://mapy.cz/?x=16.6&y=49.19&z=17" },
    ]);
  });

  it("A booking widget: a call to action with its heading and sentence, not left out", () => {
    const home = read(agencyPage("/"));
    expect(home.segments.at(-1)).toEqual({
      kind: "booking",
      heading: "Rezervace",
      text: "Termín zájezdu si zarezervujete přímo v kalendáři.",
      label: "",
      url: "https://checkout.lodgify.com/cestovka-vlna/cs/#/123",
    });
    // The heading and sentence are the call to action's, not also a text's.
    expect(JSON.stringify(home.segments.slice(0, -1))).not.toContain("Rezervace");
    expect(home.leftOut).toEqual([]);
  });

  it("reads a link button to a booking service as a call to action", () => {
    const page = read(
      `<main><h1>Ubytování</h1><h2>Rezervace</h2><a class="button" href="https://www.booking.com/hotel/cz/vlna.html">Zarezervujte pobyt</a></main>`,
    );
    expect(page.segments).toEqual([
      {
        kind: "booking",
        heading: "Rezervace",
        text: "",
        label: "Zarezervujte pobyt",
        url: "https://www.booking.com/hotel/cz/vlna.html",
      },
    ]);
  });

  it("makes nothing of a widget only a script draws", () => {
    const page = read(
      `<main><h1>Rezervace</h1><div id="booking"></div><script src="https://widget.lodgify.com/x.js"></script></main>`,
    );
    expect(kinds(page.segments)).not.toContain("booking");
  });
});
