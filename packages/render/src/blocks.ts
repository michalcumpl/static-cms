import type { AnyNode, NodeOfType } from "@webmio/model";
import { imageFile, imageVariants, slideClip, srcVariant, videoEmbed } from "@webmio/model";
import {
  contactDetails,
  formatPhone,
  type LocationInfo,
  locationsBody,
  openingHoursTable,
} from "./business.js";
import type { RenderContext } from "./context.js";
import { type Html, html } from "./html.js";
import { renderProjects } from "./items.js";
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
    case "contact":
      return renderContact(block, ctx);
    case "opening_hours":
      return renderOpeningHours(block, ctx);
    case "call_to_action":
      return renderCallToAction(block, ctx);
    case "testimonials":
      return renderTestimonials(block, ctx);
    case "faq":
      return renderFaq(block, ctx);
    case "figures":
      return renderFigures(block, ctx);
    case "steps":
      return renderSteps(block, ctx);
    case "projects":
      return renderProjects(block, ctx);
    case "cards":
      return renderCards(block, ctx);
    case "videos":
      return renderVideos(block, ctx);
    case "jobs":
      return renderJobs(block, ctx);
    default:
      throw new Error(`${block.id} of type ${block.type} is not a block.`);
  }
}

/** The hero's heading is the page's `<h1>`; validation keeps heroes first on a page. */
function renderHero(hero: NodeOfType<"hero">, ctx: RenderContext): Html {
  const [image] = ctx.children(hero.image);
  const [action] = ctx.children(hero.action);
  // A slideshow needs two slides; with fewer it shows as a full photo (hero-slideshow).
  const slides = ctx.children(hero.slides).filter((slide) => slide.type === "slide");
  if (hero.layout === "slideshow" && slides.length >= 2) {
    return renderSlideshow(hero, slides as NodeOfType<"slide">[], ctx);
  }
  // A full-photo hero puts its image behind the text; without an image it is a usual hero.
  if ((hero.layout === "cover" || hero.layout === "slideshow") && image?.type === "image") {
    return html`<section class="block hero hero-cover">
      ${renderImage(image, ctx, { lazy: false, sizes: IMAGE_SIZES.heroCover, className: "hero-image" })}
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
        </div>
      </div>
    </section>`;
  }
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

/**
 * The hero as a slideshow (hero-slideshow design decision 3): a carousel region of slides, each a
 * photo with its title over it (a link when the slide has one), then the hero's heading, text and
 * button. Without the slideshow script the slides form a row that can be scrolled.
 */
function renderSlideshow(
  hero: NodeOfType<"hero">,
  slides: NodeOfType<"slide">[],
  ctx: RenderContext,
): Html {
  ctx.useScript("slideshow");
  const [action] = ctx.children(hero.action);
  const { strings } = ctx;
  const labels = JSON.stringify({
    play: strings.play,
    pause: strings.pause,
    previous: strings.previousSlide,
    next: strings.nextSlide,
    show: strings.showSlide,
  });
  const items = slides.map((slide, i) => {
    const [image] = ctx.children(slide.image);
    const href =
      slide.url !== ""
        ? ctx.href(slide.url)
        : slide.target_id !== "" && ctx.routes.has(slide.target_id)
          ? ctx.pageUrl(slide.target_id)
          : undefined;
    const title = href
      ? html`<a href="${href}">${renderText(slide.title, ctx)}</a>`
      : renderText(slide.title, ctx);
    const position = strings.slideOf
      .replace("{n}", String(i + 1))
      .replace("{count}", String(slides.length));
    return html`
          <li class="slide" role="group" aria-roledescription="slide" aria-label="${position}">${
            image?.type === "image" &&
            html`
            ${renderImage(image, ctx, { lazy: i > 0, sizes: IMAGE_SIZES.heroCover, className: "slide-image" })}`
          }${
            // A clip from Vimeo: its address only in data-src, so only the script loads it.
            slideClip(slide.clip_url) &&
            html`
            <video class="slide-clip" muted playsinline preload="none" aria-hidden="true" data-src="${slide.clip_url}"></video>`
          }
            <p class="slide-title">${title}</p>
          </li>`;
  });
  return html`<section class="block hero hero-slideshow">
      <section class="slideshow" aria-roledescription="carousel" aria-label="${hero.heading.content}" data-labels="${labels}">
        <ul class="slides">${items}
        </ul>
      </section>
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
        </div>
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
export function renderBodyChild(child: AnyNode, ctx: RenderContext): Html {
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
export function blockHeading(
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
  const whole = block.image_fit === "whole" ? " gallery-whole" : "";
  return html`<section class="block gallery${whole}">
      <div class="container">${blockHeading(block.heading, ctx)}${galleryGrid(block.items, ctx)}
      </div>
    </section>`;
}

/** Gallery items as the gallery's grid of linked, captioned images (also a project's photos). */
export function galleryGrid(itemIds: { nodes: string[] }, ctx: RenderContext): Html {
  const items = ctx.children(itemIds).map((item) => {
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
  return html`
        <ul class="gallery-grid">${items}
        </ul>`;
}

function renderTeam(block: NodeOfType<"team">, ctx: RenderContext): Html {
  // Names sit one level below the block heading, so no heading level is skipped.
  const nameTag = isEmpty(block.heading) ? "h2" : "h3";
  // A team list leaves portraits out, so they aren't downloaded either (block-variants).
  const list = block.layout === "list";
  const people = ctx.items(block).map((person) => {
    if (person.type !== "person") return false;
    const image = list ? undefined : imageOf(person, ctx);
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
  return html`<section class="block team${list ? " team-as-list" : ""}">
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

/** The site's contact details; the block holds only its heading and which parts to show. */
function renderContact(block: NodeOfType<"contact">, ctx: RenderContext): Html {
  const parts = {
    address: block.show_address,
    phone: block.show_phone,
    email: block.show_email,
    map: block.show_map,
  };
  return locationsBlock(block, "contact", ctx, (location) =>
    contactDetails(location, ctx.strings, parts),
  );
}

/** The locations' opening hours; the block holds only its heading and location choice. */
function renderOpeningHours(block: NodeOfType<"opening_hours">, ctx: RenderContext): Html {
  return locationsBlock(block, "opening-hours", ctx, (location) =>
    openingHoursTable(location, ctx.strings),
  );
}

/**
 * A business block for the locations it shows (business-locations, "Business blocks for several
 * locations"): one location renders as before, several each under its name, one heading level
 * below the block's. Locations with nothing to show are left out.
 */
function locationsBlock(
  block: NodeOfType<"contact"> | NodeOfType<"opening_hours">,
  cls: string,
  ctx: RenderContext,
  render: (location: LocationInfo) => Html | false,
): Html {
  const locations = ctx.locationsFor(block.location_id);
  const body = locationsBody(locations, render, isEmpty(block.heading) ? "h2" : "h3");
  return html`<section class="block ${cls}">
      <div class="container">${blockHeading(block.heading, ctx)}${body}
      </div>
    </section>`;
}

/** A band with a heading, an optional text and one or two buttons (the second secondary). */
function renderCallToAction(block: NodeOfType<"call_to_action">, ctx: RenderContext): Html {
  const buttons = ctx
    .children(block.actions)
    .map((link, index) =>
      renderLink(link, ctx, index === 0 ? "button" : "button button-secondary"),
    );
  return html`<section class="block cta">
      <div class="container">
        <h2>${renderText(block.heading, ctx)}</h2>${
          !isEmpty(block.text) &&
          html`
        <p class="cta-text">${renderText(block.text, ctx)}</p>`
        }${
          buttons.length > 0 &&
          html`
        <p class="cta-actions">${buttons.map(
          (button) => html`
          ${button}`,
        )}
        </p>`
        }
      </div>
    </section>`;
}

/** Quotes with the person's name, detail and optional photo; no review markup (decision 4). */
function renderTestimonials(block: NodeOfType<"testimonials">, ctx: RenderContext): Html {
  const items = ctx.items(block).map((item) => {
    if (item.type !== "testimonial") return false;
    const image = imageOf(item, ctx);
    return html`
          <li>
            <figure class="testimonial">
              <blockquote><p>${renderText(item.quote, ctx)}</p></blockquote>
              <figcaption>${
                image &&
                html`
                ${renderImage(image, ctx, { lazy: true, sizes: IMAGE_SIZES.testimonial, className: "testimonial-photo" })}`
              }
                <span class="testimonial-name">${renderText(item.name, ctx)}</span>${
                  !isEmpty(item.detail) &&
                  html`
                <span class="testimonial-detail">${renderText(item.detail, ctx)}</span>`
                }
              </figcaption>
            </figure>
          </li>`;
  });
  return html`<section class="block testimonials">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="testimonial-list">${items}
        </ul>
      </div>
    </section>`;
}

/** Questions that open without JavaScript (business-collections, "Block rendering"). */
function renderFaq(block: NodeOfType<"faq">, ctx: RenderContext): Html {
  const items = ctx.items(block).map(
    (item) =>
      item.type === "faq_item" &&
      html`
        <details>
          <summary>${renderText(item.question, ctx)}</summary>
          <p>${renderText(item.answer, ctx)}</p>
        </details>`,
  );
  return html`<section class="block faq">
      <div class="container">${blockHeading(block.heading, ctx)}${items}
      </div>
    </section>`;
}

/**
 * How many figures (or cards) share a row on wider screens: all of them up to four, else three,
 * so six make two even rows instead of five and one.
 */
export function figureColumns(count: number): number {
  return count <= 4 ? Math.max(count, 1) : 3;
}

/** Values and labels in separate elements, so templates can show the value large. */
function renderFigures(block: NodeOfType<"figures">, ctx: RenderContext): Html {
  const columns = figureColumns(block.items.nodes.length);
  const items = ctx.children(block.items).map(
    (item) =>
      item.type === "figure" &&
      html`
          <li class="figure">
            <p class="figure-value">${renderText(item.value, ctx)}</p>
            <p class="figure-label">${renderText(item.label, ctx)}</p>
          </li>`,
  );
  return html`<section class="block figures">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="figure-list figure-columns-${columns}">${items}
        </ul>
      </div>
    </section>`;
}

/**
 * Cards in rows by their number, each with its image, its title one level below the block's
 * heading and its text; a link on the title covers the whole card (cards design decision 3).
 */
function renderCards(block: NodeOfType<"cards">, ctx: RenderContext): Html {
  const titled = !isEmpty(block.heading);
  const columns = figureColumns(block.items.nodes.length);
  const items = ctx.children(block.items).map((card) => {
    if (card.type !== "card") return false;
    const image = imageOf(card, ctx);
    const href =
      card.url !== ""
        ? ctx.href(card.url)
        : card.target_id !== "" && ctx.routes.has(card.target_id)
          ? ctx.pageUrl(card.target_id)
          : undefined;
    const title = href
      ? html`<a href="${href}">${renderText(card.title, ctx)}</a>`
      : renderText(card.title, ctx);
    return html`
          <li class="card${image ? "" : " card-no-image"}">${
            image &&
            html`
            ${renderImage(image, ctx, { lazy: true, sizes: IMAGE_SIZES.card, className: "card-image" })}`
          }
            ${titled ? html`<h3 class="card-title">${title}</h3>` : html`<h2 class="card-title">${title}</h2>`}${
              !isEmpty(card.text) &&
              html`
            <p class="card-text">${renderText(card.text, ctx)}</p>`
            }
          </li>`;
  });
  return html`<section class="block cards cards-${block.layout}">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="card-list card-columns-${columns}">${items}
        </ul>
      </div>
    </section>`;
}

/**
 * Job ads (jobs design decision 2): the title, summary and contact always shown, the
 * description folded; the note in place of the list when there are no jobs.
 */
function renderJobs(block: NodeOfType<"jobs">, ctx: RenderContext): Html {
  const jobs = ctx.children(block.items).filter((job) => job.type === "job");
  if (jobs.length === 0 && isEmpty(block.empty_note)) return html``;
  const titled = !isEmpty(block.heading);
  const { strings } = ctx;
  const items = jobs.map((job) => {
    const title = renderText(job.title, ctx);
    const contact = [
      !isEmpty(job.contact_name) && renderText(job.contact_name, ctx),
      job.contact_email !== "" &&
        html`<a href="mailto:${job.contact_email}">${job.contact_email}</a>`,
      job.contact_phone !== "" &&
        // Non-breaking spaces keep the number on one line, as in the contact block.
        html`<a href="tel:${job.contact_phone}">${formatPhone(job.contact_phone).replaceAll(" ", "\u00a0")}</a>`,
    ].filter((part): part is Html => part !== false);
    return html`
          <li class="job">
            ${titled ? html`<h3 class="job-title">${title}</h3>` : html`<h2 class="job-title">${title}</h2>`}${
              !isEmpty(job.summary) &&
              html`
            <p class="job-summary">${renderText(job.summary, ctx)}</p>`
            }${
              hasDescription(job, ctx) &&
              html`
            <details class="job-details">
              <summary>${strings.jobDetails}</summary>${ctx
                .children(job.body)
                .map((child) => renderJobBodyChild(child, ctx, titled ? 4 : 3))}
            </details>`
            }${
              contact.length > 0 &&
              html`
            <p class="job-contact">${strings.jobContact}: ${contact.map((part, i) => (i === 0 ? part : html`, ${part}`))}</p>`
            }
          </li>`;
  });
  const list =
    jobs.length > 0
      ? html`
        <ul class="job-list">${items}
        </ul>`
      : html`
        <p class="jobs-note">${renderText(block.empty_note, ctx)}</p>`;
  return html`<section class="block jobs">
      <div class="container">${blockHeading(block.heading, ctx)}${list}
      </div>
    </section>`;
}

/** Whether a job has a description: anything but blank paragraphs (a new job starts with one). */
function hasDescription(job: NodeOfType<"job">, ctx: RenderContext): boolean {
  return ctx
    .children(job.body)
    .some((child) => child.type !== "paragraph" || !isEmpty(child.content));
}

/** A job's description: its subheadings one level below the job's title, whatever their level. */
function renderJobBodyChild(child: AnyNode, ctx: RenderContext, level: 3 | 4): Html {
  if (child.type !== "subheading") return renderBodyChild(child, ctx);
  const content = renderText(child.content, ctx);
  return level === 4
    ? html`
              <h4>${content}</h4>`
    : html`
              <h3>${content}</h3>`;
}

/** Videos in columns by their number, each played only when the visitor asks. */
function renderVideos(block: NodeOfType<"videos">, ctx: RenderContext): Html {
  const columns = figureColumns(block.items.nodes.length);
  const items = ctx.children(block.items).map((video) => {
    if (video.type !== "video") return false;
    const [poster] = ctx.children(video.poster);
    const figure = videoFigure(ctx, {
      url: video.url,
      title: video.title.content,
      caption: isEmpty(video.caption) ? undefined : renderText(video.caption, ctx),
      poster: poster?.type === "image" ? poster : undefined,
      sizes: columns > 1 ? IMAGE_SIZES.card : IMAGE_SIZES.projectCover,
    });
    return (
      figure &&
      html`
          <li>${figure}
          </li>`
    );
  });
  return html`<section class="block videos">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="video-list card-columns-${columns}">${items}
        </ul>
      </div>
    </section>`;
}

const PROVIDER_NAMES = { youtube: "YouTube", vimeo: "Vimeo" } as const;

/**
 * A video before play: a link to its page on the provider's site showing the poster or the title,
 * which the video script swaps for the player (video design decision 3). Undefined for an address
 * that isn't a YouTube or Vimeo video. Marks the page as needing the script.
 */
export function videoFigure(
  ctx: RenderContext,
  video: {
    url: string;
    title: string;
    caption?: Html;
    poster?: NodeOfType<"image">;
    sizes: string;
    /** False for a poster at the top of the page. */
    lazy?: boolean;
    /** False when the page's heading already names the video (a project's trailer). */
    showTitle?: boolean;
  },
): Html | undefined {
  const embed = videoEmbed(video.url);
  if (!embed) return undefined;
  ctx.useScript("video");
  const source = ctx.strings.playsFrom.replace("{provider}", PROVIDER_NAMES[embed.provider]);
  return html`
            <figure class="video" data-embed="${embed.embedUrl}" data-title="${video.title}">
              <a class="video-play" href="${embed.watchUrl}">${
                video.poster &&
                renderImage(video.poster, ctx, {
                  lazy: video.lazy ?? true,
                  sizes: video.sizes,
                  className: "video-poster",
                  alt: "",
                })
              }<span class="video-label">${ctx.strings.play}: ${video.title}</span></a>
              <figcaption>${
                (video.showTitle ?? true) && html`<span class="video-name">${video.title}</span>`
              }${video.caption && html`<span class="video-caption">${video.caption}</span>`}<span class="video-source">${source}</span></figcaption>
            </figure>`;
}

/** An ordered list: the numbers come from the order (figures-and-steps design decision 1). */
function renderSteps(block: NodeOfType<"steps">, ctx: RenderContext): Html {
  const items = ctx.children(block.items).map(
    (item) =>
      item.type === "step" &&
      html`
          <li class="step">
            <h3 class="step-title">${renderText(item.title, ctx)}</h3>${
              !isEmpty(item.text) &&
              html`
            <p class="step-text">${renderText(item.text, ctx)}</p>`
            }
          </li>`,
  );
  return html`<section class="block steps">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ol class="step-list">${items}
        </ol>
      </div>
    </section>`;
}

function renderServices(block: NodeOfType<"services">, ctx: RenderContext): Html {
  const accordion = block.layout === "accordion";
  const items = ctx.items(block).map((item) => {
    if (item.type !== "service_item") return false;
    // With pages, the name links to the service's own page (collection-pages).
    const url = ctx.itemUrl(item.id);
    const name = html`<p class="service-name">${
      url ? html`<a href="${url}">${renderText(item.name, ctx)}</a>` : renderText(item.name, ctx)
    }</p>`;
    const price =
      !isEmpty(item.price) && html`<p class="service-price">${renderText(item.price, ctx)}</p>`;
    const description =
      !isEmpty(item.description) &&
      html`<p class="service-description">${renderText(item.description, ctx)}</p>`;
    // An accordion opens a service to its description; without one it is a plain row.
    if (accordion && description) {
      return html`
          <li class="service">
            <details>
              <summary><span class="service-name">${renderText(item.name, ctx)}</span>${
                price && html`<span class="service-price">${renderText(item.price, ctx)}</span>`
              }</summary>
              ${description}${
                url &&
                html`
              <p class="service-more"><a href="${url}">${ctx.strings.moreAboutService}</a></p>`
              }
            </details>
          </li>`;
    }
    return html`
          <li class="service">
            ${name}${
              description &&
              html`
            ${description}`
            }${
              price &&
              html`
            ${price}`
            }
          </li>`;
  });
  const variant = block.layout === "cards" ? "" : ` services-as-${block.layout}`;
  return html`<section class="block services${variant}">
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
  /** A full-photo hero spans the window (block-variants). */
  heroCover: "100vw",
  /** Half the width beside the text from 48rem. */
  textWithImage: "(min-width: 48rem) 50vw, 100vw",
  /** Three columns from 48rem, two below. */
  gallery: "(min-width: 48rem) 33vw, 50vw",
  /** A card: up to four columns from 44rem, one below. */
  card: "(min-width: 44rem) 33vw, 100vw",
  /** A project tile: three columns from 48rem, two from 30rem, one below. */
  projectTile: "(min-width: 48rem) 33vw, (min-width: 30rem) 50vw, 100vw",
  /** A project page's cover spans the content (collection-pages). */
  projectCover: "(min-width: 64rem) 64rem, 100vw",
  portrait: "10rem",
  logo: "12rem",
  testimonial: "4rem",
} as const;

/** The height the stylesheet gives the site's logo in the header on wide screens. */
const SITE_LOGO_HEIGHT = "3rem";

/**
 * The site logo's `sizes`: its width at the header's logo height. It depends on the image's
 * shape only, so the theme still never changes the HTML.
 */
export function siteLogoSizes(image: { width: number; height: number }): string {
  const ratio = image.height > 0 ? Number((image.width / image.height).toFixed(2)) : 1;
  return `calc(${SITE_LOGO_HEIGHT} * ${ratio})`;
}

/**
 * An image as `<img>` over its WebP variants. `sizes` comes from the block, never the theme,
 * so theme changes leave the HTML alone.
 */
export function renderImage(
  image: NodeOfType<"image">,
  ctx: RenderContext,
  options: { lazy: boolean; sizes: string; className?: string; alt?: string },
): Html {
  const alt = options.alt ?? (image.decorative ? "" : image.alt);
  const file = (w: number) => ctx.url(`assets/images/${imageFile(image.src, w)}`);
  const srcset = imageVariants(image.width)
    .map((w) => `${file(w)} ${w}w`)
    .join(", ");
  // Where the stylesheet cuts the image to a shape, the cut keeps the focal point in view. The
  // page's <style> holds the rule, as pages carry no style attributes (image-cropping decision 4).
  const centred = image.focus_x === 50 && image.focus_y === 50;
  const className = [options.className, !centred && ctx.useFocalPoint(image.focus_x, image.focus_y)]
    .filter(Boolean)
    .join(" ");
  return html`<img${className && html` class="${className}"`} src="${file(srcVariant(image.width) ?? image.width)}" srcset="${srcset}" sizes="${options.sizes}" alt="${alt}" width="${image.width}" height="${image.height}"${options.lazy && html` loading="lazy"`}>`;
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
