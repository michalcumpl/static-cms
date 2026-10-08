import {
  COLLECTION_NAMES,
  COLLECTIONS,
  type CollectionName,
  isCollectionBlockType,
} from "../collections.js";
import { isFontId } from "../fonts.js";
import { isSafeHref } from "../links.js";
import {
  isNodeType,
  type NodeOfType,
  type NodeType,
  type PropertyDef,
  siteSchema,
  type TextValue,
  WEEKDAYS,
} from "../schema/index.js";
import { slugify } from "../slug.js";
import { graphemeLength } from "../text.js";
import { CONTRAST_PAIRS, contrastRatio, MIN_CONTRAST, type ThemeColor } from "../themes.js";
import type { GenericCheck } from "./generic.js";
import type { ProblemCode, Problems } from "./problems.js";

const LANGUAGE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const CSS_LENGTH = /^(0|\d+(\.\d+)?(px|rem|em|%|ch|vw))$/;
const MEDIA_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Link previews show share images narrower than this blurred. */
const MIN_SHARE_WIDTH = 600;
/** The largest icon made from a favicon that phones show on their home screens. */
const MIN_FAVICON_SIZE = 180;
export const SCHEMA_VERSION = 10;

/** How messages name a page: by its title, since owners don't know node IDs. */
export function pageLabel(page: { title: string }): string {
  const title = page.title.trim();
  return title === "" ? "An untitled page" : `"${title}"`;
}

/** Site rules on top of the structural checks. Only reads nodes that are well-formed. */
export function checkSiteRules(docId: string, check: GenericCheck, problems: Problems): void {
  const get = <T extends NodeType>(id: string, type: T): NodeOfType<T> | undefined => {
    const node = check.nodes[id];
    return node?.type === type && check.wellFormed.has(id)
      ? (node as unknown as NodeOfType<T>)
      : undefined;
  };
  const all = <T extends NodeType>(type: T): NodeOfType<T>[] =>
    [...check.wellFormed].flatMap((id) => get(id, type) ?? []);

  const root = check.nodes[docId];
  if (root && root.type !== "site") {
    problems.error(
      "root-not-site",
      docId,
      `The root node must be a site, not ${String(root.type)}.`,
    );
  }
  const site = get(docId, "site");
  const where = placesOf(site, check);

  const pageIds = new Set<string>();
  if (site) {
    checkSiteNode(site, problems);
    const seen = new Map<string, NodeOfType<"page">>();
    const keys = new Map<string, NodeOfType<"page">>();
    for (const pageId of site.pages.nodes) {
      const page = get(pageId, "page");
      if (pageIds.has(pageId)) {
        problems.error(
          "duplicate-reference",
          docId,
          `${page ? pageLabel(page) : "A page"} is listed more than once.`,
          "pages",
        );
        continue;
      }
      pageIds.add(pageId);
      if (!page) continue;
      checkPageSlug(page, seen, problems);
      checkTranslationKey(page, keys, problems);
      if (page.share_image.nodes.length > 1) {
        problems.error(
          "too-many-items",
          page.id,
          `${pageLabel(page)} can have at most one share image.`,
          "share_image",
        );
      }
      checkPageBlocks(page, get, problems);
    }
    if (site.pages.nodes.length > 0 && !pageIds.has(site.home_page_id)) {
      problems.error(
        "missing-home",
        site.id,
        "The site has no home page; set one of its pages as home.",
        "home_page_id",
      );
    }
    checkCollections(site, get, problems);
    checkItemPages(site, get, problems);
    for (const pageId of pageIds) {
      const page = get(pageId, "page");
      if (page) checkCards(site, page, pageIds, get, problems);
    }
    for (const pageId of pageIds) {
      const page = get(pageId, "page");
      if (page) checkCollectionBlocks(site, page, check, get, problems);
    }
    const nav = get(site.nav, "nav");
    if (nav) checkMenu(nav, get, problems);
    const theme = get(site.theme, "theme");
    if (theme) checkTheme(theme, problems);
  }

  // A logo item's image is described by the logo's name, the site's logo by the site name, and
  // the favicon is never shown as an image on a page, so none needs alt text of its own.
  const undescribed = new Set(all("logo_item").flatMap((logo) => logo.image.nodes));
  const favicon = site?.favicon.nodes ?? [];
  for (const id of favicon) undescribed.add(id);
  for (const id of site?.logo.nodes ?? []) undescribed.add(id);
  // Share images are named by what they're for, not by where they are.
  const subjects = new Map<string, string>();
  for (const id of site?.share_image.nodes ?? []) subjects.set(id, "The site's share image");
  for (const pageId of pageIds) {
    const page = get(pageId, "page");
    for (const id of page?.share_image.nodes ?? []) {
      subjects.set(id, `The share image of ${pageLabel(page as NodeOfType<"page">)}`);
    }
  }
  for (const image of all("image")) {
    const place = where(image.id);
    const subject = subjects.get(image.id) ?? (place ? `An image ${place}` : "An image");
    checkImage(image, problems, subject, undescribed.has(image.id));
    if (subjects.has(image.id) && image.width > 0 && image.width < MIN_SHARE_WIDTH) {
      problems.warning(
        "small-share-image",
        image.id,
        `${subject} is only ${image.width} pixels wide; link previews need at least ${MIN_SHARE_WIDTH} (1200 is best).`,
        "width",
      );
    }
  }
  const faviconImage = favicon[0] ? get(favicon[0], "image") : undefined;
  if (faviconImage) {
    const size = Math.max(faviconImage.width, faviconImage.height);
    if (size > 0 && size < MIN_FAVICON_SIZE) {
      problems.warning(
        "small-favicon",
        faviconImage.id,
        `The favicon is only ${size} pixels; use an image at least ${MIN_FAVICON_SIZE} pixels wide or tall, or it will look blurred on phones.`,
        "width",
      );
    }
  }
  for (const logo of all("logo_item")) {
    if (logo.page_id !== "" && logo.url !== "") {
      problems.error(
        "invalid-value",
        logo.id,
        "A logo links either to a page or to an address, not both.",
        "url",
      );
    }
    if (site && logo.page_id !== "" && !pageIds.has(logo.page_id)) {
      problems.error(
        "missing-page",
        logo.id,
        `A logo ${where(logo.id)} links to a page that no longer exists.`,
        "page_id",
      );
    }
    if (logo.url !== "") checkHref(logo.id, "url", logo.url, problems);
  }

  for (const link of [...all("page_link"), ...all("internal_link")]) {
    if (site && !pageIds.has(link.page_id)) {
      problems.error(
        "missing-page",
        link.id,
        `${linkLabel(link.id)} points to a page that no longer exists.`,
        "page_id",
      );
    }
  }
  for (const link of all("external_link")) checkHref(link.id, "url", link.url, problems);
  for (const link of all("link")) checkHref(link.id, "href", link.href, problems);
  for (const link of [...all("page_link"), ...all("external_link")]) {
    if (isBlank(link.label)) {
      problems.error("empty-link-label", link.id, `${linkLabel(link.id)} needs a label.`, "label");
    }
  }

  const business = site ? get(site.business, "business") : undefined;
  if (business) checkBusiness(business, get, problems);
  const locationIds = new Set(business?.locations.nodes ?? []);
  for (const block of [...all("contact"), ...all("opening_hours")]) {
    if (!business) continue;
    const what = block.type === "contact" ? "contact block" : "opening hours block";
    if (block.location_id !== "" && !locationIds.has(block.location_id)) {
      problems.error(
        "missing-location",
        block.id,
        `The ${what} ${where(block.id)} shows a location that no longer exists; choose another in the block's panel.`,
        "location_id",
      );
      continue;
    }
    const shown = (block.location_id === "" ? [...locationIds] : [block.location_id]).flatMap(
      (id) => get(id, "location") ?? [],
    );
    if (!shown.some((location) => hasSomethingToShow(block, location, get))) {
      const fill = block.type === "contact" ? "business details" : "opening hours";
      problems.warning(
        "nothing-to-show",
        block.id,
        `The ${what} ${where(block.id)} has nothing to show yet; fill in the ${fill} in the business settings.`,
      );
    }
  }

  // Last, so that the errors owners must fix come first.
  if (site && site.description.trim() === "") {
    for (const pageId of pageIds) {
      const page = get(pageId, "page");
      if (page && page.seo_description.trim() === "") {
        problems.warning(
          "no-description",
          page.id,
          `${pageLabel(page)} has no description for search engines and link previews. Add one to the page, or a description of the whole site.`,
          "seo_description",
        );
      }
    }
  }

  /** How a link is named in messages: a menu item, a button (call to action) or a link. */
  function linkLabel(id: string): string {
    const place = where(id);
    if (place === "in the menu") return "A menu item";
    const node = check.nodes[id];
    const kind =
      node?.type === "page_link" || node?.type === "external_link" ? "A button" : "A link";
    return place ? `${kind} ${place}` : kind;
  }
}

type RawNode = Record<string, unknown> & { type: string };

/**
 * Where each node is, for messages: `on "Kontakt"` for nodes of a page (marks in its texts
 * included), `in the menu` for the navigation, "" elsewhere.
 */
function placesOf(
  site: NodeOfType<"site"> | undefined,
  check: GenericCheck,
): (id: string) => string {
  const places = new Map<string, string>();
  const nodes = check.nodes as Record<string, RawNode | undefined>;
  const visit = (id: string, place: string) => {
    const node = nodes[id];
    if (!node || places.has(id) || !isNodeType(node.type)) return;
    places.set(id, place);
    for (const [name, def] of Object.entries(siteSchema[node.type].properties) as [
      string,
      PropertyDef,
    ][]) {
      const value = node[name] as
        | { nodes?: unknown[]; marks?: { node_id?: unknown }[] }
        | string
        | undefined;
      if (def.type === "node" && typeof value === "string") visit(value, place);
      if (typeof value !== "object" || value === null) continue;
      for (const child of value.nodes ?? []) if (typeof child === "string") visit(child, place);
      for (const range of value.marks ?? []) {
        if (typeof range?.node_id === "string") visit(range.node_id, place);
      }
    }
  };
  if (site) {
    for (const pageId of site.pages.nodes) {
      const page = nodes[pageId];
      if (page?.type === "page")
        visit(pageId, `on ${pageLabel(page as unknown as { title: string })}`);
    }
    visit(site.nav, "in the menu");
    for (const collection of COLLECTION_NAMES) {
      site[collection].nodes.forEach((id, i) => {
        visit(id, `in ${ITEM_LABELS[collection]} ${i + 1}`);
      });
    }
  }
  return (id) => places.get(id) ?? "";
}

function checkSiteNode(site: NodeOfType<"site">, problems: Problems): void {
  if (site.schema_version !== SCHEMA_VERSION) {
    problems.error(
      "unsupported-version",
      site.id,
      `Schema version ${site.schema_version} is not supported; expected ${SCHEMA_VERSION}.`,
      "schema_version",
    );
  }
  if (site.name.trim() === "") {
    problems.error("missing-site-name", site.id, "The site needs a name.", "name");
  }
  if (site.lang.trim() === "") {
    problems.error(
      "missing-language",
      site.id,
      "The site needs a language (for example cs), used as every page's lang attribute.",
      "lang",
    );
  } else if (!LANGUAGE.test(site.lang)) {
    problems.error(
      "invalid-language",
      site.id,
      `"${site.lang}" is not a valid language tag.`,
      "lang",
    );
  }
  if (site.base_url !== "" && !isValidBaseUrl(site.base_url)) {
    problems.error(
      "invalid-base-url",
      site.id,
      `"${site.base_url}" must be an absolute http(s) URL without query or fragment.`,
      "base_url",
    );
  }
  if (site.pages.nodes.length === 0) {
    problems.error("no-pages", site.id, "The site needs at least one page.", "pages");
  }
  if (site.favicon.nodes.length > 1) {
    problems.error("too-many-items", site.id, "The site can have only one favicon.", "favicon");
  }
  if (site.share_image.nodes.length > 1) {
    problems.error(
      "too-many-items",
      site.id,
      "The site can have only one share image.",
      "share_image",
    );
  }
  if (site.logo.nodes.length > 1) {
    problems.error("too-many-items", site.id, "The site can have only one logo.", "logo");
  }
  if (!site.header_show_name && site.logo.nodes.length === 0) {
    problems.warning(
      "name-without-logo",
      site.id,
      "The site name is set to be hidden next to the logo, but there is no logo, so the header shows the name until a logo is chosen.",
      "header_show_name",
    );
  }
}

/** An absolute http(s) URL without query, fragment or credentials, like `https://anideti.cz`. */
export function isValidBaseUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.search === "" &&
    url.hash === "" &&
    url.username === "" &&
    url.password === ""
  );
}

/** Every page, the home page included, needs a normalized slug that no other page uses. */
const PHONE = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY = /^[A-Z]{2}$/;
const OPENS = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const CLOSES = /^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$/;
const DAY_NAMES: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Minutes since midnight of a valid `HH:MM` time. */
function minutes(time: string): number {
  const [hours = 0, mins = 0] = time.split(":").map(Number);
  return hours * 60 + mins;
}

/** The business details and opening hours (business-info design.md decision 6). */
function checkBusiness(
  business: NodeOfType<"business">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const seenProfiles = new Set<string>();
  business.social.nodes.forEach((id, i) => {
    const profile = get(id, "social_link");
    if (!profile) return;
    if (!isHttpsUrl(profile.url)) {
      problems.error(
        "invalid-social-url",
        profile.id,
        `Social profile ${i + 1} must be a link starting with https://, like https://www.instagram.com/your-business.`,
        "url",
      );
    } else if (seenProfiles.has(profile.url)) {
      problems.warning(
        "duplicate-social-url",
        profile.id,
        `Social profile ${i + 1} is listed twice.`,
        "url",
      );
    }
    seenProfiles.add(profile.url);
  });
  const locations = business.locations.nodes;
  if (locations.length === 0) {
    problems.error(
      "invalid-value",
      business.id,
      "The business needs at least one location.",
      "locations",
    );
  }
  locations.forEach((id, i) => {
    const location = get(id, "location");
    if (!location) return;
    // With several locations, messages say which one (business-locations, "Locations").
    const several = locations.length > 1;
    if (several && location.name.trim() === "") {
      problems.error(
        "empty-name",
        location.id,
        `Location ${i + 1} needs a name; once there are several locations, each is named.`,
        "name",
      );
    }
    const at = several ? `${locationLabel(location, i)}: ` : "";
    checkLocation(location, at, get, problems);
  });
}

/** How messages name a location: its name, or "Location 2". */
function locationLabel(location: NodeOfType<"location">, index: number): string {
  return location.name.trim() || `Location ${index + 1}`;
}

/** A location's contact details and opening hours; `at` names it in messages ("Kolín: "). */
function checkLocation(
  location: NodeOfType<"location">,
  at: string,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  if (location.phone !== "" && !PHONE.test(location.phone)) {
    problems.error(
      "invalid-phone",
      location.id,
      `${at}The phone number "${location.phone}" must be in international form, like +420 321 123 456.`,
      "phone",
    );
  }
  if (location.email !== "" && !EMAIL.test(location.email)) {
    problems.error(
      "invalid-email",
      location.id,
      `${at}"${location.email}" is not an email address.`,
      "email",
    );
  }
  if (location.map_url !== "" && !/^https:\/\/[^\s]+$/.test(location.map_url)) {
    problems.error(
      "invalid-map-url",
      location.id,
      `${at}The map address must be a link starting with https://, such as the location's Google Maps or Mapy.com listing.`,
      "map_url",
    );
  }
  if (!COUNTRY.test(location.country)) {
    problems.error(
      "invalid-country",
      location.id,
      `${at}The country must be a two-letter code, like CZ, not "${location.country}".`,
      "country",
    );
  }
  const days = location.days.nodes.map((id) => get(id, "opening_day"));
  const inOrder =
    days.length === WEEKDAYS.length && days.every((day, i) => day?.day === WEEKDAYS[i]);
  if (!inOrder) {
    problems.error(
      "invalid-value",
      location.id,
      `${at}The opening hours must list each day from Monday to Sunday once.`,
      "days",
    );
  }
  for (const day of days) {
    if (!day) continue;
    const name = DAY_NAMES[day.day] ?? day.day;
    let previousClose = -1;
    for (const rangeId of day.ranges.nodes) {
      const range = get(rangeId, "time_range");
      if (!range) continue;
      const opensOk = OPENS.test(range.opens);
      const closesOk = CLOSES.test(range.closes);
      if (!opensOk || !closesOk) {
        const bad = opensOk ? range.closes : range.opens;
        problems.error(
          "invalid-value",
          range.id,
          `${at}${name}'s hours: "${bad}" is not a time; use hours and minutes, like 08:30.`,
          opensOk ? "closes" : "opens",
        );
        continue;
      }
      const opens = minutes(range.opens);
      const closes = minutes(range.closes);
      if (closes <= opens) {
        problems.error(
          "invalid-hours",
          range.id,
          `${at}${name}'s hours close before they open (${range.opens}–${range.closes}).`,
          "closes",
        );
      } else if (opens < previousClose) {
        problems.error(
          "invalid-hours",
          range.id,
          `${at}${name}'s hours overlap or are out of order; each range must start after the previous one ends.`,
          "opens",
        );
      }
      previousClose = Math.max(previousClose, closes);
    }
  }
}

function isHttpsUrl(value: string): boolean {
  if (!/^https:\/\/[^\s]+$/.test(value)) return false;
  try {
    return new URL(value).hostname.includes(".");
  } catch {
    return false;
  }
}

/** How messages name the items of each collection, with their position: "Service 3". */
const ITEM_LABELS: Record<CollectionName, string> = {
  services: "Service",
  team: "Person",
  testimonials: "Testimonial",
  faqs: "Question",
  projects: "Project",
};

/** The panel section where an item is edited, for messages (offer-and-about decision 7). */
const ITEM_HOMES: Record<CollectionName, string> = {
  services: "What you offer",
  team: "About you",
  testimonials: "About you",
  faqs: "What you offer",
  projects: "What you offer",
};

/** The items' own contents, collection by collection (business-collections, "Collections"). */
function checkCollections(
  site: NodeOfType<"site">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  for (const collection of COLLECTION_NAMES) {
    site[collection].nodes.forEach((id, i) => {
      const label = `${ITEM_LABELS[collection]} ${i + 1}`;
      const home = `edit it in ${ITEM_HOMES[collection]}`;
      const need = (code: ProblemCode, nodeId: string, what: string, property: string) =>
        problems.error(code, nodeId, `${label} needs ${what}; ${home}.`, property);
      const tooMany = (nodeId: string, count: number, what: string) => {
        if (count > 1) {
          problems.error(
            "too-many-items",
            nodeId,
            `${label} can have at most one ${what}.`,
            "image",
          );
        }
      };
      const service = get(id, "service_item");
      if (service && isBlank(service.name)) need("empty-name", id, "a name", "name");
      const person = get(id, "person");
      if (person) {
        if (isBlank(person.name)) need("empty-name", id, "a name", "name");
        tooMany(id, person.image.nodes.length, "portrait");
      }
      const testimonial = get(id, "testimonial");
      if (testimonial) {
        if (isBlank(testimonial.quote)) need("empty-quote", id, "its quote", "quote");
        if (isBlank(testimonial.name)) need("empty-name", id, "the person's name", "name");
        tooMany(id, testimonial.image.nodes.length, "photo");
      }
      const faq = get(id, "faq_item");
      if (faq) {
        if (isBlank(faq.question)) need("empty-question", id, "its question", "question");
        if (isBlank(faq.answer)) need("empty-answer", id, "its answer", "answer");
      }
      const project = get(id, "project");
      if (project) checkProject(project, label, home, site, get, problems);
    });
  }
  site.project_categories.nodes.forEach((id, i) => {
    const category = get(id, "project_category");
    if (category && isBlank(category.name)) {
      problems.error(
        "empty-name",
        id,
        `Project category ${i + 1} needs a name; edit it in What you offer.`,
        "name",
      );
    }
  });
}

/** A project's own contents (collection-pages, "Projects"). */
function checkProject(
  project: NodeOfType<"project">,
  label: string,
  home: string,
  site: NodeOfType<"site">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  if (isBlank(project.name)) {
    problems.error("empty-name", project.id, `${label} needs a name; ${home}.`, "name");
  }
  if (project.category_id !== "" && !site.project_categories.nodes.includes(project.category_id)) {
    problems.error(
      "missing-category",
      project.id,
      `${label} is in a category that no longer exists; choose another one, ${home}.`,
      "category_id",
    );
  }
  for (const factId of project.facts.nodes) {
    const fact = get(factId, "fact");
    if (!fact) continue;
    const name = fact.label.content.trim();
    if (name === "") {
      problems.error(
        "empty-label",
        factId,
        `${label} has a fact without a label; ${home}.`,
        "label",
      );
    } else if (isBlank(fact.value)) {
      problems.error(
        "empty-value",
        factId,
        `${label}'s fact "${name}" needs a value; ${home}.`,
        "value",
      );
    }
  }
  if (project.cover.nodes.length > 1) {
    problems.error("too-many-items", project.id, `${label} can have at most one cover.`, "cover");
  } else if (project.cover.nodes.length === 0) {
    problems.warning(
      "missing-cover",
      project.id,
      `${label} has no cover image, so its tile has no picture; ${home}.`,
      "cover",
    );
  }
  if (project.video_url !== "" && !isHttpsUrl(project.video_url)) {
    problems.error(
      "unsafe-link",
      project.id,
      `${label}'s video address "${project.video_url}" must start with https://; ${home}.`,
      "video_url",
    );
  }
}

/**
 * The listing pages of services and projects, and their items' addresses while they have one
 * (collection-pages, "Item pages").
 */
function checkItemPages(
  site: NodeOfType<"site">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const collections = [
    { collection: "services", property: "services_page_id", what: "services" },
    { collection: "projects", property: "projects_page_id", what: "projects" },
  ] as const;
  for (const { collection, property, what } of collections) {
    const listing = site[property];
    if (listing === "") continue;
    if (!site.pages.nodes.includes(listing) || !get(listing, "page")) {
      problems.error(
        "missing-page",
        site.id,
        `The page listing the ${what} no longer exists; choose another one in What you offer.`,
        property,
      );
      continue;
    }
    if (listing === site.home_page_id) {
      problems.error(
        "invalid-listing-page",
        site.id,
        `The ${what} can't have pages under the home page; choose another page to list them in What you offer.`,
        property,
      );
      continue;
    }
    const seen = new Map<string, string>();
    site[collection].nodes.forEach((id, i) => {
      const item = get(id, collection === "services" ? "service_item" : "project");
      if (!item) return;
      const label = `${ITEM_LABELS[collection]} ${i + 1}`;
      const normalized = slugify(item.slug);
      if (normalized === "" || normalized !== item.slug) {
        problems.error(
          "invalid-slug",
          id,
          normalized === ""
            ? `${label} needs an address for its page; edit it in What you offer.`
            : `The address "${item.slug}" of ${label} may only contain lowercase letters, digits and dashes; try "${normalized}".`,
          "slug",
        );
        return;
      }
      const other = seen.get(item.slug);
      if (other !== undefined) {
        problems.error(
          "duplicate-slug",
          id,
          `${other} and ${label} have the same address "${item.slug}".`,
          "slug",
        );
      } else {
        seen.set(item.slug, label);
      }
    });
  }
}

/** What the collection blocks of a page show (business-collections, "Collection blocks"). */
function checkCollectionBlocks(
  site: NodeOfType<"site">,
  page: NodeOfType<"page">,
  check: GenericCheck,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const on = pageLabel(page);
  for (const blockId of page.blocks.nodes) {
    const node = check.wellFormed.has(blockId) ? check.nodes[blockId] : undefined;
    if (!node || !isCollectionBlockType(node.type)) continue;
    const block = get(blockId, node.type);
    if (!block) continue;
    const { collection } = COLLECTIONS[block.type];
    const members = new Set(site[collection].nodes);
    const name = BLOCK_NAMES[block.type];
    if (block.type === "projects" && block.category_id !== "") {
      if (!site.project_categories.nodes.includes(block.category_id)) {
        problems.error(
          "missing-category",
          block.id,
          `The ${name} on ${on} shows a category that no longer exists; choose another one.`,
          "category_id",
        );
      } else if (
        block.show === "all" &&
        !site.projects.nodes.some((id) => get(id, "project")?.category_id === block.category_id)
      ) {
        problems.warning(
          "empty-block",
          block.id,
          `The ${name} on ${on} shows a category without projects yet.`,
          "category_id",
        );
      }
    }
    if (block.show === "all") {
      if (block.chosen.nodes.length > 0) {
        problems.error(
          "chosen-items-unused",
          block.id,
          `The ${name} on ${on} shows everything but also lists chosen items.`,
          "chosen",
        );
      }
      if (members.size === 0) {
        problems.warning(
          "empty-block",
          block.id,
          `The ${name} on ${on} has nothing to show yet; add the first one in the block.`,
          "chosen",
        );
      }
      continue;
    }
    if (block.chosen.nodes.length === 0) {
      problems.warning("empty-block", block.id, `The ${name} on ${on} is empty.`, "chosen");
    }
    const seen = new Set<string>();
    for (const refId of block.chosen.nodes) {
      const ref = get(refId, "item_ref");
      if (!ref) continue;
      if (!members.has(ref.item_id)) {
        const elsewhere = COLLECTION_NAMES.some((c) => site[c].nodes.includes(ref.item_id));
        problems.error(
          elsewhere ? "wrong-collection" : "missing-item",
          ref.id,
          elsewhere
            ? `The ${name} on ${on} shows an item of another kind; remove it from the block.`
            : `The ${name} on ${on} shows an item that no longer exists; remove it from the block.`,
          "item_id",
        );
      } else if (seen.has(ref.item_id)) {
        problems.error(
          "duplicate-item",
          ref.id,
          `The ${name} on ${on} shows the same item twice.`,
          "item_id",
        );
      }
      seen.add(ref.item_id);
    }
  }
}

const BLOCK_NAMES = {
  services: "services block",
  team: "team block",
  testimonials: "testimonials block",
  faq: "questions block",
  projects: "projects block",
} as const;

/** Whether a contact or opening hours block would show anything of one location. */
function hasSomethingToShow(
  block: NodeOfType<"contact"> | NodeOfType<"opening_hours">,
  location: NodeOfType<"location">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
): boolean {
  if (block.type === "opening_hours") {
    const open = location.days.nodes.some(
      (id) => (get(id, "opening_day")?.ranges.nodes.length ?? 0) > 0,
    );
    return open || location.hours_note.trim() !== "";
  }
  const filled = (value: string) => value.trim() !== "";
  const address = filled(location.street) || filled(location.city) || filled(location.postal_code);
  return (
    (block.show_address && address) ||
    (block.show_phone && filled(location.phone)) ||
    (block.show_email && filled(location.email)) ||
    (block.show_map &&
      (filled(location.map_url) || filled(location.street) || filled(location.city)))
  );
}

/** Each page's translation key is non-empty and unique within the document. */
function checkTranslationKey(
  page: NodeOfType<"page">,
  keys: Map<string, NodeOfType<"page">>,
  problems: Problems,
): void {
  const key = page.translation_key.trim();
  if (key === "") {
    problems.error(
      "invalid-value",
      page.id,
      `${pageLabel(page)} isn't paired with the other languages; its translation key is empty.`,
      "translation_key",
    );
    return;
  }
  const other = keys.get(key);
  if (other) {
    problems.error(
      "duplicate-translation-key",
      page.id,
      `${pageLabel(other)} and ${pageLabel(page)} are paired with the same page in other languages; only one of them can be.`,
      "translation_key",
    );
  } else {
    keys.set(key, page);
  }
}

function checkPageSlug(
  page: NodeOfType<"page">,
  seen: Map<string, NodeOfType<"page">>,
  problems: Problems,
): void {
  if (page.title.trim() === "") {
    problems.error("missing-title", page.id, "This page needs a title.", "title");
  }
  const normalized = slugify(page.slug);
  if (normalized === "" || normalized !== page.slug) {
    problems.error(
      "invalid-slug",
      page.id,
      normalized === ""
        ? `${pageLabel(page)} needs an address.`
        : `The address "${page.slug}" of ${pageLabel(page)} may only contain lowercase letters, digits and dashes; try "${normalized}".`,
      "slug",
    );
    return;
  }
  const other = seen.get(page.slug);
  if (other !== undefined) {
    problems.error(
      "duplicate-slug",
      page.id,
      `${pageLabel(other)} and ${pageLabel(page)} have the same address "${page.slug}".`,
      "slug",
    );
  } else {
    seen.set(page.slug, page);
  }
}

/** A page should be in the menu at most once. */
function checkMenu(
  nav: NodeOfType<"nav">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const listed = new Set<string>();
  for (const itemId of nav.items.nodes) {
    const link = get(itemId, "page_link");
    if (!link) continue;
    if (listed.has(link.page_id)) {
      const page = get(link.page_id, "page");
      problems.warning(
        "duplicate-menu-item",
        link.id,
        `${page ? pageLabel(page) : "This page"} is in the menu more than once.`,
      );
    }
    listed.add(link.page_id);
  }
}

function checkPageBlocks(
  page: NodeOfType<"page">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  let hasH2 = false;
  page.blocks.nodes.forEach((blockId, index) => {
    const hero = get(blockId, "hero");
    if (hero) {
      if (index > 0) {
        problems.error(
          "hero-not-first",
          hero.id,
          `The hero must be the first block of ${pageLabel(page)}.`,
        );
      }
      if (isBlank(hero.heading)) {
        problems.error("empty-heading", hero.id, "The hero needs a heading.", "heading");
      }
      for (const prop of ["image", "action"] as const) {
        if (hero[prop].nodes.length > 1) {
          problems.error("too-many-items", hero.id, `A hero can have at most one ${prop}.`, prop);
        }
      }
    }
    checkImageBlock(blockId, page, get, problems);
    checkContentBlock(blockId, page, get, problems);
    checkFiguresAndSteps(blockId, page, get, problems);
    for (const type of [
      "services",
      "text_with_image",
      "gallery",
      "team",
      "logos",
      "contact",
      "opening_hours",
      "call_to_action",
      "testimonials",
      "faq",
      "projects",
      "cards",
    ] as const) {
      const block = get(blockId, type);
      if (block && !isBlank(block.heading)) hasH2 = true;
    }
    const richText = get(blockId, "rich_text");
    for (const childId of richText?.body.nodes ?? []) {
      const sub = get(childId, "subheading");
      if (!sub) continue;
      if (isBlank(sub.content)) {
        problems.error("empty-heading", sub.id, "Subheadings must not be empty.", "content");
      }
      if (sub.level === 2) {
        hasH2 = true;
      } else if (!hasH2) {
        problems.error(
          "heading-skip",
          sub.id,
          `On ${pageLabel(page)}, a smaller subheading comes before any main subheading; make the first one a main subheading.`,
          "level",
        );
      }
    }
  });
}

/** The most cards a cards block shows (cards design decision 2). */
const MAX_CARDS = 12;

/** A page's cards blocks: their number, titles and links (cards design decision 2). */
function checkCards(
  site: NodeOfType<"site">,
  page: NodeOfType<"page">,
  pageIds: Set<string>,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const on = pageLabel(page);
  // Items with their own page: those of a collection with a valid listing page.
  const withPages = new Set<string>();
  const listings = [
    [site.services, site.services_page_id],
    [site.projects, site.projects_page_id],
  ] as const;
  for (const [collection, listing] of listings) {
    if (listing !== "" && listing !== site.home_page_id && pageIds.has(listing)) {
      for (const id of collection.nodes) withPages.add(id);
    }
  }
  for (const blockId of page.blocks.nodes) {
    const block = get(blockId, "cards");
    if (!block) continue;
    const count = block.items.nodes.length;
    if (count === 0) {
      problems.error(
        "empty-block",
        block.id,
        `The cards on ${on} need at least one card.`,
        "items",
      );
    } else if (count > MAX_CARDS) {
      problems.error(
        "too-many-items",
        block.id,
        `The cards on ${on} can have at most ${MAX_CARDS} cards.`,
        "items",
      );
    }
    block.items.nodes.forEach((cardId, i) => {
      const card = get(cardId, "card");
      if (!card) return;
      const label = `Card ${i + 1} on ${on}`;
      if (isBlank(card.title)) {
        problems.error("empty-title", card.id, `${label} needs a title.`, "title");
      }
      if (card.image.nodes.length > 1) {
        problems.error("too-many-items", card.id, `${label} can have at most one image.`, "image");
      }
      if (card.target_id !== "" && card.url !== "") {
        problems.error(
          "invalid-value",
          card.id,
          `${label} links both to a page and to an address; keep one.`,
          "url",
        );
      }
      if (card.url !== "") checkHref(card.id, "url", card.url, problems);
      if (card.target_id !== "" && !pageIds.has(card.target_id) && !withPages.has(card.target_id)) {
        problems.warning(
          "broken-card-link",
          card.id,
          `The link of card ${i + 1} on ${on} leads to something that no longer has a page; choose another target.`,
          "target_id",
        );
      }
    });
  }
}

/** The call to action's heading and buttons (cta-and-testimonials decision 5). */
function checkContentBlock(
  blockId: string,
  page: NodeOfType<"page">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const on = pageLabel(page);
  const hero = get(blockId, "hero");
  if (hero?.layout === "cover" && hero.image.nodes.length === 0) {
    problems.warning(
      "cover-without-image",
      hero.id,
      `The hero on ${on} is set to show a full photo but has none; until it has one, its text shows as usual.`,
      "layout",
    );
  }
  const cta = get(blockId, "call_to_action");
  if (cta) {
    if (isBlank(cta.heading)) {
      problems.error(
        "empty-heading",
        cta.id,
        `The call to action on ${on} needs a heading.`,
        "heading",
      );
    }
    if (cta.actions.nodes.length === 0) {
      problems.warning(
        "empty-block",
        cta.id,
        `The call to action on ${on} has no button.`,
        "actions",
      );
    } else if (cta.actions.nodes.length > 2) {
      problems.error(
        "too-many-items",
        cta.id,
        `The call to action on ${on} can have at most two buttons.`,
        "actions",
      );
    }
  }
}

/** The longest figure value read at a glance (figures-and-steps design decision 2). */
const LONG_FIGURE = 24;

/** The contents of key figures and steps blocks (figures-and-steps design decision 2). */
function checkFiguresAndSteps(
  blockId: string,
  page: NodeOfType<"page">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const on = pageLabel(page);
  const figures = get(blockId, "figures");
  if (figures) {
    const count = figures.items.nodes.length;
    if (count === 0) {
      problems.warning("empty-block", figures.id, `The key figures on ${on} are empty.`, "items");
    } else if (count > 6) {
      problems.error(
        "too-many-items",
        figures.id,
        `The key figures on ${on} can have at most six figures.`,
        "items",
      );
    }
    figures.items.nodes.forEach((itemId, i) => {
      const figure = get(itemId, "figure");
      if (!figure) return;
      const label = `Figure ${i + 1} on ${on}`;
      if (isBlank(figure.value)) {
        problems.error("empty-value", figure.id, `${label} needs its number.`, "value");
      } else if (graphemeLength(figure.value.content.trim()) > LONG_FIGURE) {
        problems.warning(
          "long-figure",
          figure.id,
          `${label} is long; a figure is read at a glance, so keep it to ${LONG_FIGURE} characters and put the rest in its label.`,
          "value",
        );
      }
      if (isBlank(figure.label)) {
        problems.error("empty-label", figure.id, `${label} needs its label.`, "label");
      }
    });
  }
  const steps = get(blockId, "steps");
  if (steps) {
    if (isBlank(steps.heading)) {
      problems.error(
        "empty-heading",
        steps.id,
        `The steps on ${on} need a heading; the steps' titles are headings under it.`,
        "heading",
      );
    }
    if (steps.items.nodes.length === 0) {
      problems.warning("empty-block", steps.id, `The steps on ${on} are empty.`, "items");
    }
    steps.items.nodes.forEach((itemId, i) => {
      const step = get(itemId, "step");
      if (step && isBlank(step.title)) {
        problems.error("empty-title", step.id, `Step ${i + 1} on ${on} needs its title.`, "title");
      }
    });
  }
}

/** The contents of gallery and logos blocks, and the image of a text with image block. */
function checkImageBlock(
  blockId: string,
  page: NodeOfType<"page">,
  get: <T extends NodeType>(id: string, type: T) => NodeOfType<T> | undefined,
  problems: Problems,
): void {
  const on = pageLabel(page);
  const tooMany = (id: string, count: number, what: string) => {
    if (count > 1)
      problems.error("too-many-items", id, `${what} can have at most one image.`, "image");
  };
  const textWithImage = get(blockId, "text_with_image");
  if (textWithImage)
    tooMany(textWithImage.id, textWithImage.image.nodes.length, "A text with image block");

  const emptyBlock = (id: string, count: number, what: string, property: string) => {
    if (count === 0) {
      problems.warning("empty-block", id, `A ${what} on ${on} is empty.`, property);
    }
  };
  const gallery = get(blockId, "gallery");
  if (gallery) {
    emptyBlock(gallery.id, gallery.items.nodes.length, "gallery", "items");
    for (const itemId of gallery.items.nodes) {
      const item = get(itemId, "gallery_item");
      if (!item) continue;
      if (item.image.nodes.length === 0) {
        problems.error(
          "missing-image",
          item.id,
          `A photo in the gallery on ${on} has no image.`,
          "image",
        );
      }
      tooMany(item.id, item.image.nodes.length, "A gallery photo");
    }
  }
  const logos = get(blockId, "logos");
  if (logos) {
    emptyBlock(logos.id, logos.items.nodes.length, "logo row", "items");
    for (const itemId of logos.items.nodes) {
      const logo = get(itemId, "logo_item");
      if (!logo) continue;
      if (isBlank(logo.name)) {
        problems.error(
          "empty-name",
          logo.id,
          `A logo on ${on} needs the partner's name; it is the logo's description.`,
          "name",
        );
      }
      if (logo.image.nodes.length === 0) {
        problems.error("missing-image", logo.id, `A logo on ${on} has no image.`, "image");
      }
      tooMany(logo.id, logo.image.nodes.length, "A logo");
    }
  }
}

function checkImage(
  image: NodeOfType<"image">,
  problems: Problems,
  anImage: string,
  describedElsewhere = false,
): void {
  if (!(image.width > 0 && image.height > 0)) {
    problems.error(
      "missing-image-size",
      image.id,
      "This image's size is unknown; choose it again from the media library.",
      image.width > 0 ? "height" : "width",
    );
  }
  if (!MEDIA_KEY.test(image.src)) {
    problems.error(
      "invalid-media-key",
      image.id,
      `${anImage} has an invalid file name; choose it again from the media library.`,
      "src",
    );
  }
  const hasAlt = image.alt.trim() !== "";
  if (!image.decorative && !hasAlt && !describedElsewhere) {
    problems.error(
      "missing-alt",
      image.id,
      `${anImage} needs a description (alt text), or mark it as decorative.`,
      "alt",
    );
  } else if (image.decorative && hasAlt) {
    problems.error(
      "decorative-with-alt",
      image.id,
      `${anImage} is marked decorative, so it can't have a description.`,
      "alt",
    );
  }
}

function checkHref(nodeId: string, property: string, href: string, problems: Problems): void {
  if (!isSafeHref(href)) {
    problems.error(
      "unsafe-link",
      nodeId,
      `"${href}" isn't an allowed address; use https://, http://, mailto:, tel: or a path starting with /.`,
      property,
    );
  }
}

const COLOR_NAMES: Record<ThemeColor, string> = {
  color_primary: "The primary colour",
  color_secondary: "The secondary colour",
  color_background: "The background colour",
  color_text: "The text colour",
};

const FONT_ROLES = { font_heading: "heading font", font_body: "body font" } as const;
const LENGTH_NAMES = { radius: "corner radius", content_width: "content width" } as const;

function checkTheme(theme: NodeOfType<"theme">, problems: Problems): void {
  for (const prop of Object.keys(COLOR_NAMES) as ThemeColor[]) {
    if (!HEX_COLOR.test(theme[prop])) {
      problems.error(
        "invalid-color",
        theme.id,
        `${COLOR_NAMES[prop]} must be a hex colour like #1a2b3c (is "${theme[prop]}").`,
        prop,
      );
    }
  }
  for (const prop of ["font_heading", "font_body"] as const) {
    if (!isFontId(theme[prop])) {
      problems.error(
        "invalid-theme-value",
        theme.id,
        `The ${FONT_ROLES[prop]} must be chosen from the list of fonts (is "${theme[prop]}").`,
        prop,
      );
    }
  }
  for (const prop of ["radius", "content_width"] as const) {
    if (!CSS_LENGTH.test(theme[prop])) {
      problems.error(
        "invalid-theme-value",
        theme.id,
        `The ${LENGTH_NAMES[prop]} must be a length like 0.5rem or 64rem (is "${theme[prop]}").`,
        prop,
      );
    }
  }
  for (const pair of CONTRAST_PAIRS) {
    const [fg, bg] = [theme[pair.fg], theme[pair.bg]];
    if (!HEX_COLOR.test(fg) || !HEX_COLOR.test(bg)) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio < MIN_CONTRAST) {
      problems.error(
        "low-contrast",
        theme.id,
        `${pair.name}: contrast ${ratio.toFixed(2)}:1 is too low to read; at least ${MIN_CONTRAST}:1 is needed (WCAG AA).`,
        pair.fg,
      );
    }
  }
}

function isBlank(text: TextValue): boolean {
  return text.content.trim() === "";
}
