import { imageFile, imageVariants, srcVariant } from "../images.js";
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
    case "text_with_image":
      return renderTextWithImage(block, ctx);
    case "gallery":
      return renderGallery(block, ctx);
    case "team":
      return renderTeam(block, ctx);
    case "logos":
      return renderLogos(block, ctx);
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
        ${renderImage(image, ctx, { lazy: false, sizes: IMAGE_SIZES.hero, className: "hero-image" })}`
        }
      </div>
    </section>`;
}

function renderRichText(block: NodeOfType<"rich_text">, ctx: RenderContext): Html {
  return html`<section class="block rich-text">
      <div class="container">${ctx.children(block.body).map((child) => renderBodyChild(child, ctx))}
      </div>
    </section>`;
}

/** A paragraph, subheading or list of a text body. */
function renderBodyChild(child: AnyNode, ctx: RenderContext): Html {
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
}

/** An optional block heading, always an `<h2>`. */
function blockHeading(
  heading: NodeOfType<"services">["heading"],
  ctx: RenderContext,
): Html | false {
  return (
    !isEmpty(heading) &&
    html`
        <h2>${renderText(heading, ctx)}</h2>`
  );
}

/** The image of a node's 0..1 `image` list, if it has one. */
function imageOf(owner: { image: { nodes: string[] } }, ctx: RenderContext) {
  const [image] = ctx.children(owner.image);
  return image?.type === "image" ? image : undefined;
}

function renderTextWithImage(block: NodeOfType<"text_with_image">, ctx: RenderContext): Html {
  const image = imageOf(block, ctx);
  return html`<section class="block text-with-image image-${block.image_side}">
      <div class="container twi-inner">
        <div class="twi-text">${blockHeading(block.heading, ctx)}${ctx
          .children(block.body)
          .map((child) => renderBodyChild(child, ctx))}
        </div>${
          image &&
          html`
        <div class="twi-image">${renderImage(image, ctx, { lazy: true, sizes: IMAGE_SIZES.textWithImage })}</div>`
        }
      </div>
    </section>`;
}

function renderGallery(block: NodeOfType<"gallery">, ctx: RenderContext): Html {
  const items = ctx.children(block.items).map((item) => {
    if (item.type !== "gallery_item") return false;
    const image = imageOf(item, ctx);
    if (!image) return false;
    // No script on published pages: the largest variant opens as a plain link.
    const largest = imageVariants(image.width).at(-1) ?? image.width;
    return html`
          <li>
            <figure>
              <a href="${ctx.url(`assets/images/${imageFile(image.src, largest)}`)}">${renderImage(image, ctx, { lazy: true, sizes: IMAGE_SIZES.gallery })}</a>${
                !isEmpty(item.caption) &&
                html`
              <figcaption>${renderText(item.caption, ctx)}</figcaption>`
              }
            </figure>
          </li>`;
  });
  return html`<section class="block gallery">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="gallery-grid">${items}
        </ul>
      </div>
    </section>`;
}

function renderTeam(block: NodeOfType<"team">, ctx: RenderContext): Html {
  // Names sit one level below the block heading, so no heading level is skipped.
  const nameTag = isEmpty(block.heading) ? "h2" : "h3";
  const people = ctx.children(block.people).map((person) => {
    if (person.type !== "person") return false;
    const image = imageOf(person, ctx);
    const name = renderText(person.name, ctx);
    return html`
          <li class="person">${
            image &&
            html`
            ${renderImage(image, ctx, { lazy: true, sizes: IMAGE_SIZES.portrait, className: "portrait" })}`
          }
            ${nameTag === "h2" ? html`<h2 class="person-name">${name}</h2>` : html`<h3 class="person-name">${name}</h3>`}${
              !isEmpty(person.role) &&
              html`
            <p class="person-role">${renderText(person.role, ctx)}</p>`
            }${
              !isEmpty(person.text) &&
              html`
            <p class="person-text">${renderText(person.text, ctx)}</p>`
            }
          </li>`;
  });
  return html`<section class="block team">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="team-list">${people}
        </ul>
      </div>
    </section>`;
}

function renderLogos(block: NodeOfType<"logos">, ctx: RenderContext): Html {
  const logos = ctx.children(block.items).map((logo) => {
    if (logo.type !== "logo_item") return false;
    const image = imageOf(logo, ctx);
    if (!image) return false;
    // The partner's name is the logo's description.
    const img = renderImage({ ...image, alt: logo.name.content, decorative: false }, ctx, {
      lazy: true,
      sizes: IMAGE_SIZES.logo,
    });
    const href =
      logo.page_id !== "" ? ctx.pageUrl(logo.page_id) : logo.url !== "" ? ctx.href(logo.url) : "";
    return html`
          <li>${href ? html`<a href="${href}">${img}</a>` : img}</li>`;
  });
  return html`<section class="block logos">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="logo-row">${logos}
        </ul>
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

/**
 * `sizes` per block. They follow each block's layout (see css.ts) and never the theme, so a
 * theme change leaves the HTML alone.
 */
export const IMAGE_SIZES = {
  /** The image column is 2/5 of the hero from a 48rem wide layout. */
  hero: "(min-width: 48rem) 40vw, 100vw",
  /** Half the width beside the text from 48rem. */
  textWithImage: "(min-width: 48rem) 50vw, 100vw",
  /** Three columns from 48rem, two below. */
  gallery: "(min-width: 48rem) 33vw, 50vw",
  portrait: "10rem",
  logo: "12rem",
} as const;

/**
 * An image as `<img>` over its WebP variants. `sizes` comes from the block, never the theme,
 * so theme changes leave the HTML alone.
 */
export function renderImage(
  image: NodeOfType<"image">,
  ctx: RenderContext,
  options: { lazy: boolean; sizes: string; className?: string },
): Html {
  const alt = image.decorative ? "" : image.alt;
  const file = (w: number) => ctx.url(`assets/images/${imageFile(image.src, w)}`);
  const srcset = imageVariants(image.width)
    .map((w) => `${file(w)} ${w}w`)
    .join(", ");
  return html`<img${options.className && html` class="${options.className}"`} src="${file(srcVariant(image.width) ?? image.width)}" srcset="${srcset}" sizes="${options.sizes}" alt="${alt}" width="${image.width}" height="${image.height}"${options.lazy && html` loading="lazy"`}>`;
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
