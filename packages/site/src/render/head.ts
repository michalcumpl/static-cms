import { shareFile } from "../images.js";
import type { NodeOfType } from "../schema/index.js";
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
}

/**
 * A page's `<head>` contents (seo-and-metadata design.md decision 4), in a fixed order:
 * title, description, stylesheet, canonical link, favicon links, Open Graph, Twitter card and,
 * on the home page, structured data. Tags that need an absolute URL appear only when the
 * site's address is known. Without `page` (the not-found page) there are no page tags.
 */
export function renderHead(ctx: RenderContext, options: HeadOptions): Html {
  const { page } = options;
  const lines: Html[] = [
    html`<meta charset="utf-8">`,
    html`<meta name="viewport" content="width=device-width, initial-scale=1">`,
    html`<title>${options.title}</title>`,
  ];
  if (options.description !== "") {
    lines.push(html`<meta name="description" content="${options.description}">`);
  }
  lines.push(html`<link rel="stylesheet" href="${ctx.url("assets/style.css")}">`);
  const canonical = page && ctx.canonicalUrl(page.id);
  if (canonical) lines.push(html`<link rel="canonical" href="${canonical}">`);
  if (ctx.site.favicon.nodes.length > 0) {
    lines.push(
      html`<link rel="icon" href="${ctx.url("favicon.ico")}" sizes="32x32">`,
      html`<link rel="icon" href="${ctx.url("icon-512.png")}" type="image/png" sizes="512x512">`,
      html`<link rel="apple-touch-icon" href="${ctx.url("apple-touch-icon.png")}">`,
    );
  }
  if (page) {
    lines.push(...shareMetadata(ctx, page, options.description, canonical));
    if (page.id === ctx.homeId) {
      const data = structuredData(ctx);
      if (data) lines.push(data);
    }
  }
  return raw(lines.map((line) => `\n    ${line.value}`).join(""));
}

function shareMetadata(
  ctx: RenderContext,
  page: NodeOfType<"page">,
  description: string,
  canonical: string | undefined,
): Html[] {
  const { site } = ctx;
  const isHome = page.id === ctx.homeId;
  const lines = [
    html`<meta property="og:type" content="website">`,
    html`<meta property="og:site_name" content="${site.name}">`,
    html`<meta property="og:title" content="${isHome ? site.name : page.title}">`,
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
function shareImage(ctx: RenderContext, page: NodeOfType<"page">): NodeOfType<"image"> | undefined {
  const id = page.share_image.nodes[0] ?? ctx.site.share_image.nodes[0];
  return id === undefined ? undefined : ctx.node(id, "image");
}

/** JSON-LD `WebSite` and `Organization` for the home page, when the site's address is known. */
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
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${url}#organization`,
    name: site.name,
    url,
  };
  if (site.favicon.nodes.length > 0) organization.logo = ctx.absoluteUrl("icon-512.png");
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [website, organization],
  });
  // `<` can't appear literally, so no text can end the script element early.
  return raw(`<script type="application/ld+json">${json.replaceAll("<", "\\u003c")}</script>`);
}
