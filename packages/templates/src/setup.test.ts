import { BUSINESS_TYPES, validateSite } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { TEMPLATE_RELEASES } from "./registry.js";
import { SETUP_TYPES, type SetupAnswers, siteFromSetup } from "./setup.js";
import { STANDARD } from "./standard.js";

// The guided setup's answers and the site they make (guided-setup spec).

type Node = { id: string; type: string; [key: string]: unknown };
type List = { nodes: string[] };

const CAFE: SetupAnswers = {
  type: "cafe",
  name: "Kavárna U Mostu",
  sentence: "Výběrová káva a domácí dorty u Karlova mostu.",
  template: "standard",
  contact: {
    phone: "+420777123456",
    email: "ahoj@kavarnaumostu.cz",
    street: "Mostecká 12",
    postal_code: "118 00",
    city: "Praha",
    hours: {
      mon: [["08:00", "18:00"]],
      tue: [["08:00", "18:00"]],
      wed: [["08:00", "18:00"]],
      thu: [["08:00", "18:00"]],
      fri: [["08:00", "20:00"]],
      sat: [["09:00", "20:00"]],
    },
  },
  services: [
    {
      name: "Výběrová káva",
      description: "Espresso, filtr i alternativní přípravy.",
      price: "od 60 Kč",
    },
    { name: "Domácí dorty", description: "Pečeme každé ráno." },
    { name: "Snídaně", description: "Do 11 hodin." },
  ],
  logo: { key: "logo-1", alt: "Kavárna U Mostu" },
  photos: [
    { key: "photo-1", alt: "Kavárna u okna s výhledem na most" },
    { key: "photo-2", alt: "Dort s jahodami" },
    { key: "photo-3", alt: "Barista při přípravě kávy" },
  ],
  pages: ["home", "services", "about", "contact"],
};
const SIZES = new Map(
  ["logo-1", "photo-1", "photo-2", "photo-3"].map((key) => [key, { width: 1200, height: 800 }]),
);

function made(answers: SetupAnswers) {
  const doc = siteFromSetup(answers, STANDARD, "cs", SIZES) as unknown as {
    document_id: string;
    nodes: Record<string, Node>;
  };
  const site = doc.nodes[doc.document_id] as Node;
  const pages = (site.pages as List).nodes.map((id) => doc.nodes[id] as Node);
  const blocks = (page: Node | undefined) =>
    ((page?.blocks as List | undefined)?.nodes ?? []).map((id) => doc.nodes[id] as Node);
  const errors = validateSite(doc, { templates: TEMPLATE_RELEASES }).problems.filter(
    (p) => p.severity === "error",
  );
  return { doc, site, pages, blocks, errors };
}

describe("setup types", () => {
  it("map to the model's business types and suggest existing layouts, Home first", () => {
    const layouts = new Set(STANDARD.layouts.map((l) => l.id));
    for (const type of SETUP_TYPES) {
      expect(BUSINESS_TYPES, type.id).toContain(type.schemaType);
      expect(type.pages[0], type.id).toBe("home");
      for (const page of type.pages) expect(layouts.has(page), `${type.id}: ${page}`).toBe(true);
    }
    expect(SETUP_TYPES.map((t) => t.id)).toHaveLength(10);
  });
});

describe("the site the answers make", () => {
  it("Finishing the café: pages in the menu, services, hours, the main photo in the hero", () => {
    const { doc, site, pages, blocks, errors } = made(CAFE);
    expect(pages.map((p) => [p.title, p.slug])).toEqual([
      ["Úvod", "uvod"],
      ["Služby", "sluzby"],
      ["O nás", "o-nas"],
      ["Kontakt", "kontakt"],
    ]);
    expect(site.home_page_id).toBe(pages[0]?.id);
    const nav = doc.nodes[String(site.nav)] as Node;
    expect((nav.items as List).nodes.map((id) => doc.nodes[id]?.page_id)).toEqual(
      pages.map((p) => p.id),
    );
    expect(site.description).toBe("Výběrová káva a domácí dorty u Karlova mostu.");
    expect(
      (site.services as List).nodes.map(
        (id) => (doc.nodes[id]?.name as { content: string } | undefined)?.content,
      ),
    ).toEqual(["Výběrová káva", "Domácí dorty", "Snídaně"]);
    const business = doc.nodes[String(site.business)] as Node;
    expect(business.business_type).toBe("CafeOrCoffeeShop");
    const location = doc.nodes[(business.locations as List).nodes[0] ?? ""] as Node;
    expect(location).toMatchObject({
      street: "Mostecká 12",
      city: "Praha",
      phone: "+420777123456",
    });
    const open = (location.days as List).nodes
      .map((id) => doc.nodes[id] as Node)
      .filter((day) => (day.ranges as List).nodes.length > 0)
      .map((day) => day.day);
    expect(open).toEqual(["mon", "tue", "wed", "thu", "fri", "sat"]);
    const hero = blocks(pages[0]).find((b) => b.type === "hero") as Node;
    expect(doc.nodes[(hero.image as List).nodes[0] ?? ""]).toMatchObject({
      src: "photo-1",
      width: 1200,
      height: 800,
    });
    // The other photos in a gallery at the end of About us.
    const gallery = blocks(pages[2]).at(-1) as Node;
    expect(gallery.type).toBe("gallery");
    expect((gallery.items as List).nodes).toHaveLength(2);
    expect(doc.nodes[(site.logo as List).nodes[0] ?? ""]?.src).toBe("logo-1");
    expect(errors).toEqual([]);
  });

  it("hides the blocks of collections the answers leave empty", () => {
    const { pages, blocks } = made(CAFE);
    const shown = (page: Node | undefined) =>
      blocks(page).map((b) => `${b.type}${b.hidden ? " (hidden)" : ""}`);
    // Home shows testimonials, which the setup doesn't ask for; About us, the team.
    expect(shown(pages[0])).toContain("testimonials (hidden)");
    expect(shown(pages[0])).toContain("services");
    expect(shown(pages[2])).toContain("team (hidden)");
  });

  it("makes a valid site from only the type and name", () => {
    const { pages, blocks, errors } = made({ type: "hair", name: "Kadeřnictví Eva" });
    expect(pages.map((p) => p.slug)).toEqual(["uvod"]);
    expect(blocks(pages[0]).find((b) => b.type === "services")?.hidden).toBe(true);
    expect(errors).toEqual([]);
  });

  it("marks decorative photos so, without a description, and still valid", () => {
    const photos = (CAFE.photos ?? []).map((p) => ({ ...p, alt: "", decorative: true }));
    const { doc, pages, blocks, errors } = made({ ...CAFE, photos });
    const hero = blocks(pages[0]).find((b) => b.type === "hero") as Node;
    expect(doc.nodes[(hero.image as List).nodes[0] ?? ""]).toMatchObject({
      alt: "",
      decorative: true,
    });
    expect(errors).toEqual([]);
  });

  it("suggests every type's typical hours, valid and opening before closing", () => {
    for (const type of SETUP_TYPES) {
      const days = Object.values(type.hours).flat();
      expect(days.length, type.id).toBeGreaterThanOrEqual(5);
      for (const [opens, closes] of days) expect(opens < closes, type.id).toBe(true);
    }
  });

  it("puts the other photos in a gallery on Home without About us", () => {
    const { pages, blocks, errors } = made({ ...CAFE, pages: ["home", "contact"] });
    expect(pages.map((p) => p.slug)).toEqual(["uvod", "kontakt"]);
    expect(blocks(pages[0]).at(-1)?.type).toBe("gallery");
    expect(errors).toEqual([]);
  });

  it("gives the Contact page a Contact us form, to the business email", () => {
    const { pages, blocks, errors } = made(CAFE);
    const contact = pages.find((p) => p.slug === "kontakt");
    expect(blocks(contact).find((b) => b.type === "contact_form")).toMatchObject({
      form_kind: "contact",
      recipient: "",
    });
    expect(errors).toEqual([]);
  });

  it("names pages in English for an English site", () => {
    const doc = siteFromSetup(
      { type: "health", name: "Dr. Novak", pages: ["home", "team", "faq"] },
      STANDARD,
      "en",
    ) as unknown as {
      document_id: string;
      nodes: Record<string, Node>;
    };
    const site = doc.nodes[doc.document_id] as Node;
    expect((site.pages as List).nodes.map((id) => doc.nodes[id]?.title)).toEqual([
      "Home",
      "Team",
      "FAQ",
    ]);
  });
});
