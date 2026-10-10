import {
  type BlockInput,
  blockFactory,
  blocks,
  escapeInline,
  type ImageInput,
  type NodeType,
  slugify,
  uniqueSlug,
  type Weekday,
} from "@webmio/model";
import { STANDARD } from "@webmio/templates";
import { load } from "cheerio";
import { oldPath, pageKey, sameSite, withoutFragment } from "./addresses.js";
import { readPage } from "./blocks.js";
import { readBusiness } from "./business.js";
import { collapse } from "./content.js";
import { candidateList, ImageCollector, type ImageReference } from "./images.js";
import type { ImportedPageSummary, LeftOut } from "./report.js";
import {
  footerLogos,
  homeImages,
  pageTitle,
  type SourcePage,
  segmentBlocks,
  slugFromPath,
} from "./site.js";
import { externalTarget } from "./text.js";

// Pages read for a retry of an import (import-review-actions design decision 3): the pages the
// import missed, or read again with the images that arrived since, as nodes to merge into the
// saved document. No site, theme or business: those are the owner's now.

type Node = { id: string; type: NodeType; [key: string]: unknown };

const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** A page to read: a new one, or one the document has, read again under its ID and slug. */
export interface RetrySource extends SourcePage {
  existing?: { pageId: string; slug: string; title: string };
}

export interface RetryPagesOptions {
  /** The site's name, taken out of `<title>`s. */
  siteName: string;
  /** The old site's home page address: links elsewhere are external. */
  homeUrl: string;
  /** The slugs the document has; new pages never take one. */
  takenSlugs: readonly string[];
  /** The pages the document has from the old site: old address to page ID and slug. */
  knownPages: ReadonlyMap<string, { pageId: string; slug: string }>;
  /** A new node ID the document doesn't have. */
  newId: (type: NodeType) => string;
  /** The fetched images: reference ID to the `src` the documents name. Without it: none yet. */
  images?: ReadonlyMap<string, string>;
  /** The site's language, for the words of blocks the import names (a booking block's). */
  lang: string;
  /** The days the main location's hours name: a schedule naming them shows the hours. */
  hoursDays?: ReadonlySet<Weekday>;
  /**
   * For another language (import-languages design decision 4): the FAQ items a page's N-th
   * question block translates, in order, or undefined to make its questions text. With it, no
   * FAQ items are made: the questions that exist are the primary language's.
   */
  questions?: (url: string, index: number, count: number) => readonly string[] | undefined;
  /**
   * The home page among the sources, for another language: titled `title`, its slug from that,
   * and a hero with the site's name and description and the page's first photo, as the import
   * makes the home page.
   */
  home?: { url: string; title: string; heading: string; text: string };
}

export interface RetryPage {
  /** The source's address. */
  url: string;
  /** Its page node, under its ID (an existing page's own). */
  page: Node;
  /** Every node the page owns: its blocks, their nodes, and its questions. */
  nodes: Node[];
  /** The FAQ items the page's questions became, for the FAQ collection. */
  questions: string[];
  /** Existing FAQ items in this language's words (with `questions`), to replace theirs. */
  translated: Node[];
}

export interface RetryPages {
  pages: RetryPage[];
  /** Every image the pages show, to fetch. */
  images: ImageReference[];
  /** The new pages, for the report. */
  summaries: ImportedPageSummary[];
  /** What was left out of them, for the report. */
  leftOut: LeftOut[];
}

/**
 * Reads pages for a retry: each page's node and blocks under IDs from `newId`, new slugs unique
 * among `takenSlugs`, links to the document's imported pages and to each other as internal links.
 */
export function readPagesForRetry(
  sources: readonly RetrySource[],
  options: RetryPagesOptions,
): RetryPages {
  const homeUrl = new URL(options.homeUrl);
  const home = options.home ? new URL(options.home.url) : undefined;
  const taken = [...options.takenSlugs];
  const targets = new Map<string, { pageId: string; slug: string }>();
  for (const [address, page] of options.knownPages) targets.set(pageKey(new URL(address)), page);

  // Slugs and IDs first, so the pages can link to each other.
  const read = sources.map((source) => {
    const url = withoutFragment(new URL(source.url));
    if (source.existing) {
      targets.set(pageKey(url), source.existing);
      return { source, url, isHome: false, ...source.existing };
    }
    const isHome = home !== undefined && pageKey(url) === pageKey(home);
    const h1 = collapse(load(source.html)("h1").first().text());
    const title = isHome
      ? (options.home?.title ?? "")
      : pageTitle(h1, source.html, options.siteName) || options.siteName;
    const slug = uniqueSlug(
      (isHome ? "" : slugFromPath(url)) || slugify(title) || "stranka",
      taken,
    );
    taken.push(slug);
    const page = { pageId: options.newId("page"), slug };
    targets.set(pageKey(url), page);
    return { source, url, title, isHome, ...page };
  });
  const bySlug = new Map([...targets.values()].map((t) => [t.slug, t.pageId]));

  const images = new ImageCollector();
  const fetched = options.images;
  const image = (ref: string | undefined, alt: string): ImageInput | undefined => {
    const src = ref && fetched ? fetched.get(ref) : undefined;
    return src ? { src, alt } : undefined;
  };
  const leftOut: LeftOut[] = [];
  const pages = read.map(({ source, url, title, isHome, pageId, slug }): RetryPage => {
    const content = readPage(source.html, {
      ctx: {
        base: url,
        link: (target) => {
          const linked = targets.get(pageKey(target));
          if (linked && sameSite(target, homeUrl)) return `page:${linked.slug}`;
          return externalTarget(homeUrl)(target);
        },
      },
      images,
      css: source.css,
      hero: isHome,
      page: oldPath(url),
      hoursDays: options.hoursDays,
    });
    leftOut.push(...content.leftOut);
    // The home page's photo filling a panel and its footer's logos, as the import reads them.
    let backdropRef: string | undefined;
    let awards: ReturnType<typeof footerLogos>;
    if (isHome && options.home) {
      const business = readBusiness([source], options.lang, []);
      const { logoCandidates, backdrop } = homeImages(source, business.logo);
      if (backdrop && !content.heroImage) {
        backdropRef = images.add(candidateList([backdrop], url), "", "content", oldPath(url));
      }
      awards = footerLogos(source.html, url, logoCandidates, images);
    }

    const nodes: Node[] = [];
    const add = (type: NodeType, props: Record<string, unknown>, id = options.newId(type)) => {
      nodes.push({ id, type, ...props } as Node);
      return id;
    };
    const factory = blockFactory({
      add,
      pageId: (target) => {
        const id = bySlug.get(target);
        if (!id) throw new Error(`No page with the slug "${target}".`);
        return id;
      },
    });
    const questions: string[] = [];
    const translated: Node[] = [];
    let questionBlocks = 0;
    const inputs: BlockInput[] = content.segments.flatMap((segment) => {
      if (segment.kind === "faq" && options.questions) {
        const ids = options.questions(url.href, questionBlocks++, segment.items.length);
        if (ids && ids.length === segment.items.length) {
          segment.items.forEach((q, i) => {
            const id = ids[i] ?? "";
            const question = factory.text(q.question);
            translated.push({ id, type: "faq_item", question, answer: factory.text(q.answer) });
          });
          return [blocks.faq(segment.heading, [...ids])];
        }
        return [blocks.text(questionsAsText(segment.heading, segment.items))];
      }
      return segmentBlocks(
        segment,
        image,
        (q) => {
          const id = add("faq_item", {
            question: factory.text(q.question),
            answer: factory.text(q.answer),
          });
          questions.push(id);
          return id;
        },
        options.lang,
      );
    });
    if (isHome && options.home) {
      inputs.unshift(
        blocks.hero({
          heading: escapeInline(options.home.heading),
          text: escapeInline(options.home.text),
          image: content.heroImage
            ? image(content.heroImage.ref, content.heroImage.alt)
            : image(backdropRef, ""),
          layout: STANDARD.looks.hero,
        }),
      );
      if (awards) inputs.push(...segmentBlocks(awards, image, () => "", options.lang));
    }
    const blockIds = inputs.map(factory.block);
    const page: Node = {
      id: pageId,
      type: "page",
      title,
      slug,
      seo_description: "",
      translation_key: pageId,
      share_image: list(),
      blocks: list(blockIds),
    };
    return { url: url.href, page, nodes, questions, translated };
  });

  const references = [...images.references.values()];
  if (fetched) {
    for (const ref of references) {
      if (!fetched.has(ref.id))
        leftOut.push({ reason: "image", detail: ref.candidates[0] ?? ref.id });
    }
  }
  const summaries = read
    .filter((r) => !r.source.existing)
    .map((r) => ({ title: r.title, oldPath: oldPath(r.url), slug: r.slug }));
  return { pages, images: references, summaries, leftOut };
}

/** Questions as a text: the heading, then each question as a smaller subheading and its answer. */
function questionsAsText(
  heading: string,
  items: readonly { question: string; answer: string }[],
): string {
  const parts = heading ? [`## ${heading}`] : [];
  for (const q of items) parts.push(`### ${escapeInline(q.question)}`, q.answer);
  return parts.join("\n\n");
}
