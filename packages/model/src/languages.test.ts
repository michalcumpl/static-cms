import { describe, expect, it } from "vitest";
import { applySharedFields } from "./languages.js";
import { editableDemoSite, type LooseNodes } from "./testing.js";
import { validateSite } from "./validate/index.js";

const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const image = (id: string, src: string, alt = "") => ({
  id,
  type: "image",
  src,
  alt,
  decorative: false,
  width: 1200,
  height: 1200,
  focus_x: 50,
  focus_y: 50,
});

/** A Czech primary and an English copy of it (same node IDs), each editable. */
function languages() {
  const cs = editableDemoSite();
  const en = editableDemoSite();
  en.nodes.site_1.lang = "en";
  return { cs, en };
}

function setHours(nodes: LooseNodes, day: string, ranges: [string, string][], prefix: string) {
  const ids = ranges.map(([opens, closes], i) => {
    const id = `${prefix}_${day}_${i}`;
    nodes[id] = { id, type: "time_range", opens, closes };
    return id;
  });
  nodes[`day_${day}`].ranges = list(ids);
}

describe("applySharedFields", () => {
  it("takes the theme, AI switches and favicon from the primary", () => {
    const { cs, en } = languages();
    cs.nodes.theme_1.color_primary = "#123456";
    cs.nodes.site_1.allow_ai_training = false;
    cs.nodes.logo = image("logo", "logo-1a2b");
    cs.nodes.site_1.favicon = list(["logo"]);
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.theme_1.color_primary).toBe("#123456");
    expect(result.nodes.site_1).toMatchObject({ allow_ai_training: false, lang: "en" });
    expect(result.nodes.site_1.favicon.nodes).toEqual(["logo"]);
    expect(result.nodes.logo.src).toBe("logo-1a2b");
  });

  it("takes the logo and header switch, keeping the site name", () => {
    const { cs, en } = languages();
    cs.nodes.site_1.name = "Pekárna Kolín";
    cs.nodes.brand = image("brand", "pekarna-7c1e");
    cs.nodes.site_1.logo = list(["brand"]);
    cs.nodes.site_1.header_show_name = false;
    en.nodes.site_1.name = "Kolín Bakery";
    en.nodes.old_brand = image("old_brand", "old-1234");
    en.nodes.site_1.logo = list(["old_brand"]);
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.site_1).toMatchObject({ name: "Kolín Bakery", header_show_name: false });
    expect(result.nodes.site_1.logo.nodes).toEqual(["brand"]);
    expect(result.nodes.brand.src).toBe("pekarna-7c1e");
    expect(result.nodes.old_brand).toBeUndefined();
    expect(validateSite(result).problems).toEqual([]);
  });

  it("takes the business data and hours, keeping the name and hours note", () => {
    const { cs, en } = languages();
    cs.nodes.business_1.name = "Pekárna U Lípy";
    Object.assign(cs.nodes.location_1, {
      phone: "+420321123456",
      city: "Kolín",
      hours_note: "Ve svátky zavřeno",
    });
    setHours(cs.nodes, "mon", [["06:00", "17:00"]], "cs");
    en.nodes.business_1.name = "U Lípy Bakery";
    en.nodes.location_1.hours_note = "Closed on holidays";
    setHours(en.nodes, "mon", [["08:00", "12:00"]], "en");
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.business_1.name).toBe("U Lípy Bakery");
    expect(result.nodes.location_1).toMatchObject({
      phone: "+420321123456",
      city: "Kolín",
      hours_note: "Closed on holidays",
    });
    expect(result.nodes.day_mon.ranges.nodes).toEqual(["cs_mon_0"]);
    expect(result.nodes.cs_mon_0).toMatchObject({ opens: "06:00", closes: "17:00" });
    expect(result.nodes.en_mon_0).toBeUndefined();
    expect(validateSite(result).problems).toEqual([]);
  });

  it("keeps the other language's share image description while the image is the same", () => {
    const { cs, en } = languages();
    cs.nodes.share = image("share", "pult-3f9a", "Pult s chlebem");
    cs.nodes.site_1.share_image = list(["share"]);
    en.nodes.share = image("share", "pult-3f9a", "Bread on the counter");
    en.nodes.site_1.share_image = list(["share"]);
    const same = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(same.nodes.share).toMatchObject({ src: "pult-3f9a", alt: "Bread on the counter" });

    cs.nodes.share = image("share", "mapa-77aa", "Mapa");
    const changed = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(changed.nodes.share).toMatchObject({ src: "mapa-77aa", alt: "Mapa" });
  });

  it("keeps everything else per language", () => {
    const { cs, en } = languages();
    en.nodes.site_1.name = "U Lípy Bakery";
    en.nodes.site_1.description = "A family bakery";
    en.nodes.page_contact.title = "Contact";
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.site_1).toMatchObject({
      name: "U Lípy Bakery",
      description: "A family bakery",
    });
    expect(result.nodes.page_contact.title).toBe("Contact");
  });

  it("modifies neither input", () => {
    const { cs, en } = languages();
    cs.nodes.business_1.phone = "+420321123456";
    const before = structuredClone(en.doc);
    applySharedFields(cs.doc, en.doc);
    expect(en.doc).toEqual(before);
  });
});

describe("applySharedFields: collections", () => {
  const text = (content: string) => ({ content, marks: [], annotations: [] });
  const names = (doc: { nodes: LooseNodes }) =>
    doc.nodes.site_1.services.nodes.map((id: string) => doc.nodes[id].name.content);

  it("New service in Czech", () => {
    const { cs, en } = languages();
    cs.nodes.service_vanocka = {
      id: "service_vanocka",
      type: "service_item",
      name: text("Vánočka"),
      description: text(""),
      price: text(""),
      slug: "",
      body: { nodes: [], marks: [], annotations: [] },
    };
    cs.nodes.site_1.services.nodes.push("service_vanocka");
    const before = structuredClone(en.doc);
    const primaryBefore = structuredClone(cs.doc);
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(cs.doc).toEqual(primaryBefore);
    expect(names(result)).toEqual([
      "Kváskový chléb",
      "Rohlíky a housky",
      "Dorty na objednávku",
      "Vánočka",
    ]);
    expect(en.doc).toEqual(before);
    expect(validateSite(result).problems).toEqual([]);
  });

  it("Translated service keeps its translation", () => {
    const { cs, en } = languages();
    en.nodes.service_bread.name = text("Bread");
    cs.nodes.site_1.services.nodes = ["service_rolls", "service_cakes", "service_bread"];
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(names(result)).toEqual(["Rohlíky a housky", "Dorty na objednávku", "Bread"]);
  });

  it("Service deleted in Czech", () => {
    const { cs, en } = languages();
    en.nodes.ref_bread = { id: "ref_bread", type: "item_ref", item_id: "service_bread" };
    en.nodes.services_1.show = "chosen";
    en.nodes.services_1.chosen = list(["ref_bread"]);
    en.nodes.service_bread.name = text("Bread");
    cs.nodes.site_1.services.nodes = ["service_rolls", "service_cakes"];
    delete cs.nodes.service_bread;
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.service_bread).toBeUndefined();
    expect(result.nodes.ref_bread).toBeUndefined();
    expect(result.nodes.services_1.chosen.nodes).toEqual([]);
    expect(validateSite(result).problems.filter((p) => p.severity === "error")).toEqual([]);
  });

  it("drops an item only the other language has, with its marks", () => {
    const { cs, en } = languages();
    cs.nodes.site_1.services.nodes = ["service_bread", "service_rolls"];
    delete cs.nodes.service_cakes;
    delete cs.nodes.emphasis_cakes;
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.service_cakes).toBeUndefined();
    expect(result.nodes.emphasis_cakes).toBeUndefined();
    expect(validateSite(result).problems).toEqual([]);
  });

  it("takes an item's image from the primary, keeping the description while it's the same", () => {
    const { cs, en } = languages();
    for (const [doc, alt] of [
      [cs, "Jana Nováková"],
      [en, "Jana Novakova, baker"],
    ] as const) {
      doc.nodes.photo_jana = image("photo_jana", "jana-1a2b", alt);
      doc.nodes.person_jana = {
        id: "person_jana",
        type: "person",
        name: text(doc === cs ? "Jana" : "Jana (EN)"),
        role: text(""),
        text: text(""),
        image: list(["photo_jana"]),
      };
      doc.nodes.site_1.team = list(["person_jana"]);
    }
    let result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.photo_jana.alt).toBe("Jana Novakova, baker");
    expect(result.nodes.person_jana.name.content).toBe("Jana (EN)");
    cs.nodes.photo_jana = image("photo_jana_2", "jana-new", "Jana v pekárně");
    cs.nodes.photo_jana_2 = cs.nodes.photo_jana;
    delete cs.nodes.photo_jana;
    cs.nodes.person_jana.image = list(["photo_jana_2"]);
    result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.photo_jana).toBeUndefined();
    expect(result.nodes.photo_jana_2).toMatchObject({ src: "jana-new", alt: "Jana v pekárně" });
    expect(result.nodes.person_jana.image.nodes).toEqual(["photo_jana_2"]);
  });

  it("shares the social profiles", () => {
    const { cs, en } = languages();
    cs.nodes.social_ig = { id: "social_ig", type: "social_link", url: "https://instagram.com/p" };
    cs.nodes.business_1.social = list(["social_ig"]);
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.business_1.social.nodes).toEqual(["social_ig"]);
    expect(result.nodes.social_ig.url).toBe("https://instagram.com/p");
  });
});

describe("applySharedFields: locations", () => {
  const closedWeek = (nodes: LooseNodes, prefix: string) =>
    list(
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
        const id = `${prefix}_${day}`;
        nodes[id] = { id, type: "opening_day", day, ranges: list([]) };
        return id;
      }),
    );
  /** Adds the location "Kutná Hora" to a document, at the end of the business's list. */
  function addShop(nodes: LooseNodes, name = "Kutná Hora") {
    nodes.location_kh = {
      ...structuredClone(nodes.location_1),
      id: "location_kh",
      name,
      street: "Palackého 3",
      days: closedWeek(nodes, "kh"),
    };
    nodes.business_1.locations = list(["location_1", "location_kh"]);
  }

  it("Second shop in English: the primary's new location, with its name, until translated", () => {
    const { cs, en } = languages();
    cs.nodes.location_1.name = "Kolín";
    en.nodes.location_1.name = "Kolin";
    addShop(cs.nodes);
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.business_1.locations.nodes).toEqual(["location_1", "location_kh"]);
    expect(result.nodes.location_1.name).toBe("Kolin");
    expect(result.nodes.location_kh).toMatchObject({ name: "Kutná Hora", street: "Palackého 3" });
    expect(validateSite(result).problems).toEqual([]);
  });

  it("keeps a translated location name when the primary reorders its locations", () => {
    const { cs, en } = languages();
    addShop(cs.nodes);
    addShop(en.nodes, "Kutna Hora shop");
    cs.nodes.business_1.locations = list(["location_kh", "location_1"]);
    cs.nodes.location_kh.street = "Palackého 5";
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.business_1.locations.nodes).toEqual(["location_kh", "location_1"]);
    expect(result.nodes.location_kh).toMatchObject({
      name: "Kutna Hora shop",
      street: "Palackého 5",
    });
  });

  it("shows all locations in a block that chose one the primary removed", () => {
    const { cs, en } = languages();
    addShop(en.nodes);
    en.nodes.contact_kh = {
      id: "contact_kh",
      type: "contact",
      heading: { content: "Contact", marks: [], annotations: [] },
      show_address: true,
      show_phone: true,
      show_email: true,
      show_map: true,
      location_id: "location_kh",
    };
    en.nodes.page_contact.blocks.nodes.push("contact_kh");
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.location_kh).toBeUndefined();
    expect(result.nodes.kh_mon).toBeUndefined();
    expect(result.nodes.contact_kh.location_id).toBe("");
    expect(validateSite(result).problems.filter((p) => p.severity === "error")).toEqual([]);
  });
});

describe("applySharedFields: projects (collection-pages)", () => {
  const text = (content: string) => ({ content, marks: [], annotations: [] });

  /** "Poslední závod" with a cover, a photo and a fact, in both languages, listed under "Kontakt". */
  function withProject() {
    const { cs, en } = languages();
    for (const [doc, name, slug, label] of [
      [cs, "Poslední závod", "posledni-zavod", "Režie"],
      [en, "The Last Race", "the-last-race", "Director"],
    ] as const) {
      const nodes = doc.nodes;
      nodes.category_film = { id: "category_film", type: "project_category", name: text("Film") };
      nodes.cover_race = image("cover_race", "race.jpg", doc === cs ? "Plakát" : "Poster");
      nodes.photo_img = image("photo_img", "race-1.jpg", "Start");
      nodes.photo_1 = {
        id: "photo_1",
        type: "gallery_item",
        image: list(["photo_img"]),
        caption: text(doc === cs ? "Start" : "The start"),
      };
      nodes.fact_1 = { id: "fact_1", type: "fact", label: text(label), value: text("Tomáš Hodan") };
      nodes.project_race = {
        id: "project_race",
        type: "project",
        name: text(name),
        category_id: "category_film",
        summary: text(""),
        body: list([]),
        facts: list(["fact_1"]),
        cover: list(["cover_race"]),
        photos: list(["photo_1"]),
        video_url: "https://vimeo.com/697475416",
        slug,
      };
      nodes.site_1.project_categories = list(["category_film"]);
      nodes.site_1.projects = list(["project_race"]);
      nodes.site_1.projects_page_id = "page_contact";
    }
    return { cs, en };
  }

  it("Project translated to English", () => {
    const { cs, en } = withProject();
    cs.nodes.cover_race.src = "race-new.jpg";
    cs.nodes.project_race.video_url = "https://vimeo.com/1";
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.project_race).toMatchObject({
      name: { content: "The Last Race" },
      slug: "the-last-race",
      video_url: "https://vimeo.com/1",
    });
    expect(result.nodes.fact_1.label.content).toBe("Director");
    expect(result.nodes.photo_1.caption.content).toBe("The start");
    // A new cover in Czech: its description is the primary's until translated.
    expect(result.nodes.cover_race).toMatchObject({ src: "race-new.jpg", alt: "Plakát" });
    expect(result.nodes.site_1.projects_page_id).toBe("page_contact");
    expect(validateSite(result).problems).toEqual([]);
  });

  it("New project in Czech", () => {
    const { cs, en } = withProject();
    cs.nodes.project_mustang = {
      ...cs.nodes.project_race,
      id: "project_mustang",
      name: text("Mustang"),
      slug: "mustang",
      facts: list([]),
      photos: list([]),
      cover: list([]),
    };
    cs.nodes.site_1.projects.nodes.push("project_mustang");
    const before = structuredClone(en.doc);
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(en.doc).toEqual(before);
    expect(result.nodes.site_1.projects.nodes).toEqual(["project_race", "project_mustang"]);
    expect(result.nodes.project_mustang).toMatchObject({
      name: { content: "Mustang" },
      slug: "mustang",
    });
  });

  it("drops a category the primary deleted, from projects' blocks too", () => {
    const { cs, en } = withProject();
    en.nodes.projects_1 = {
      id: "projects_1",
      type: "projects",
      heading: text(""),
      show: "all",
      chosen: list([]),
      category_id: "category_film",
      limit: 0,
    };
    en.nodes.page_contact.blocks.nodes.push("projects_1");
    cs.nodes.site_1.project_categories = list([]);
    cs.nodes.project_race.category_id = "";
    delete cs.nodes.category_film;
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.category_film).toBeUndefined();
    expect(result.nodes.projects_1.category_id).toBe("");
    expect(result.nodes.project_race.category_id).toBe("");
    expect(validateSite(result).problems.filter((p) => p.severity === "error")).toEqual([]);
  });
});
