import { slugify, uniqueSlug } from "./slug.js";

type RawNode = { type?: unknown; [key: string]: unknown };
type RawDoc = { document_id: string; nodes: Record<string, RawNode> };

/**
 * Upgrades a stored site document to the current schema version, one version at a time.
 * Version 2 names the home page and gives every page a slug; version 3 adds the site's
 * description, favicon, share image and AI crawler switches, and each page's share image;
 * version 4 adds the business details, empty, with every day closed; version 5 gives every page
 * a translation key, its own ID; version 6 turns the theme's font lists into catalog fonts and
 * adds the site's logo (none) and header switch (name shown); version 7 lifts the items of
 * services, team and testimonials blocks into the site's collections, which the blocks then show
 * (all, or the items they chose), and adds the FAQ collection and social profiles, empty;
 * version 8 moves the business's contact details and opening hours into its one location, and
 * lets contact and opening hours blocks show all locations.
 * Anything that isn't a site of an older version is returned unchanged, for validation to
 * judge. The input is not modified.
 */
export function migrateSite(doc: unknown): unknown {
  if (!isObject(doc) || typeof doc.document_id !== "string" || !isObject(doc.nodes)) return doc;
  let current = doc as RawDoc & Record<string, unknown>;
  if (siteOf(current)?.schema_version === 1) current = toVersion2(current);
  if (siteOf(current)?.schema_version === 2) current = toVersion3(current);
  if (siteOf(current)?.schema_version === 3) current = toVersion4(current);
  if (siteOf(current)?.schema_version === 4) current = toVersion5(current);
  if (siteOf(current)?.schema_version === 5) current = toVersion6(current);
  if (siteOf(current)?.schema_version === 6) current = toVersion7(current);
  if (siteOf(current)?.schema_version === 7) current = toVersion8(current);
  return current;
}

function siteOf(doc: RawDoc): RawNode | undefined {
  const site = doc.nodes[doc.document_id];
  return isObject(site) && site.type === "site" ? site : undefined;
}

function pageIdsOf(site: RawNode): unknown[] {
  return isObject(site.pages) && Array.isArray(site.pages.nodes) ? site.pages.nodes : [];
}

/** Version 1 made the first page home, with an empty slug. */
function toVersion2<T extends RawDoc>(doc: T): T {
  const nodes = doc.nodes;
  const site = siteOf(doc) as RawNode;
  const pageIds = pageIdsOf(site);
  const upgraded: Record<string, RawNode> = { ...nodes };
  upgraded[doc.document_id] = {
    ...site,
    schema_version: 2,
    home_page_id: typeof pageIds[0] === "string" ? pageIds[0] : "",
  };
  const home = typeof pageIds[0] === "string" ? nodes[pageIds[0]] : undefined;
  if (isObject(home) && home.type === "page" && home.slug === "") {
    const taken = pageIds.flatMap((id) => {
      const page = typeof id === "string" ? nodes[id] : undefined;
      return isObject(page) && typeof page.slug === "string" ? [page.slug] : [];
    });
    const base = slugify(typeof home.title === "string" ? home.title : "") || "home";
    upgraded[pageIds[0] as string] = { ...home, slug: uniqueSlug(base, taken) };
  }
  return { ...doc, nodes: upgraded };
}

/** Version 3 adds the site's metadata settings and pages' share images, all empty or on. */
function toVersion3<T extends RawDoc>(doc: T): T {
  const nodes = doc.nodes;
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...nodes };
  upgraded[doc.document_id] = {
    ...site,
    schema_version: 3,
    description: "",
    favicon: { nodes: [], marks: [], annotations: [] },
    share_image: { nodes: [], marks: [], annotations: [] },
    allow_ai_search: true,
    allow_ai_training: true,
  };
  for (const id of pageIdsOf(site)) {
    const page = typeof id === "string" ? nodes[id] : undefined;
    if (isObject(page) && page.type === "page") {
      upgraded[id as string] = { ...page, share_image: { nodes: [], marks: [], annotations: [] } };
    }
  }
  return { ...doc, nodes: upgraded };
}

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const emptyList = () => ({ nodes: [], marks: [], annotations: [] });

/**
 * Version 4 adds the business node (every field empty, the footer switch on) and its seven
 * closed days. IDs are readable and deterministic, with a suffix when one is taken.
 */
function toVersion4<T extends RawDoc>(doc: T): T {
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...doc.nodes };
  const freeId = (base: string) => {
    let id = base;
    for (let n = 2; Object.hasOwn(upgraded, id); n++) id = `${base}_${n}`;
    return id;
  };
  const dayIds = WEEK.map((day) => {
    const id = freeId(`day_${day}`);
    upgraded[id] = { id, type: "opening_day", day, ranges: emptyList() };
    return id;
  });
  const businessId = freeId("business_1");
  upgraded[businessId] = {
    id: businessId,
    type: "business",
    name: "",
    street: "",
    postal_code: "",
    city: "",
    country: "CZ",
    phone: "",
    email: "",
    map_url: "",
    business_type: "LocalBusiness",
    hours_note: "",
    show_in_footer: true,
    days: { nodes: dayIds, marks: [], annotations: [] },
  };
  upgraded[doc.document_id] = { ...site, schema_version: 4, business: businessId };
  return { ...doc, nodes: upgraded };
}

/** Version 5 pairs pages across languages: each page's translation key is its own ID. */
function toVersion5<T extends RawDoc>(doc: T): T {
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...doc.nodes };
  upgraded[doc.document_id] = { ...site, schema_version: 5 };
  for (const id of pageIdsOf(site)) {
    const page = typeof id === "string" ? doc.nodes[id] : undefined;
    if (isObject(page) && page.type === "page")
      upgraded[id as string] = { ...page, translation_key: id };
  }
  return { ...doc, nodes: upgraded };
}

/**
 * Version 6 stores catalog fonts instead of CSS font lists (theme-and-branding design.md
 * decision 9): a serif list becomes Georgia, anything else the system font.
 */
function toVersion6<T extends RawDoc>(doc: T): T {
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...doc.nodes };
  upgraded[doc.document_id] = {
    ...site,
    schema_version: 6,
    logo: emptyList(),
    header_show_name: true,
  };
  const themeId = site.theme;
  const theme = typeof themeId === "string" ? doc.nodes[themeId] : undefined;
  if (isObject(theme) && theme.type === "theme") {
    upgraded[themeId as string] = {
      ...theme,
      font_heading: catalogFont(theme.font_heading),
      font_body: catalogFont(theme.font_body),
    };
  }
  return { ...doc, nodes: upgraded };
}

/** Version-6 blocks that held items, the property they held them in, and their collection. */
const LIFTED = {
  services: { items: "items", collection: "services" },
  team: { items: "people", collection: "team" },
  testimonials: { items: "items", collection: "testimonials" },
} as const;

/**
 * Version 7 holds services, people and testimonials once, on the site (business-collections
 * design decision 8). Items are lifted in page order and block order, keeping their IDs; an item
 * equal to one lifted from an earlier block (same texts, marks and image) is merged into it. A
 * block whose items are then exactly its whole collection, in order, shows `all`; any other
 * block shows its former items as `chosen`. Pages render as before.
 */
function toVersion7<T extends RawDoc>(doc: T): T {
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...doc.nodes };
  const freeId = (base: string) => {
    let id = base;
    for (let n = 2; Object.hasOwn(upgraded, id); n++) id = `${base}_${n}`;
    return id;
  };
  const collections = {
    services: [] as string[],
    team: [] as string[],
    testimonials: [] as string[],
  };
  const byContent = new Map<string, string>();
  const blocks: { id: string; ids: string[] }[] = [];

  for (const pageId of pageIdsOf(site)) {
    const page = typeof pageId === "string" ? doc.nodes[pageId] : undefined;
    if (!isObject(page) || page.type !== "page") continue;
    for (const blockId of idsIn(page.blocks)) {
      const block = doc.nodes[blockId];
      if (!isObject(block) || !Object.hasOwn(LIFTED, block.type as string)) continue;
      const { items, collection } = LIFTED[block.type as keyof typeof LIFTED];
      const ids: string[] = [];
      for (const itemId of idsIn(block[items])) {
        if (!isObject(doc.nodes[itemId])) continue;
        const key = `${collection}:${canonical(doc.nodes, itemId)}`;
        const earlier = byContent.get(key);
        if (earlier !== undefined && !ids.includes(earlier)) {
          for (const id of subtree(doc.nodes, itemId)) delete upgraded[id];
          ids.push(earlier);
          continue;
        }
        if (earlier === undefined) byContent.set(key, itemId);
        collections[collection].push(itemId);
        ids.push(itemId);
      }
      blocks.push({ id: blockId, ids });
    }
  }

  for (const { id, ids } of blocks) {
    const block = doc.nodes[id] as RawNode;
    const { items, collection } = LIFTED[block.type as keyof typeof LIFTED];
    const members = collections[collection];
    const all = ids.length === members.length && ids.every((itemId, i) => members[i] === itemId);
    const refIds = all
      ? []
      : ids.map((itemId) => {
          const refId = freeId(`${id}_ref`);
          upgraded[refId] = { id: refId, type: "item_ref", item_id: itemId };
          return refId;
        });
    const { [items]: _lifted, ...rest } = block;
    upgraded[id] = {
      ...rest,
      show: all ? "all" : "chosen",
      chosen: { nodes: refIds, marks: [], annotations: [] },
    };
  }

  const businessId = site.business;
  const business = typeof businessId === "string" ? doc.nodes[businessId] : undefined;
  if (isObject(business) && business.type === "business") {
    upgraded[businessId as string] = { ...business, social: emptyList() };
  }
  upgraded[doc.document_id] = {
    ...site,
    schema_version: 7,
    services: { nodes: collections.services, marks: [], annotations: [] },
    team: { nodes: collections.team, marks: [], annotations: [] },
    testimonials: { nodes: collections.testimonials, marks: [], annotations: [] },
    faqs: emptyList(),
  };
  return { ...doc, nodes: upgraded };
}

/** The business fields version 8 moves into its location. */
const LOCATION_FIELDS = [
  "street",
  "postal_code",
  "city",
  "country",
  "phone",
  "email",
  "map_url",
  "hours_note",
  "days",
] as const;

/**
 * Version 8 gives the business a list of locations (business-locations design decision 6): its
 * contact details and opening hours become one unnamed location, `location_1` (or the first
 * free `location_1_<n>`), so every language's document gets the same ID. Contact and opening
 * hours blocks show all locations. Pages render as before.
 */
function toVersion8<T extends RawDoc>(doc: T): T {
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...doc.nodes };
  const businessId = site.business;
  const business = typeof businessId === "string" ? doc.nodes[businessId] : undefined;
  if (isObject(business) && business.type === "business") {
    let locationId = "location_1";
    for (let n = 2; Object.hasOwn(upgraded, locationId); n++) locationId = `location_1_${n}`;
    const location: RawNode = { id: locationId, type: "location", name: "" };
    const rest: RawNode = { ...business };
    for (const field of LOCATION_FIELDS) {
      location[field] = business[field];
      delete rest[field];
    }
    upgraded[locationId] = location;
    upgraded[businessId as string] = {
      ...rest,
      locations: { nodes: [locationId], marks: [], annotations: [] },
    };
  }
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (isObject(node) && (node.type === "contact" || node.type === "opening_hours")) {
      upgraded[id] = { ...node, location_id: "" };
    }
  }
  upgraded[doc.document_id] = { ...site, schema_version: 8 };
  return { ...doc, nodes: upgraded };
}

/** The node IDs of a node list value, or none. */
function idsIn(value: unknown): string[] {
  const nodes = isObject(value) ? value.nodes : undefined;
  return Array.isArray(nodes) ? nodes.filter((id): id is string => typeof id === "string") : [];
}

/**
 * A node's content as a string that ignores node IDs: equal for two items with the same texts,
 * marks and images.
 */
function canonical(nodes: Record<string, RawNode>, id: string): string {
  const form = (nodeId: string): unknown => {
    const node = nodes[nodeId];
    if (!isObject(node)) return null;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(node).sort()) {
      if (key === "id") continue;
      const value = node[key];
      if (isObject(value) && Array.isArray(value.nodes)) {
        out[key] = { nodes: idsIn(value).map(form), marks: ranges(value.marks) };
      } else if (isObject(value) && typeof value.content === "string") {
        out[key] = { content: value.content, marks: ranges(value.marks) };
      } else {
        out[key] = value;
      }
    }
    return out;
  };
  const ranges = (value: unknown) =>
    (Array.isArray(value) ? value : []).map((range) =>
      isObject(range) ? [range.start_offset, range.end_offset, form(String(range.node_id))] : null,
    );
  return JSON.stringify(form(id));
}

/** A node and every node it owns (list children, and the nodes its marks point at). */
function subtree(nodes: Record<string, RawNode>, id: string): string[] {
  const node = nodes[id];
  if (!isObject(node)) return [];
  const ids = [id];
  for (const value of Object.values(node)) {
    if (!isObject(value)) continue;
    for (const child of idsIn(value)) ids.push(...subtree(nodes, child));
    for (const range of Array.isArray(value.marks) ? value.marks : []) {
      if (isObject(range) && typeof range.node_id === "string") {
        ids.push(...subtree(nodes, range.node_id));
      }
    }
  }
  return ids;
}

/** The catalog font closest to a version-5 CSS font list. */
export function catalogFont(list: unknown): "georgia" | "system-sans" {
  if (typeof list !== "string") return "system-sans";
  const families = list.split(",").map((f) =>
    f
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .toLowerCase(),
  );
  return families[0] === "georgia" || families.at(-1) === "serif" ? "georgia" : "system-sans";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
