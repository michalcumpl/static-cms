import type { TextValue } from "../schema/index.js";
import { graphemes } from "../text.js";
import type { RenderContext } from "./context.js";
import { type Html, html } from "./html.js";

/** Plain text with line breaks as `<br>`. */
function withBreaks(text: string): Html {
  const lines = text.split("\n");
  return html`${lines.map((line, i) => (i === 0 ? html`${line}` : html`<br>${line}`))}`;
}

/**
 * Renders a text value with its marks. Marks never overlap (validation guarantees it),
 * so the text is split at mark boundaries and each marked run is wrapped once.
 * Offsets count grapheme clusters. Annotations are editor metadata and are ignored.
 */
export function renderText(value: TextValue, ctx: RenderContext): Html {
  const chars = graphemes(value.content);
  const marks = [...value.marks].sort((a, b) => a.start_offset - b.start_offset);
  const parts: Html[] = [];
  let pos = 0;
  for (const mark of marks) {
    if (mark.start_offset > pos)
      parts.push(withBreaks(chars.slice(pos, mark.start_offset).join("")));
    const run = chars.slice(mark.start_offset, mark.end_offset).join("");
    const markNode = ctx.markNode(mark.node_id);
    const inner = withBreaks(isPhoneLink(markNode) ? unbreakable(run) : run);
    parts.push(wrap(markNode, inner, ctx));
    pos = mark.end_offset;
  }
  if (pos < chars.length) parts.push(withBreaks(chars.slice(pos).join("")));
  return html`${parts}`;
}

type MarkNode = ReturnType<RenderContext["markNode"]>;

function isPhoneLink(mark: MarkNode): boolean {
  return mark.type === "link" && mark.href.toLowerCase().startsWith("tel:");
}

/** Keeps a phone number on one line: non-breaking spaces and hyphens. */
function unbreakable(text: string): string {
  return text.replaceAll(" ", "\u00a0").replaceAll("-", "\u2011");
}

function wrap(mark: MarkNode, inner: Html, ctx: RenderContext): Html {
  switch (mark.type) {
    case "strong":
      return html`<strong>${inner}</strong>`;
    case "emphasis":
      return html`<em>${inner}</em>`;
    case "link":
      return html`<a href="${ctx.href(mark.href)}">${inner}</a>`;
    case "internal_link":
      return html`<a href="${ctx.pageUrl(mark.page_id)}">${inner}</a>`;
  }
}

export function isEmpty(value: TextValue): boolean {
  return value.content.trim() === "";
}
