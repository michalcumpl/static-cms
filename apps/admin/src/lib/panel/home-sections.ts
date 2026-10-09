import type { BlockType } from "$lib/editor/transforms";

// The Home page sections card (project-page, "Home page sections"): the home page's blocks with
// their "Show on website" switches, which is how home page sections are turned on and off.

// biome-ignore lint/suspicious/noExplicitAny: the card reads the working document loosely.
type Doc = { document_id: string; nodes: Record<string, any> };

export interface HomeSection {
  id: string;
  type: BlockType;
  /** The block's heading, or a text block's first subheading; "" when it has none. */
  heading: string;
  hidden: boolean;
}

const ids = (value: unknown): string[] => (value as { nodes?: string[] } | undefined)?.nodes ?? [];

/** The blocks of the document's home page, in page order. */
export function homeSections(doc: Doc): HomeSection[] {
  const site = doc.nodes[doc.document_id] ?? {};
  const home = doc.nodes[site.home_page_id];
  return ids(home?.blocks).flatMap((id) => {
    const block = doc.nodes[id];
    if (!block) return [];
    const subheading = ids(block.body)
      .map((child) => doc.nodes[child])
      .find((child) => child?.type === "subheading");
    const heading = block.heading?.content ?? subheading?.content?.content ?? "";
    return [
      { id, type: block.type, heading: String(heading).trim(), hidden: block.hidden === true },
    ];
  });
}
