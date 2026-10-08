import { describe, expect, it } from "vitest";
import { blocks, siteBuilder } from "./builder.js";
import { validateSite } from "./index.js";

// The site builder (example-sites design decision 1).

const image = (src: string) => ({ src, alt: `Photo ${src}`, width: 800, height: 600 });

/** A two-page site using every block type, with texts in `lang`. */
function everything(lang: "cs" | "en") {
  const t = (cs: string, en: string) => (lang === "cs" ? cs : en);
  const site = siteBuilder({ name: "Aniděti", lang, baseUrl: "https://example.org" });
  site.theme({ preset: "Garden", radius: "1rem" });
  site.business({ type: "LocalBusiness", social: ["https://www.facebook.com/anideti"] });
  const main = site.location({
    name: "Atelier",
    street: "Tylišovská 3",
    postal_code: "160 00",
    city: t("Praha", "Prague"),
    phone: "+420 608 172 330",
    email: "info@example.org",
    hours: {
      mon: [["14:00", "18:00"]],
      wed: [
        ["9:00", "12:00"],
        ["13:00", "17:00"],
      ],
    },
  });
  site.logo({ src: "logo.png", decorative: true, width: 200, height: 80 });
  const course = site.service({
    name: t("Animace", "Animation"),
    description: t("Pro děti **6–12** let.", "For children **6–12**."),
    price: "4 500 Kč",
  });
  site.service({
    name: t("Výtvarka", "Art"),
    price: "4 000 Kč",
    page: t(
      "Malujeme.\n\n## Co se naučíte\n\n- kresbu\n- malbu",
      "We paint.\n\n## What you learn\n\n- drawing\n- painting",
    ),
  });
  const films = site.projectCategory(t("Filmy", "Films"));
  site.projectCategory(t("Výstavy", "Exhibitions"));
  site.project({
    name: t("Poslední závod", "The Last Race"),
    category: films,
    summary: t("Skutečný příběh.", "A true story."),
    body: t("Drama o závodu.\n\n- 1913\n- Krkonoše", "A drama.\n\n- 1913\n- Giant Mountains"),
    facts: [[t("Režie", "Director"), "Tomáš Hodan"]],
    cover: image("race.jpg"),
    photos: [{ image: image("race-1.jpg"), caption: t("Start", "The start") }],
    video: "https://vimeo.com/697475416",
  });
  site.project({ name: t("Poslední závod", "The Last Race"), cover: image("race-2.jpg") });
  site.itemPages({ services: "kontakt", projects: "kontakt" });
  site.person({ name: "Kateřina", role: t("Lektorka", "Teacher"), image: image("kaca.jpg") });
  site.testimonial({ quote: t("Skvělé!", "Great!"), name: "Petra", detail: t("maminka", "a mum") });
  site.faq({
    question: t("Kde?", "Where?"),
    answer: t("V [ateliéru](page:kontakt).", "In the [studio](page:kontakt)."),
  });
  site.page({ title: t("Úvod", "Home"), slug: t("uvod", "home"), menu: true }, [
    blocks.hero({
      layout: "slideshow",
      heading: t("Animujeme", "We animate"),
      text: t("Už *deset* let.", "For *ten* years."),
      image: image("hero.jpg"),
      action: { label: t("Kontakt", "Contact"), page: "kontakt" },
      slides: [
        { image: image("s1.jpg"), title: t("Závod", "The race"), item: "project_1" },
        { image: image("s2.jpg"), title: "Kontakt", page: "kontakt" },
      ],
    }),
    blocks.text(
      t(
        "## Kroužky\n\nPrvní **odstavec** a [odkaz](https://example.org).\n\n- jedna\n- dvě",
        "## Clubs\n\nA first **paragraph** and a [link](https://example.org).\n\n- one\n- two",
      ),
    ),
    blocks.textWithImage({ heading: "Atelier", body: t("Text.", "Text."), image: image("a.jpg") }),
    blocks.gallery({
      heading: t("Fotky", "Photos"),
      items: [{ image: image("g1.jpg"), caption: "1" }],
      imageFit: "whole",
    }),
    blocks.logos({
      items: [{ image: image("cena.png"), name: "Cena", url: "https://example.org" }],
    }),
    blocks.services(t("Nabídka", "Offer")),
    blocks.services(t("Doporučujeme", "Highlights"), [course], "accordion"),
    blocks.services(t("Seznam", "List"), undefined, "list"),
    blocks.team(t("Lektorky", "Teachers"), undefined, "list"),
    blocks.testimonials(t("Reference", "Testimonials")),
    blocks.faq(t("Otázky", "Questions")),
    blocks.figures({
      heading: t("V číslech", "In numbers"),
      items: [
        { value: "10+", label: t("let", "years") },
        { value: "40+", label: t("zemí", "countries") },
      ],
    }),
    blocks.steps({
      heading: t("Jak to funguje", "How it works"),
      items: [
        { title: t("Přihláška", "Sign up"), text: t("Napište **nám**.", "Write to **us**.") },
        { title: "Start" },
      ],
    }),
    blocks.projects(t("Práce", "Work"), { category: films, limit: 4 }),
    blocks.videos({
      heading: t("Filmy", "Films"),
      items: [
        {
          url: "https://youtu.be/wNdrFte2T4w",
          title: t("Medvídku", "Teddy"),
          poster: image("v.jpg"),
        },
        { url: "https://vimeo.com/697475416", title: "Trailer", caption: "2022" },
      ],
    }),
    blocks.cards({
      heading: t("Projekty", "Projects"),
      look: "over",
      items: [
        { image: image("tile.jpg"), title: t("Kontakt", "Contact"), page: "kontakt" },
        { title: t("Závod", "The race"), text: "**1913**", item: "project_1" },
        { title: "Web", url: "https://example.org" },
      ],
    }),
    blocks.jobs({
      heading: t("Volné pozice", "Jobs"),
      note: t("Teď nikoho nehledáme.", "We aren't hiring right now."),
      items: [
        {
          title: t("Lektor/ka", "Teacher"),
          summary: t("Na kroužky animace.", "For the animation clubs."),
          body: t("## Co nabízíme\n\n- přátelský tým", "## We offer\n\n- a friendly team"),
          contact: { name: "Jana", email: "jana@example.org", phone: "+420777294579" },
        },
        { title: t("Produkční", "Producer") },
      ],
    }),
    blocks.callToAction({
      heading: t("Přihlaste se", "Sign up"),
      actions: [{ label: "Web", url: "https://example.org" }],
    }),
  ]);
  site.menuGroup(t("Více", "More"), [{ label: "Web", url: "https://example.org" }]);
  site.page({ title: "Kontakt", slug: "kontakt", menu: t("Kontakt", "Contact") }, [
    blocks.contact({ heading: "Kontakt", location: main }),
    blocks.openingHours(t("Otevřeno", "Opening hours")),
  ]);
  return site.build();
}

describe("siteBuilder", () => {
  it("builds a site with every block type that has no validation errors", () => {
    const doc = everything("cs");
    const errors = validateSite(doc).problems.filter((p) => p.severity === "error");
    expect(errors).toEqual([]);
    const types = new Set(Object.values(doc.nodes).map((n) => n.type));
    for (const type of [
      "hero",
      "rich_text",
      "text_with_image",
      "gallery",
      "logos",
      "services",
      "team",
      "testimonials",
      "faq",
      "contact",
      "opening_hours",
      "call_to_action",
      "figures",
      "steps",
      "projects",
      "cards",
      "videos",
      "menu_group",
      "jobs",
    ]) {
      expect(types, type).toContain(type);
    }
  });

  it("writes a slideshow hero with linked slides", () => {
    const nodes = everything("cs").nodes as unknown as Record<string, Record<string, unknown>>;
    expect(nodes.hero_1).toMatchObject({
      layout: "slideshow",
      slides: { nodes: ["slide_1", "slide_2"] },
    });
    expect(nodes.slide_1).toMatchObject({ target_id: "project_1", url: "" });
  });

  it("gives services and projects addresses made from their names, unique, once they have pages", () => {
    const doc = everything("cs");
    const nodes = doc.nodes as unknown as Record<string, Record<string, unknown>>;
    const site = nodes.site_1 as { services_page_id: string; projects_page_id: string };
    expect(site.services_page_id).toBe(site.projects_page_id);
    expect(nodes[site.projects_page_id]).toMatchObject({ slug: "kontakt" });
    expect([nodes.service_1?.slug, nodes.service_2?.slug]).toEqual(["animace", "vytvarka"]);
    expect([nodes.project_1?.slug, nodes.project_2?.slug]).toEqual([
      "posledni-zavod",
      "posledni-zavod-2",
    ]);
    expect(nodes.project_1).toMatchObject({ video_url: "https://vimeo.com/697475416" });
  });

  it("gives the same IDs to the same site in another language, and pairs its pages", () => {
    const cs = everything("cs");
    const en = everything("en");
    expect(Object.keys(en.nodes).sort()).toEqual(Object.keys(cs.nodes).sort());
    const page = (doc: typeof cs, id: string) => doc.nodes[id] as { translation_key: string };
    expect(page(en, "page_1").translation_key).toBe(page(cs, "page_1").translation_key);
  });

  it("turns the inline syntax into marks counted in graphemes", () => {
    const doc = everything("cs");
    const hero = Object.values(doc.nodes).find((n) => n.type === "hero") as unknown as {
      text: {
        content: string;
        marks: { start_offset: number; end_offset: number; node_id: string }[];
      };
    };
    expect(hero.text.content).toBe("Už deset let.");
    expect(hero.text.marks).toEqual([expect.objectContaining({ start_offset: 3, end_offset: 8 })]);
    expect(doc.nodes[hero.text.marks[0]?.node_id ?? ""]?.type).toBe("emphasis");
    const faq = Object.values(doc.nodes).find((n) => n.type === "faq_item") as unknown as {
      answer: { marks: { node_id: string }[] };
    };
    expect(doc.nodes[faq.answer.marks[0]?.node_id ?? ""]).toMatchObject({
      type: "internal_link",
      page_id: "page_2",
    });
  });

  it("puts menu pages in the nav and makes the first page home", () => {
    const doc = everything("en");
    const site = doc.nodes.site_1 as unknown as { home_page_id: string; nav: string };
    expect(site.home_page_id).toBe("page_1");
    const nav = doc.nodes[site.nav] as unknown as { items: { nodes: string[] } };
    expect(nav.items.nodes.map((id) => doc.nodes[id]?.type)).toEqual([
      "page_link",
      "menu_group",
      "page_link",
    ]);
  });

  it("groups menu pages by slug, labelled as in the menu", () => {
    const site = siteBuilder({ name: "Scénografie", lang: "cs", description: "Scénografie." });
    site.location({ street: "Na Pankráci 1", city: "Praha" });
    site.page({ title: "Úvod", slug: "uvod", menu: true }, []);
    site.menuGroup("Projekty", ["eventy", "vystavy"]);
    site.page({ title: "Eventy", slug: "eventy" }, []);
    site.page({ title: "Výstavy", slug: "vystavy", menu: "Výstavy a veletrhy" }, []);
    site.page({ title: "Kontakt", slug: "kontakt", menu: true }, []);
    const doc = site.build();
    const nodes = doc.nodes as unknown as Record<string, Record<string, unknown>>;
    const group = Object.values(nodes).find((n) => n.type === "menu_group") as {
      items: { nodes: string[] };
    };
    expect(
      group.items.nodes.map((id) => (nodes[id] as { label: { content: string } }).label.content),
    ).toEqual(["Eventy", "Výstavy a veletrhy"]);
    const nav = nodes[(nodes.site_1 as { nav: string }).nav] as { items: { nodes: string[] } };
    expect(nav.items.nodes.map((id) => nodes[id]?.type)).toEqual([
      "page_link",
      "menu_group",
      "page_link",
    ]);
    expect(validateSite(doc).problems).toEqual([]);
  });
});
