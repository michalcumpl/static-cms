import type { NodeOfType } from "../schema/index.js";
import { renderBlock, renderImage, renderLink, siteLogoSizes } from "./blocks.js";
import { contactDetails, openingHoursTable } from "./business.js";
import type { RenderContext } from "./context.js";
import { renderHead } from "./head.js";
import { type Html, html, raw } from "./html.js";
import { siteStrings } from "./strings.js";

export function renderPage(page: NodeOfType<"page">, ctx: RenderContext): Html {
  const { site } = ctx;
  const isHome = ctx.homeId === page.id;
  const title = isHome ? site.name : `${page.title} – ${site.name}`;
  const own = page.seo_description.trim() !== "" ? page.seo_description : site.description;
  const description = own.trim() === "" ? "" : own;
  const blocks = ctx.children(page.blocks);
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
function renderDocument(
  ctx: RenderContext,
  head: Html,
  main: Html,
  currentPageId?: string,
  translationKey?: string,
): Html {
  const { site } = ctx;
  const nav = ctx.node(site.nav, "nav");
  return html`<!doctype html>
<html lang="${site.lang}">
  <head>${head}
  </head>
  <body>
    <header class="site-header">
      <div class="container">
        <a class="site-name" href="${ctx.pageUrl(ctx.homeId)}">${siteBrand(ctx)}</a>
        <nav class="site-nav"${ctx.multilingual && html` aria-label="${ctx.strings.menuLabel}"`}>
          <ul>${ctx.children(nav.items).map(
            (item) => html`
            <li>${renderLink(item, ctx, undefined, item.type === "page_link" && item.page_id === currentPageId)}</li>`,
          )}
          </ul>
        </nav>${languageSwitcher(ctx, translationKey)}
      </div>
    </header>
    <main>${main}
    </main>
    <footer class="site-footer">
      <div class="container">${footerDetails(ctx)}
        <p>© ${site.name}</p>
      </div>
    </footer>
  </body>
</html>
`;
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

/**
 * The business's contact details and opening hours for the footer, when its switch is on and
 * anything is filled in; the business name is shown when it differs from the site's.
 */
function footerDetails(ctx: RenderContext): Html | false {
  const { business, strings, site } = ctx;
  if (!business.show_in_footer) return false;
  const name = business.name.trim() !== "" && business.name !== site.name ? business.name : "";
  const contact = contactDetails(business, strings, undefined, name);
  const hours = openingHoursTable(business, strings);
  if (!contact && !hours) return false;
  return html`
        <div class="footer-business">${[contact, hours].map(
          (part) =>
            part &&
            html`
          ${indent(part, "          ")}`,
        )}
        </div>`;
}

/** Indents every line after the first; block markup is written relative to its own start. */
function indent(markup: Html, by: string): Html {
  return raw(markup.value.replaceAll("\n", `\n${by}`));
}
