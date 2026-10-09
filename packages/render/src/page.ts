import type { AnyNode, NodeOfType } from "@webmio/model";
import { socialKind } from "@webmio/model";
import { renderBlock, renderImage, renderLink, siteLogoSizes } from "./blocks.js";
import { footerBusiness } from "./business.js";
import type { RenderContext } from "./context.js";
import { renderHead } from "./head.js";
import { type Html, html, raw } from "./html.js";
import { siteStrings } from "./strings.js";
import { renderText } from "./text.js";

export function renderPage(page: NodeOfType<"page">, ctx: RenderContext): Html {
  const { site } = ctx;
  ctx.startPage();
  const isHome = ctx.homeId === page.id;
  const title = isHome ? site.name : `${page.title} – ${site.name}`;
  const own = page.seo_description.trim() !== "" ? page.seo_description : site.description;
  const description = own.trim() === "" ? "" : own;
  // A hidden block, and a collection block with nothing to show, render nothing.
  const blocks = ctx.visibleBlocks(page);
  const heroIsH1 = blocks[0]?.type === "hero";

  const main = html`${
    !heroIsH1 &&
    html`
      <div class="container">
        <h1 class="page-title">${page.title}</h1>
      </div>`
  }${blocks.map(
    (block) => html`
      ${indent(renderBlock(block, ctx), "  ")}`,
  )}`;
  return renderDocument(
    ctx,
    renderHead(ctx, { title, description, page }),
    main,
    page.id,
    page.translation_key,
  );
}

/**
 * The page served for addresses the site doesn't have (`404.html`): the site's header, menu
 * and footer around a heading and a link home, in the site's language. Its links are absolute
 * paths, so it works at any address.
 */
export function renderNotFound(ctx: RenderContext): Html {
  const strings = siteStrings(ctx.site.lang);
  const title = `${strings.notFoundHeading} – ${ctx.site.name}`;
  const main = html`
      <div class="container">
        <h1 class="page-title">${strings.notFoundHeading}</h1>
        <p>${strings.notFoundText}</p>
        <p><a href="${ctx.pageUrl(ctx.homeId)}">${strings.backHome}</a></p>
      </div>`;
  return renderDocument(ctx, renderHead(ctx, { title, description: "" }), main);
}

/**
 * What the header's link home shows: the name; the logo, described by nothing because the name
 * follows; or the logo alone, described by the name. Without a logo it is always the name.
 */
function siteBrand(ctx: RenderContext): Html {
  const { site } = ctx;
  const logoId = site.logo.nodes[0];
  const logo = logoId === undefined ? undefined : ctx.node(logoId, "image");
  if (!logo) return html`${site.name}`;
  const image = renderImage(logo, ctx, {
    lazy: false,
    sizes: siteLogoSizes(logo),
    className: "site-logo",
    alt: site.header_show_name ? "" : site.name,
  });
  return site.header_show_name ? html`${image}<span>${site.name}</span>` : image;
}

/** A whole HTML document: head, the site's header and menu, `main`, and the footer. */
export function renderDocument(
  ctx: RenderContext,
  head: Html,
  main: Html,
  currentPageId?: string,
  translationKey?: string,
): Html {
  const { site } = ctx;
  // Several navigation landmarks each need their own name.
  const social = socialLinks(ctx);
  const labelMenu = ctx.multilingual || social !== false;
  // Before the head is written: the logo is an image too.
  const brand = siteBrand(ctx);
  return html`<!doctype html>
<html lang="${site.lang}">
  <head>${head}${focalPointStyle(ctx)}
  </head>
  <body>
    <header class="site-header">
      <div class="container">
        <a class="site-name" href="${ctx.pageUrl(ctx.homeId)}">${brand}</a>
        <nav class="site-nav"${labelMenu && html` aria-label="${ctx.strings.menuLabel}"`}>
          <ul>${ctx.menuItems().map((item) =>
            item.type === "menu_group"
              ? html`
            <li class="menu-group">
              <details name="site-menu">
                <summary>${renderText(item.label, ctx)}</summary>
                <ul>${ctx.children(item.items).map(
                  (link) => html`
                  <li>${menuLink(link, ctx, currentPageId)}</li>`,
                )}
                </ul>
              </details>
            </li>`
              : html`
            <li>${menuLink(item, ctx, currentPageId)}</li>`,
          )}
          </ul>
        </nav>${languageSwitcher(ctx, translationKey)}
      </div>
    </header>
    <main>${main}
    </main>
    <footer class="site-footer">
      <div class="container">${footerBusiness(ctx.business, ctx.strings, ctx.site.name)}${social}
        <p>© ${site.name}</p>
      </div>
    </footer>
  </body>
</html>
`;
}

/** The rules for the page's off-centre focal points, or nothing when it has none. */
function focalPointStyle(ctx: RenderContext): Html | false {
  if (ctx.pageFocalPoints.size === 0) return false;
  const rules = [...ctx.pageFocalPoints]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, [x, y]]) => `.${name}{object-position:${x}% ${y}%}`)
    .join("");
  return html`
    <style>${rules}</style>`;
}

/** A link of the menu, marked when it leads to the page being rendered. */
function menuLink(link: AnyNode, ctx: RenderContext, currentPageId?: string): Html {
  return renderLink(
    link,
    ctx,
    undefined,
    link.type === "page_link" && link.page_id === currentPageId,
  );
}

/**
 * Links to the other languages: the same page (by translation key) where it exists, else that
 * language's home page. Only for sites with two or more languages.
 */
function languageSwitcher(ctx: RenderContext, translationKey?: string): Html | false {
  if (!ctx.multilingual) return false;
  const items = ctx.languages.map((language) => {
    const href =
      (translationKey !== undefined && language.pages.get(translationKey)) || language.home;
    const current = language.lang === ctx.site.lang && html` aria-current="true"`;
    return html`
            <li><a href="${href}" lang="${language.lang}" hreflang="${language.lang}"${current}>${language.name}</a></li>`;
  });
  return html`
        <nav class="language-switcher" aria-label="${ctx.strings.languageLabel}">
          <ul>${items}
          </ul>
        </nav>`;
}

/** The social profiles as text links, when the footer switch is on (business-collections). */
function socialLinks(ctx: RenderContext): Html | false {
  const { business, strings } = ctx;
  if (!business.show_in_footer || business.social.length === 0) return false;
  return html`
        <nav class="footer-social" aria-label="${strings.socialLabel}">
          <ul>${business.social.map(
            (url) => html`
            <li><a href="${url}">${socialKind(url).label || url}</a></li>`,
          )}
          </ul>
        </nav>`;
}

/** Indents every line after the first; block markup is written relative to its own start. */
export function indent(markup: Html, by: string): Html {
  return raw(markup.value.replaceAll("\n", `\n${by}`));
}
