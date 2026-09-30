import type { NodeOfType } from "../schema/index.js";
import { renderBlock, renderLink } from "./blocks.js";
import type { RenderContext } from "./context.js";
import { type Html, html, raw } from "./html.js";

export function renderPage(page: NodeOfType<"page">, ctx: RenderContext): Html {
  const { site } = ctx;
  const isHome = ctx.homeId === page.id;
  const title = isHome ? site.name : `${page.title} – ${site.name}`;
  const canonical = ctx.canonicalUrl(page.id);
  const blocks = ctx.children(page.blocks);
  const heroIsH1 = blocks[0]?.type === "hero";
  const nav = ctx.node(site.nav, "nav");

  return html`<!doctype html>
<html lang="${site.lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>${
      page.seo_description.trim() !== "" &&
      html`
    <meta name="description" content="${page.seo_description}">`
    }
    <link rel="stylesheet" href="${ctx.url("assets/style.css")}">${
      canonical &&
      html`
    <link rel="canonical" href="${canonical}">`
    }
  </head>
  <body>
    <header class="site-header">
      <div class="container">
        <a class="site-name" href="${ctx.pageUrl(ctx.homeId)}">${site.name}</a>
        <nav class="site-nav">
          <ul>${ctx.children(nav.items).map(
            (item) => html`
            <li>${renderLink(item, ctx, undefined, item.type === "page_link" && item.page_id === page.id)}</li>`,
          )}
          </ul>
        </nav>
      </div>
    </header>
    <main>${
      !heroIsH1 &&
      html`
      <div class="container">
        <h1 class="page-title">${page.title}</h1>
      </div>`
    }${blocks.map(
      (block) => html`
      ${indent(renderBlock(block, ctx), "  ")}`,
    )}
    </main>
    <footer class="site-footer">
      <div class="container">
        <p>© ${site.name}</p>
      </div>
    </footer>
  </body>
</html>
`;
}

/** Indents every line after the first; block markup is written relative to its own start. */
function indent(markup: Html, by: string): Html {
  return raw(markup.value.replaceAll("\n", `\n${by}`));
}
