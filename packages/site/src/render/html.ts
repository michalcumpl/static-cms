/** Markup that is already safe to emit. Only `html` and `raw` create it. */
export class Html {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

type Interpolation = Html | string | number | false | null | undefined | readonly Interpolation[];

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for use in element content and in double- or single-quoted attributes. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

function interpolate(value: Interpolation): string {
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) return value.map(interpolate).join("");
  if (value === false || value === null || value === undefined) return "";
  return escapeHtml(String(value));
}

/**
 * The single way document content reaches the output: every interpolated string or
 * number is escaped; only `Html` values (from `html` or `raw`) pass through unchanged.
 * `false`, `null` and `undefined` render nothing, so `${cond && html`...`}` works.
 */
export function html(strings: TemplateStringsArray, ...values: Interpolation[]): Html {
  let out = strings[0] ?? "";
  values.forEach((value, i) => {
    out += interpolate(value) + (strings[i + 1] ?? "");
  });
  return new Html(out);
}

/** Trusts a string as markup. Use only for markup the renderer itself produced. */
export function raw(markup: string): Html {
  return new Html(markup);
}
