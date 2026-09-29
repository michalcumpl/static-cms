import { isSafeHref } from "@static-cms/site";

export type LinkAddressCheck = { ok: true; href: string } | { ok: false; message: string };

export const ALLOWED_ADDRESSES =
  "an address starting with https://, http://, mailto: or tel:, or a path starting with /";

/** Checks an address typed into the link dialog, with the same rule the validator uses. */
export function checkLinkAddress(input: string): LinkAddressCheck {
  const href = input.trim();
  if (href === "") return { ok: false, message: `Enter ${ALLOWED_ADDRESSES}.` };
  if (!isSafeHref(href)) {
    return { ok: false, message: `This address isn't allowed. Use ${ALLOWED_ADDRESSES}.` };
  }
  return { ok: true, href };
}
