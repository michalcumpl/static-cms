import type { NodeOfType } from "@webmio/model";
import { imageFile, shareFile, srcVariant } from "@webmio/model";
import type { LocationInfo } from "./business.js";
import type { RenderContext } from "./context.js";
import { type Html, html, raw } from "./html.js";

/** The share image's size, as made on the server (media spec, "Icon and share files"). */
const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 630;

export interface HeadOptions {
  /** The `<title>`. */
  title: string;
  /** The meta description; empty for none. */
  description: string;
  /** The page shown, for its canonical link, share metadata and (home) structured data. */
  page?: NodeOfType<"page">;
  /** Or the service or project whose own page this is (collection-pages decision 4). */
  item?: { id: string; title: string; shareImageId?: string };
}

/** What the page tags need to know about the page shown, a page of the site or an item's. */
interface Subject {
  id: string;
  /** The key its counterparts in other languages share. */
  key: string;
  ogTitle: string;
  shareImageId?: string;
  home: boolean;
}

function subjectOf(ctx: RenderContext, options: HeadOptions): Subject | undefined {
  const { page, item } = options;
  if (page) {
    const home = page.id === ctx.homeId;
    return {
      id: page.id,
      key: page.translation_key,
      ogTitle: home ? ctx.site.name : page.title,
      shareImageId: page.share_image.nodes[0],
      home,
    };
  }
  if (item) {
    return {
      id: item.id,
      key: item.id,
      ogTitle: item.title,
      shareImageId: item.shareImageId,
      home: false,
    };
  }
  return undefined;
}

/**
 * A page's `<head>` contents (seo-and-metadata design.md decision 4), in a fixed order:
 * title, description, stylesheet, canonical link, favicon links, Open Graph, Twitter card and,
 * on the home page, structured data. Tags that need an absolute URL appear only when the
 * site's address is known. Without `page` (the not-found page) there are no page tags.
 */
export function renderHead(ctx: RenderContext, options: HeadOptions): Html {
  const page = subjectOf(ctx, options);
  // The video script, only on pages that show a video (video design decision 3).
  const lines: Html[] = [
    html`<meta charset="utf-8">`,
    html`<meta name="viewport" content="width=device-width, initial-scale=1">`,
    html`<title>${options.title}</title>`,
  ];
  if (options.description !== "") {
    lines.push(html`<meta name="description" content="${options.description}">`);
  }
  lines.push(html`<link rel="stylesheet" href="${ctx.url("assets/style.css")}">`);
  if (ctx.pageHasVideo)
    lines.push(html`<script src="${ctx.url("assets/video.js")}" defer></script>`);
  const canonical = page && ctx.canonicalUrl(page.id);
  if (canonical) lines.push(html`<link rel="canonical" href="${canonical}">`);
  if (page && ctx.multilingual) lines.push(...alternates(ctx, page.key));
  if (ctx.site.favicon.nodes.length > 0) {
    lines.push(
      html`<link rel="icon" href="${ctx.url("favicon.ico")}" sizes="32x32">`,
      html`<link rel="icon" href="${ctx.url("icon-512.png")}" type="image/png" sizes="512x512">`,
      html`<link rel="apple-touch-icon" href="${ctx.url("apple-touch-icon.png")}">`,
    );
  }
  if (page) {
    lines.push(...shareMetadata(ctx, page, options.description, canonical));
    if (page.home) {
      const data = structuredData(ctx);
      if (data) lines.push(data);
    }
  }
  return raw(lines.map((line) => `\n    ${line.value}`).join(""));
}

/** `hreflang` links to the page in every language that has it, and `x-default` (the primary's). */
function alternates(ctx: RenderContext, key: string): Html[] {
  const links: Html[] = [];
  let primary: string | undefined;
  for (const language of ctx.languages) {
    const url = language.pages.get(key);
    if (url === undefined) continue;
    links.push(html`<link rel="alternate" hreflang="${language.lang}" href="${ctx.link(url)}">`);
    if (language.primary) primary = url;
  }
  if (primary !== undefined) {
    links.push(html`<link rel="alternate" hreflang="x-default" href="${ctx.link(primary)}">`);
  }
  return links;
}

function shareMetadata(
  ctx: RenderContext,
  page: Subject,
  description: string,
  canonical: string | undefined,
): Html[] {
  const { site } = ctx;
  const lines = [
    html`<meta property="og:type" content="website">`,
    html`<meta property="og:site_name" content="${site.name}">`,
    html`<meta property="og:title" content="${page.ogTitle}">`,
  ];
  if (description !== "") {
    lines.push(html`<meta property="og:description" content="${description}">`);
  }
  if (canonical) lines.push(html`<meta property="og:url" content="${canonical}">`);
  const image = ctx.siteUrl === undefined ? undefined : shareImage(ctx, page);
  if (image) {
    lines.push(
      html`<meta property="og:image" content="${ctx.absoluteUrl(`assets/images/${shareFile(image.src)}`)}">`,
      html`<meta property="og:image:width" content="${SHARE_WIDTH}">`,
      html`<meta property="og:image:height" content="${SHARE_HEIGHT}">`,
    );
    if (image.alt.trim() !== "") {
      lines.push(html`<meta property="og:image:alt" content="${image.alt}">`);
    }
  }
  lines.push(
    html`<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
  );
  return lines;
}

/** The page's own share image, else the site's default. */
function shareImage(ctx: RenderContext, page: Subject): NodeOfType<"image"> | undefined {
  const id = page.shareImageId ?? ctx.site.share_image.nodes[0];
  return id === undefined ? undefined : ctx.node(id, "image");
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const filled = (value: string) => value.trim() !== "";

/** Whether a location says where the business is: a street, a city or a phone. */
const isPlace = (location: LocationInfo) =>
  filled(location.street) || filled(location.city) || filled(location.phone);

/**
 * The organization entry (business-info design.md decision 5). With one location, an
 * `Organization` until that location has a street, city or phone, then the business's own type
 * with the location's details. With several, always an `Organization`; the locations get their
 * own entries (`locationEntries`). The `@id` stays the same, so the website's publisher matches.
 */
function organizationData(ctx: RenderContext, url: string): Record<string, unknown> {
  const { site, business } = ctx;
  const [only, ...others] = business.locations;
  const single = only !== undefined && others.length === 0 && isPlace(only) ? only : undefined;
  const organization: Record<string, unknown> = {
    "@type": single ? business.business_type : "Organization",
    "@id": `${url}#organization`,
    name: filled(business.name) ? business.name : site.name,
    url,
  };
  const logoId = site.logo.nodes[0];
  const logo = logoId === undefined ? undefined : ctx.node(logoId, "image");
  const logoWidth = logo ? srcVariant(logo.width) : undefined;
  if (logo && logoWidth !== undefined) {
    organization.logo = ctx.absoluteUrl(`assets/images/${imageFile(logo.src, logoWidth)}`);
  } else if (site.favicon.nodes.length > 0) {
    organization.logo = ctx.absoluteUrl("icon-512.png");
  }
  if (business.social.length > 0) organization.sameAs = business.social;
  // The business's offer is its services collection, whether or not a page shows them; prices
  // are free text, so they're left out (business-collections design decision 7).
  const services = ctx
    .children(site.services)
    .flatMap((item) => (item.type === "service_item" ? [item] : []));
  if (services.length > 0) {
    organization.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: ctx.strings.servicesLabel,
      itemListElement: services.map((service) => {
        const offered: Record<string, string> = { "@type": "Service", name: service.name.content };
        if (service.description.content.trim() !== "") {
          offered.description = service.description.content;
        }
        return { "@type": "Offer", itemOffered: offered };
      }),
    };
  }
  if (single) Object.assign(organization, placeData(single));
  return organization;
}

/**
 * With several locations, one entry per location that says where it is (business-locations
 * design decision 4), each pointing at the organization.
 */
function locationEntries(ctx: RenderContext, url: string): Record<string, unknown>[] {
  const { business, site } = ctx;
  if (business.locations.length < 2) return [];
  const businessName = filled(business.name) ? business.name : site.name;
  return business.locations.flatMap((location, index) =>
    isPlace(location)
      ? [
          {
            "@type": business.business_type,
            "@id": `${url}#location-${index + 1}`,
            name: `${businessName} – ${location.name}`,
            ...placeData(location),
            parentOrganization: { "@id": `${url}#organization` },
          },
        ]
      : [],
  );
}

/** A location's postal address, phone, email, map and opening hours, each when filled in. */
function placeData(location: LocationInfo): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const address: Record<string, string> = { "@type": "PostalAddress" };
  if (filled(location.street)) address.streetAddress = location.street;
  if (filled(location.postal_code)) address.postalCode = location.postal_code;
  if (filled(location.city)) address.addressLocality = location.city;
  if (filled(location.country)) address.addressCountry = location.country;
  // The default country alone says nothing about where the business is.
  if (Object.keys(address).some((key) => key !== "@type" && key !== "addressCountry")) {
    data.address = address;
  }
  if (filled(location.phone)) data.telephone = location.phone;
  if (filled(location.email)) data.email = location.email;
  if (filled(location.map_url)) data.hasMap = location.map_url;

  // One entry per distinct range, listing the days that have it, in order of first use.
  const byRange = new Map<string, { opens: string; closes: string; days: string[] }>();
  location.days.forEach((day, index) => {
    for (const range of day.ranges) {
      const key = `${range.opens}-${range.closes}`;
      const entry = byRange.get(key) ?? { ...range, days: [] };
      entry.days.push(DAY_NAMES[index] as string);
      byRange.set(key, entry);
    }
  });
  if (byRange.size > 0) {
    data.openingHoursSpecification = [...byRange.values()].map((entry) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: entry.days,
      opens: entry.opens,
      closes: entry.closes,
    }));
  }
  return data;
}

/** JSON-LD `WebSite` and the organization for the home page, when the site's address is known. */
function structuredData(ctx: RenderContext): Html | undefined {
  const { site } = ctx;
  const url = ctx.canonicalUrl(ctx.homeId);
  if (url === undefined) return undefined;
  const website: Record<string, unknown> = {
    "@type": "WebSite",
    "@id": `${url}#website`,
    url,
    name: site.name,
    inLanguage: site.lang,
  };
  if (site.description.trim() !== "") website.description = site.description;
  website.publisher = { "@id": `${url}#organization` };
  const organization = organizationData(ctx, url);
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [website, organization, ...locationEntries(ctx, url)],
  });
  // `<` can't appear literally, so no text can end the script element early.
  return raw(`<script type="application/ld+json">${json.replaceAll("<", "\\u003c")}</script>`);
}
