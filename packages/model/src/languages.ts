// Fields shared by a project's languages come from the primary language (languages design.md
// decision 1): applied whenever another language's document is read, never stored in it.
import { COLLECTION_BLOCK_TYPES, COLLECTION_NAMES } from "./collections.js";

type LooseNode = { id?: string; type?: string; [key: string]: unknown };
type LooseDoc = { document_id: string; nodes: Record<string, LooseNode> };
type NodeList = { nodes: string[]; marks: unknown[]; annotations: unknown[] };

/** Business fields shared by every language; its `name` is per language. */
const SHARED_BUSINESS_FIELDS = ["business_type", "show_in_footer"] as const;

const list = (nodes: string[]): NodeList => ({ nodes, marks: [], annotations: [] });

/** A node and the nodes it owns: its list children and the nodes its marks point at. */
function ownedIds(nodes: Record<string, LooseNode>, id: string): string[] {
  const node = nodes[id];
  if (!node) return [];
  const ids = [id];
  for (const value of Object.values(node)) {
    if (typeof value !== "object" || value === null) continue;
    for (const child of idsOf(value)) ids.push(...ownedIds(nodes, child));
    const marks = (value as { marks?: unknown }).marks;
    for (const range of Array.isArray(marks) ? marks : []) {
      const markId = (range as { node_id?: unknown })?.node_id;
      if (typeof markId === "string") ids.push(...ownedIds(nodes, markId));
    }
  }
  return ids;
}

const idsOf = (value: unknown): string[] => {
  const nodes = (value as { nodes?: unknown } | undefined)?.nodes;
  return Array.isArray(nodes) ? nodes.filter((id): id is string => typeof id === "string") : [];
};

/**
 * `other` with the primary's shared fields: the theme, favicon, logo and header switch, default
 * share image (keeping its own description while it describes the same image), AI crawler
 * switches, the business data with its opening hours and social profiles, and the collections'
 * structure: which items exist, their order and their images (business-collections design
 * decision 5). Everything else stays `other`'s, including the texts of the items it has; an item
 * it lacks comes with the primary's texts. Nodes `other` no longer references are dropped.
 * Neither input is modified.
 */
export function applySharedFields<T>(primary: T, other: T): T {
  const p = primary as unknown as LooseDoc;
  const o = other as unknown as LooseDoc;
  const pSite = p.nodes[p.document_id];
  const oSite = o.nodes[o.document_id];
  if (!pSite || !oSite) return other;
  const nodes: Record<string, LooseNode> = { ...o.nodes };
  const site: LooseNode = { ...oSite };

  // Theme: the primary's values on the other's theme node.
  const pTheme = p.nodes[pSite.theme as string];
  const oThemeId = oSite.theme as string;
  if (pTheme && nodes[oThemeId]) nodes[oThemeId] = { ...pTheme, id: oThemeId };

  site.allow_ai_search = pSite.allow_ai_search;
  site.allow_ai_training = pSite.allow_ai_training;

  // Favicon and logo: the primary's image nodes. The logo is described by the site name,
  // which stays this language's.
  for (const slot of ["favicon", "logo"] as const) {
    for (const id of idsOf(oSite[slot])) delete nodes[id];
    for (const id of idsOf(pSite[slot])) if (p.nodes[id]) nodes[id] = { ...p.nodes[id] };
    site[slot] = list(idsOf(pSite[slot]));
  }
  site.header_show_name = pSite.header_show_name;

  // Default share image: the primary's image; the description stays per language while it
  // describes the same image, and is the primary's otherwise.
  const [oShareId] = idsOf(oSite.share_image);
  const oShare = oShareId ? o.nodes[oShareId] : undefined;
  if (oShareId) delete nodes[oShareId];
  const shareIds: string[] = [];
  for (const id of idsOf(pSite.share_image)) {
    const pShare = p.nodes[id];
    if (!pShare) continue;
    const same = oShare && oShare.src === pShare.src;
    nodes[id] = same
      ? { ...pShare, alt: oShare.alt, decorative: oShare.decorative }
      : { ...pShare };
    shareIds.push(id);
  }
  site.share_image = list(shareIds);

  // Business: shared fields, social profiles, and the locations (business-locations design
  // decision 5): the primary's list and facts, each location's name and hours note per language.
  const pBusiness = p.nodes[pSite.business as string];
  const oBusinessId = oSite.business as string;
  const oBusiness = nodes[oBusinessId];
  const droppedLocations = new Set<string>();
  if (pBusiness && oBusiness) {
    const business: LooseNode = { ...oBusiness };
    for (const field of SHARED_BUSINESS_FIELDS) business[field] = pBusiness[field];
    for (const id of idsOf(oBusiness.social)) delete nodes[id];
    const socialIds = idsOf(pBusiness.social);
    for (const id of socialIds) if (p.nodes[id]) nodes[id] = { ...p.nodes[id] };
    business.social = list(socialIds);

    const pLocationIds = idsOf(pBusiness.locations).filter((id) => p.nodes[id]);
    const shared = new Set(pLocationIds);
    for (const id of idsOf(oBusiness.locations)) {
      if (shared.has(id)) continue;
      droppedLocations.add(id);
      for (const owned of ownedIds(o.nodes, id)) delete nodes[owned];
    }
    for (const id of pLocationIds) {
      const pLocation = p.nodes[id] as LooseNode;
      const oLocation = o.nodes[id];
      if (oLocation) for (const owned of ownedIds(o.nodes, id)) delete nodes[owned];
      for (const owned of ownedIds(p.nodes, id)) nodes[owned] = { ...p.nodes[owned] };
      if (oLocation?.type === "location") {
        nodes[id] = { ...pLocation, name: oLocation.name, hours_note: oLocation.hours_note };
      }
    }
    business.locations = list(pLocationIds);
    nodes[oBusinessId] = business;
  }
  // Blocks that chose a location the primary no longer has show all of them.
  for (const [id, node] of Object.entries(nodes)) {
    if (
      (node.type === "contact" || node.type === "opening_hours") &&
      droppedLocations.has(node.location_id as string)
    ) {
      nodes[id] = { ...node, location_id: "" };
    }
  }

  // Collections: the primary's items and order. Items both have keep `other`'s texts and take
  // the primary's image, keeping their own description while it is the same image.
  const dropped = new Set<string>();
  for (const collection of COLLECTION_NAMES) {
    const pIds = idsOf(pSite[collection]);
    const shared = new Set(pIds);
    for (const id of idsOf(oSite[collection])) {
      if (shared.has(id)) continue;
      dropped.add(id);
      for (const owned of ownedIds(o.nodes, id)) delete nodes[owned];
    }
    for (const id of pIds) {
      const pItem = p.nodes[id];
      if (!pItem) continue;
      const oItem = o.nodes[id];
      if (!oItem || oItem.type !== pItem.type) {
        for (const owned of ownedIds(p.nodes, id)) nodes[owned] = { ...p.nodes[owned] };
        continue;
      }
      if (!("image" in pItem)) continue;
      const [oImageId] = idsOf(oItem.image);
      const oImage = oImageId ? o.nodes[oImageId] : undefined;
      for (const imageId of idsOf(oItem.image)) delete nodes[imageId];
      const imageIds = idsOf(pItem.image).filter((imageId) => p.nodes[imageId]);
      for (const imageId of imageIds) {
        const pImage = p.nodes[imageId] as LooseNode;
        const same = oImage && oImage.src === pImage.src;
        nodes[imageId] = same
          ? { ...pImage, alt: oImage.alt, decorative: oImage.decorative }
          : { ...pImage };
      }
      nodes[id] = { ...oItem, image: list(imageIds) };
    }
    site[collection] = list(pIds);
  }
  // Blocks that chose an item the primary no longer has stop showing it. Other references stay
  // for validation to judge.
  for (const [id, node] of Object.entries(nodes)) {
    if (!COLLECTION_BLOCK_TYPES.includes(node.type as never)) continue;
    const refIds = idsOf(node.chosen);
    const kept = refIds.filter((refId) => !dropped.has(nodes[refId]?.item_id as string));
    if (kept.length === refIds.length) continue;
    for (const refId of refIds) if (!kept.includes(refId)) delete nodes[refId];
    nodes[id] = { ...node, chosen: list(kept) };
  }

  nodes[o.document_id] = site;
  return { ...o, nodes } as unknown as T;
}
