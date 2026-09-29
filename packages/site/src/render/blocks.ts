import type { AnyNode, NodeOfType } from "../schema/index.js";
import type { RenderContext } from "./context.js";
import { type Html, html } from "./html.js";
import { isEmpty, renderText } from "./text.js";

export function renderBlock(block: AnyNode, ctx: RenderContext): Html {
  switch (block.type) {
    case "hero":
      return renderHero(block, ctx);
    case "rich_text":
      return renderRichText(block, ctx);
    case "services":
      return renderServices(block, ctx);
    default:
      throw new Error(`${block.id} of type ${block.type} is not a block.`);
  }
}

/** The hero's heading is the page's `<h1>`; validation keeps heroes first on a page. */
function renderHero(hero: NodeOfType<"hero">, ctx: RenderContext): Html {
  const [image] = ctx.children(hero.image);
  const [action] = ctx.children(hero.action);
  return html`<section class="block hero">
      <div class="container hero-inner">
        <div class="hero-content">
          <h1>${renderText(hero.heading, ctx)}</h1>${
            !isEmpty(hero.text) &&
            html`
          <p class="hero-text">${renderText(hero.text, ctx)}</p>`
          }${
            action &&
            html`
          <p class="hero-action">${renderLink(action, ctx, "button")}</p>`
          }
        </div>${
          image?.type === "image" &&
          html`
        ${renderImage(image, ctx, { lazy: false, className: "hero-image" })}`
        }
      </div>
    </section>`;
}

function renderRichText(block: NodeOfType<"rich_text">, ctx: RenderContext): Html {
  const children = ctx.children(block.body).map((child) => {
    switch (child.type) {
      case "paragraph":
        return html`
        <p>${renderText(child.content, ctx)}</p>`;
      case "subheading":
        return child.level === 2
          ? html`
        <h2>${renderText(child.content, ctx)}</h2>`
          : html`
        <h3>${renderText(child.content, ctx)}</h3>`;
      case "list":
        return html`
        <ul>${ctx.children(child.items).map(
          (item) =>
            item.type === "list_item" &&
            html`
          <li>${renderText(item.content, ctx)}</li>`,
        )}
        </ul>`;
      default:
        throw new Error(`${child.id} of type ${child.type} cannot appear in rich text.`);
    }
  });
  return html`<section class="block rich-text">
      <div class="container">${children}
      </div>
    </section>`;
}

function renderServices(block: NodeOfType<"services">, ctx: RenderContext): Html {
  const items = ctx.children(block.items).map(
    (item) =>
      item.type === "service_item" &&
      html`
          <li class="service">
            <p class="service-name">${renderText(item.name, ctx)}</p>${
              !isEmpty(item.description) &&
              html`
            <p class="service-description">${renderText(item.description, ctx)}</p>`
            }${
              !isEmpty(item.price) &&
              html`
            <p class="service-price">${renderText(item.price, ctx)}</p>`
            }
          </li>`,
  );
  return html`<section class="block services">
      <div class="container">${
        !isEmpty(block.heading) &&
        html`
        <h2>${renderText(block.heading, ctx)}</h2>`
      }
        <ul class="services-list">${items}
        </ul>
      </div>
    </section>`;
}

export function renderImage(
  image: NodeOfType<"image">,
  ctx: RenderContext,
  options: { lazy: boolean; className?: string },
): Html {
  const alt = image.decorative ? "" : image.alt;
  const size = image.width > 0 && image.height > 0;
  return html`<img${options.className && html` class="${options.className}"`} src="${ctx.url(`assets/images/${image.src}`)}" alt="${alt}"${
    size && html` width="${image.width}" height="${image.height}"`
  }${options.lazy && html` loading="lazy"`}>`;
}

/** A `page_link` or `external_link` node as an `<a>`. */
export function renderLink(
  link: AnyNode,
  ctx: RenderContext,
  className?: string,
  current?: boolean,
): Html {
  const cls = className && html` class="${className}"`;
  const aria = current && html` aria-current="page"`;
  switch (link.type) {
    case "page_link":
      return html`<a${cls} href="${ctx.pageUrl(link.page_id)}"${aria}>${renderText(link.label, ctx)}</a>`;
    case "external_link":
      return html`<a${cls} href="${ctx.href(link.url)}">${renderText(link.label, ctx)}</a>`;
    default:
      throw new Error(`${link.id} of type ${link.type} is not a link.`);
  }
}
