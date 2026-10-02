import { invalidateAll } from "$app/navigation";
import type { Locale } from "$lib/i18n";

/**
 * Stores the interface language (on the account when signed in, else in a cookie) and
 * re-renders the page in it, without a reload.
 */
export async function chooseLanguage(locale: Locale): Promise<void> {
  await fetch("/api/ui-language", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language: locale }),
  });
  await invalidateAll();
}
