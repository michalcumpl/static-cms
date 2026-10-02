import { eq } from "drizzle-orm";
import { isLocale, type Locale } from "$lib/i18n";
import type { Db } from "./db/index";
import { users } from "./db/schema";

// Which language the interface speaks (admin-foundation design.md decision 6).

/** The cookie that remembers a choice made with the switch on this device. */
export const LOCALE_COOKIE = "ui_lang";

/**
 * The first of Czech or English the browser prefers, by quality, from an `Accept-Language`
 * header; undefined when it names neither.
 */
export function browserLocale(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part, order) => {
      const [tag = "", ...rest] = part.trim().split(";");
      const q = rest.find((p) => p.trim().startsWith("q="));
      return {
        language: tag.trim().toLowerCase().split("-")[0],
        q: q ? Number(q.split("=")[1]) : 1,
        order,
      };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q || a.order - b.order);
  return ranked.map((entry) => entry.language).find(isLocale);
}

/**
 * The interface language: the person's stored choice, else this device's choice, else the
 * browser's preference, else English.
 */
export function resolveLocale(input: {
  user?: { uiLanguage: string | null };
  cookie?: string;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.user?.uiLanguage)) return input.user.uiLanguage;
  if (isLocale(input.cookie)) return input.cookie;
  return browserLocale(input.acceptLanguage) ?? "en";
}

export function setUserLocale(db: Db, userId: string, locale: Locale): void {
  db.update(users).set({ uiLanguage: locale }).where(eq(users.id, userId)).run();
}
