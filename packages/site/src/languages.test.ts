import { describe, expect, it } from "vitest";
import { applySharedFields } from "./languages.js";
import { editableDemoSite, type LooseNodes } from "./test/fixtures.js";
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

  it("takes the business data and hours, keeping the name and hours note", () => {
    const { cs, en } = languages();
    Object.assign(cs.nodes.business_1, {
      phone: "+420321123456",
      city: "Kolín",
      name: "Pekárna U Lípy",
      hours_note: "Ve svátky zavřeno",
    });
    setHours(cs.nodes, "mon", [["06:00", "17:00"]], "cs");
    Object.assign(en.nodes.business_1, { name: "U Lípy Bakery", hours_note: "Closed on holidays" });
    setHours(en.nodes, "mon", [["08:00", "12:00"]], "en");
    const result = applySharedFields(cs.doc, en.doc) as unknown as { nodes: LooseNodes };
    expect(result.nodes.business_1).toMatchObject({
      phone: "+420321123456",
      city: "Kolín",
      name: "U Lípy Bakery",
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
