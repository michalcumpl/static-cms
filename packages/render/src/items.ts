// Projects and the pages of services and projects (collection-pages design decisions 4 and 5).
import type { NodeOfType } from "@webmio/model";
import {
  blockHeading,
  galleryGrid,
  IMAGE_SIZES,
  renderBodyChild,
  renderImage,
  videoFigure,
} from "./blocks.js";
import type { RenderContext } from "./context.js";
import { renderHead } from "./head.js";
import { type Html, html } from "./html.js";
import { indent, renderDocument } from "./page.js";
import { isEmpty, renderText } from "./text.js";

/** The cover image of a project, if it has one. */
function coverOf(project: NodeOfType<"project">, ctx: RenderContext) {
  const [cover] = ctx.children(project.cover);
  return cover?.type === "image" ? cover : undefined;
}

function categoryName(project: NodeOfType<"project">, ctx: RenderContext): Html | false {
  if (project.category_id === "") return false;
  const category = ctx.node(project.category_id, "project_category");
  return renderText(category.name, ctx);
}

/**
 * Tiles with the cover and the name over it, each a link to the project's page when projects
 * have pages; then a link to all projects when the block shows only the first ones.
 */
export function renderProjects(block: NodeOfType<"projects">, ctx: RenderContext): Html {
  const shown = ctx.items(block) as NodeOfType<"project">[];
  const tiles = shown.map((project) => {
    const url = ctx.itemUrl(project.id);
    const cover = coverOf(project, ctx);
    const category = categoryName(project, ctx);
    const inner = html`${
      cover
        ? renderImage(cover, ctx, {
            lazy: true,
            sizes: IMAGE_SIZES.projectTile,
            className: "project-cover",
          })
        : html`<span class="project-cover project-no-cover"></span>`
    }
              <span class="project-name">${renderText(project.name, ctx)}</span>`;
    return html`
          <li class="project-tile">
            ${url ? html`<a class="project-link" href="${url}">${inner}</a>` : html`<div class="project-link">${inner}</div>`}${
              category &&
              html`
            <p class="project-category">${category}</p>`
            }${
              !isEmpty(project.summary) &&
              html`
            <p class="project-summary">${renderText(project.summary, ctx)}</p>`
            }
          </li>`;
  });
  const all = (ctx.items({ ...block, limit: 0 }) as NodeOfType<"project">[]).length;
  const listing = ctx.site.projects_page_id;
  const more = shown.length < all && ctx.itemPages.some((page) => page.listingPageId === listing);
  return html`<section class="block projects">
      <div class="container">${blockHeading(block.heading, ctx)}
        <ul class="projects-grid">${tiles}
        </ul>${
          more &&
          html`
        <p class="projects-more"><a href="${ctx.pageUrl(listing)}">${ctx.strings.allProjects}</a></p>`
        }
      </div>
    </section>`;
}

/** An item's own page: a project's or a service's, under its listing page. */
export function renderItemPage(itemId: string, listingPageId: string, ctx: RenderContext): Html {
  ctx.pageScripts.clear();
  const node = ctx.nodes[itemId];
  const listing = ctx.node(listingPageId, "page");
  const back = html`
          <p class="back-link"><a href="${ctx.pageUrl(listingPageId)}">${listing.title}</a></p>`;
  if (node?.type === "project") return projectPage(node, back, ctx);
  if (node?.type === "service_item") return servicePage(node, back, ctx);
  throw new Error(`${itemId} has no page of its own.`);
}

function document(
  ctx: RenderContext,
  item: { id: string; name: string; description: string; shareImageId?: string },
  listingPageId: string,
  main: Html,
): Html {
  const title = `${item.name} – ${ctx.site.name}`;
  const head = renderHead(ctx, {
    title,
    description: item.description.trim(),
    item: { id: item.id, title: item.name, shareImageId: item.shareImageId },
  });
  return renderDocument(ctx, head, main, listingPageId, item.id);
}

function projectPage(project: NodeOfType<"project">, back: Html, ctx: RenderContext): Html {
  const cover = coverOf(project, ctx);
  const category = categoryName(project, ctx);
  const facts = ctx.children(project.facts).flatMap((fact) =>
    fact.type === "fact"
      ? [
          html`
              <div>
                <dt>${renderText(fact.label, ctx)}</dt>
                <dd>${renderText(fact.value, ctx)}</dd>
              </div>`,
        ]
      : [],
  );
  // A YouTube or Vimeo trailer takes the cover's place at the top, the cover as its poster.
  const trailer =
    project.video_url === ""
      ? undefined
      : videoFigure(ctx, {
          url: project.video_url,
          title: project.name.content,
          poster: cover,
          sizes: IMAGE_SIZES.projectCover,
          lazy: false,
          showTitle: false,
        });
  const body = ctx
    .children(project.body)
    .map((child) => indent(renderBodyChild(child, ctx), "      "));
  const main = html`
      <article class="item-page project-page">
        <div class="container">${back}
          <h1 class="page-title">${renderText(project.name, ctx)}</h1>${
            category &&
            html`
          <p class="project-category">${category}</p>`
          }${
            !isEmpty(project.summary) &&
            html`
          <p class="project-summary">${renderText(project.summary, ctx)}</p>`
          }${
            trailer
              ? html`
          <div class="project-video">${indent(trailer, "  ")}
          </div>`
              : cover &&
                html`
          ${renderImage(cover, ctx, { lazy: false, sizes: IMAGE_SIZES.projectCover, className: "project-page-cover" })}`
          }
          <div class="project-body">${
            facts.length > 0 &&
            html`
            <dl class="project-facts">${facts}
            </dl>`
          }
            <div class="project-text">${body}
            </div>
          </div>${
            project.photos.nodes.length > 0 &&
            html`
          <div class="gallery">${indent(galleryGrid(project.photos, ctx), "    ")}
          </div>`
          }${
            project.video_url !== "" &&
            !trailer &&
            html`
          <p class="project-video"><a class="button" href="${ctx.href(project.video_url)}">${ctx.strings.watchVideo}</a></p>`
          }
        </div>
      </article>`;
  return document(
    ctx,
    {
      id: project.id,
      name: project.name.content,
      description: project.summary.content,
      shareImageId: cover?.id,
    },
    ctx.site.projects_page_id,
    main,
  );
}

function servicePage(service: NodeOfType<"service_item">, back: Html, ctx: RenderContext): Html {
  const body =
    service.body.nodes.length > 0
      ? ctx.children(service.body).map((child) => indent(renderBodyChild(child, ctx), "    "))
      : !isEmpty(service.description) &&
        html`
            <p>${renderText(service.description, ctx)}</p>`;
  const main = html`
      <article class="item-page service-page">
        <div class="container">${back}
          <h1 class="page-title">${renderText(service.name, ctx)}</h1>${
            !isEmpty(service.price) &&
            html`
          <p class="service-price">${renderText(service.price, ctx)}</p>`
          }
          <div class="service-text">${body}
          </div>
        </div>
      </article>`;
  return document(
    ctx,
    { id: service.id, name: service.name.content, description: service.description.content },
    ctx.site.services_page_id,
    main,
  );
}
