import { isSafeHref } from "../links.js";
import type { NodeOfType, NodeType, TextValue } from "../schema/index.js";
import { slugify } from "../slug.js";
import type { GenericCheck } from "./generic.js";
import type { Problems } from "./problems.js";

const LANGUAGE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const FONT_STACK = /^[A-Za-z0-9 ,'"-]+$/;
const CSS_LENGTH = /^(0|\d+(\.\d+)?(px|rem|em|%|ch|vw))$/;
const MEDIA_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MIN_TEXT_CONTRAST = 4.5;
export const SCHEMA_VERSION = 2;

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

  const pageIds = new Set<string>();
  if (site) {
    checkSiteNode(site, problems);
    const seen = new Map<string, NodeOfType<"page">>();
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
    const nav = get(site.nav, "nav");
    if (nav) checkMenu(nav, get, problems);
    const theme = get(site.theme, "theme");
    if (theme) checkTheme(theme, problems);
  }

  for (const image of all("image")) checkImage(image, problems);

  for (const link of [...all("page_link"), ...all("internal_link")]) {
    if (site && !pageIds.has(link.page_id)) {
      problems.error(
        "missing-page",
        link.id,
        "This link points to a page that no longer exists.",
        "page_id",
      );
    }
  }
  for (const link of all("external_link")) checkHref(link.id, "url", link.url, problems);
  for (const link of all("link")) checkHref(link.id, "href", link.href, problems);
  for (const link of [...all("page_link"), ...all("external_link")]) {
    if (isBlank(link.label)) {
      problems.error("empty-link-label", link.id, `Link ${link.id} needs a label.`, "label");
    }
  }
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
}

function isValidBaseUrl(value: string): boolean {
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
        ? `${pageLabel(page)} needs a slug (its address).`
        : `Slug "${page.slug}" must be lowercase letters, digits and dashes; try "${normalized}".`,
      "slug",
    );
    return;
  }
  const other = seen.get(page.slug);
  if (other !== undefined) {
    problems.error(
      "duplicate-slug",
      page.id,
      `${pageLabel(other)} and ${pageLabel(page)} both use the slug "${page.slug}".`,
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
    const services = get(blockId, "services");
    if (services && !isBlank(services.heading)) hasH2 = true;
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
          `A level 3 subheading comes before any level 2 heading on ${pageLabel(page)}.`,
          "level",
        );
      }
    }
  });
}

function checkImage(image: NodeOfType<"image">, problems: Problems): void {
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
      `Image source "${image.src}" must be a plain file name (letters, digits, dots, dashes, underscores).`,
      "src",
    );
  }
  const hasAlt = image.alt.trim() !== "";
  if (!image.decorative && !hasAlt) {
    problems.error(
      "missing-alt",
      image.id,
      `Describe image ${image.id} in its alt text, or mark it as decorative.`,
      "alt",
    );
  } else if (image.decorative && hasAlt) {
    problems.error(
      "decorative-with-alt",
      image.id,
      `Image ${image.id} is marked decorative, so its alt text must be empty.`,
      "alt",
    );
  }
}

function checkHref(nodeId: string, property: string, href: string, problems: Problems): void {
  if (!isSafeHref(href)) {
    problems.error(
      "unsafe-link",
      nodeId,
      `"${href}" is not an allowed link; use http(s), mailto, tel or a path starting with /.`,
      property,
    );
  }
}

function checkTheme(theme: NodeOfType<"theme">, problems: Problems): void {
  const colors = ["color_primary", "color_secondary", "color_background", "color_text"] as const;
  for (const prop of colors) {
    if (!HEX_COLOR.test(theme[prop])) {
      problems.error(
        "invalid-color",
        theme.id,
        `${prop} must be a hex color like #1a2b3c (is "${theme[prop]}").`,
        prop,
      );
    }
  }
  for (const prop of ["font_heading", "font_body"] as const) {
    if (!FONT_STACK.test(theme[prop])) {
      problems.error(
        "invalid-theme-value",
        theme.id,
        `${prop} must be a font-family list (letters, digits, spaces, commas, quotes).`,
        prop,
      );
    }
  }
  for (const prop of ["radius", "content_width"] as const) {
    if (!CSS_LENGTH.test(theme[prop])) {
      problems.error(
        "invalid-theme-value",
        theme.id,
        `${prop} must be a CSS length like 0.5rem or 64rem (is "${theme[prop]}").`,
        prop,
      );
    }
  }
  if (HEX_COLOR.test(theme.color_text) && HEX_COLOR.test(theme.color_background)) {
    const ratio = contrastRatio(theme.color_text, theme.color_background);
    if (ratio < MIN_TEXT_CONTRAST) {
      problems.error(
        "low-contrast",
        theme.id,
        `Text on background has contrast ${ratio.toFixed(2)}:1; WCAG AA needs at least ${MIN_TEXT_CONTRAST}:1.`,
        "color_text",
      );
    }
  }
}

/** WCAG 2.x contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function luminance(hex: string): number {
  const h = hex.slice(1);
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isBlank(text: TextValue): boolean {
  return text.content.trim() === "";
}
