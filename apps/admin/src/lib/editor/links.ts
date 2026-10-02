import { isSafeHref } from "@static-cms/site";

/** Why an address was refused; components say it with `editor.links.<reason>`. */
export type LinkProblem = "empty" | "notAllowed" | "noLabel";

export type LinkAddressCheck = { ok: true; href: string } | { ok: false; reason: LinkProblem };

/** Checks an address typed into the link dialog, with the same rule the validator uses. */
export function checkLinkAddress(input: string): LinkAddressCheck {
  const href = input.trim();
  if (href === "") return { ok: false, reason: "empty" };
  if (!isSafeHref(href)) return { ok: false, reason: "notAllowed" };
  return { ok: true, href };
}
