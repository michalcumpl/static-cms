// The site's collections and the blocks that show them (business-collections design decisions
// 1–3), and the kinds of social profiles (decision 6).
import type { NodeOfType, NodeType, SiteDocument } from "./schema/index.js";

/** The block types that show a collection. */
export type CollectionBlockType = "services" | "team" | "testimonials" | "faq";

/** The site node's collection properties. */
export type CollectionName = "services" | "team" | "testimonials" | "faqs";

/** The item node types, one per collection. */
export type CollectionItemType = "service_item" | "person" | "testimonial" | "faq_item";

export const COLLECTION_BLOCK_TYPES: readonly CollectionBlockType[] = [
  "services",
  "team",
  "testimonials",
  "faq",
];

/** Which collection a block shows, and what its items are. */
export const COLLECTIONS: Record<
  CollectionBlockType,
  { collection: CollectionName; item: CollectionItemType }
> = {
  services: { collection: "services", item: "service_item" },
  team: { collection: "team", item: "person" },
  testimonials: { collection: "testimonials", item: "testimonial" },
  faq: { collection: "faqs", item: "faq_item" },
};

export const COLLECTION_NAMES: readonly CollectionName[] = [
  "services",
  "team",
  "testimonials",
  "faqs",
];

export function isCollectionBlockType(type: unknown): type is CollectionBlockType {
  return typeof type === "string" && Object.hasOwn(COLLECTIONS, type);
}

export type CollectionBlockNode = NodeOfType<CollectionBlockType>;
export type CollectionItemNode = NodeOfType<CollectionItemType>;

/**
 * The items a collection block shows: its whole collection in collection order (`all`), or the
 * items its references name in their order (`chosen`). References to items that aren't in the
 * collection are skipped; validation reports them where they are stored.
 */
export function blockItems(doc: SiteDocument, block: CollectionBlockNode): CollectionItemNode[] {
  const site = doc.nodes[doc.document_id];
  if (site?.type !== "site") return [];
  const { collection, item: itemType } = COLLECTIONS[block.type];
  const members = site[collection].nodes;
  const ids =
    block.show === "chosen"
      ? block.chosen.nodes.flatMap((refId) => {
          const ref = doc.nodes[refId];
          return ref?.type === "item_ref" && members.includes(ref.item_id) ? [ref.item_id] : [];
        })
      : members;
  return ids.flatMap((id) => {
    const node = doc.nodes[id];
    return node?.type === itemType ? [node as CollectionItemNode] : [];
  });
}

/** The node type of the items in the collection a block type shows. */
export function itemTypeOf(blockType: CollectionBlockType): NodeType {
  return COLLECTIONS[blockType].item;
}

export type SocialKind = "facebook" | "instagram" | "linkedin" | "youtube" | "x" | "tiktok";

const SOCIAL_HOSTS: Record<string, SocialKind> = {
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "youtube.com": "youtube",
  "x.com": "x",
  "twitter.com": "x",
  "tiktok.com": "tiktok",
};

const SOCIAL_LABELS: Record<SocialKind, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  tiktok: "TikTok",
};

/**
 * What a social profile's address is: a known network (its host or any subdomain of it, such as
 * `m.facebook.com` or `cz.linkedin.com`), or `undefined` with the host (without `www.` or `m.`)
 * as its label. An address that can't be parsed has an empty label.
 */
export function socialKind(url: string): { kind: SocialKind | undefined; label: string } {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return { kind: undefined, label: "" };
  }
  host = host.replace(/^(www|m)\./, "");
  const known = Object.keys(SOCIAL_HOSTS).find((h) => host === h || host.endsWith(`.${h}`));
  const kind = known ? SOCIAL_HOSTS[known] : undefined;
  return kind ? { kind, label: SOCIAL_LABELS[kind] } : { kind: undefined, label: host };
}
