// Fields shared by a project's languages come from the primary language (languages design.md
// decision 1): applied whenever another language's document is read, never stored in it.

type LooseNode = { id?: string; type?: string; [key: string]: unknown };
type LooseDoc = { document_id: string; nodes: Record<string, LooseNode> };
type NodeList = { nodes: string[]; marks: unknown[]; annotations: unknown[] };

/** Business fields shared by every language; `name` and `hours_note` are per language. */
const SHARED_BUSINESS_FIELDS = [
  "street",
  "postal_code",
  "city",
  "country",
  "phone",
  "email",
  "map_url",
  "business_type",
  "show_in_footer",
] as const;

const list = (nodes: string[]): NodeList => ({ nodes, marks: [], annotations: [] });
const idsOf = (value: unknown): string[] => {
  const nodes = (value as { nodes?: unknown } | undefined)?.nodes;
  return Array.isArray(nodes) ? nodes.filter((id): id is string => typeof id === "string") : [];
};

/**
 * `other` with the primary's shared fields: the theme, favicon, default share image (keeping
 * its own description while it describes the same image), AI crawler switches, and the
 * business data with its opening hours. Everything else stays `other`'s. Nodes `other` no
 * longer references are dropped. Neither input is modified.
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

  // Favicon: the primary's image nodes.
  for (const id of idsOf(oSite.favicon)) delete nodes[id];
  for (const id of idsOf(pSite.favicon)) if (p.nodes[id]) nodes[id] = { ...p.nodes[id] };
  site.favicon = list(idsOf(pSite.favicon));

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

  // Business: shared fields and the opening hours, with the primary's day and range nodes.
  const pBusiness = p.nodes[pSite.business as string];
  const oBusinessId = oSite.business as string;
  const oBusiness = nodes[oBusinessId];
  if (pBusiness && oBusiness) {
    for (const dayId of idsOf(oBusiness.days)) {
      for (const rangeId of idsOf(o.nodes[dayId]?.ranges)) delete nodes[rangeId];
      delete nodes[dayId];
    }
    const business: LooseNode = { ...oBusiness };
    for (const field of SHARED_BUSINESS_FIELDS) business[field] = pBusiness[field];
    const dayIds = idsOf(pBusiness.days);
    for (const dayId of dayIds) {
      const day = p.nodes[dayId];
      if (!day) continue;
      nodes[dayId] = { ...day };
      for (const rangeId of idsOf(day.ranges)) {
        const range = p.nodes[rangeId];
        if (range) nodes[rangeId] = { ...range };
      }
    }
    business.days = list(dayIds);
    nodes[oBusinessId] = business;
  }

  nodes[o.document_id] = site;
  return { ...o, nodes } as unknown as T;
}
