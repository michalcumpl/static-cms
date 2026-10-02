import { cs } from "./cs";
import { en } from "./en";
import type { Locale, MessageKey, Messages, Params, Plural, Said } from "./types";

const CATALOGUES: Record<Locale, Messages> = { en, cs };

/** Dates and numbers: English uses day-month-year, as in Europe. */
const FORMAT_LOCALE: Record<Locale, string> = { en: "en-GB", cs: "cs" };

function lookup(locale: Locale, key: MessageKey): string | Plural {
  let value: unknown = CATALOGUES[locale];
  for (const part of key.split(".")) value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value === "string" || (typeof value === "object" && value !== null)) {
    return value as string | Plural;
  }
  throw new Error(`No message "${key}" in ${locale}.`);
}

/** A message in `locale`, with `{name}` replaced by `params.name`; a plural chosen by `count`. */
export function translate(locale: Locale, key: MessageKey, params: Params = {}): string {
  const value = lookup(locale, key);
  let text: string;
  if (typeof value === "string") {
    text = value;
  } else {
    const count = Number(params.count ?? 0);
    const category = new Intl.PluralRules(FORMAT_LOCALE[locale]).select(count) as keyof Plural;
    text = value[category] ?? value.other;
  }
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const param = params[name];
    if (param === undefined) return match;
    return typeof param === "number" ? formatNumber(locale, param) : param;
  });
}

/** A message chosen earlier (`said`), with its message parameters said in `locale` too. */
export function sayIn(locale: Locale, message: Said): string {
  const params: Params = {};
  for (const [name, value] of Object.entries(message.params ?? {})) {
    params[name] = typeof value === "object" ? sayIn(locale, value) : value;
  }
  return translate(locale, message.key, params);
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(FORMAT_LOCALE[locale]).format(value);
}

const DATE_STYLES = {
  datetime: { dateStyle: "medium", timeStyle: "short" },
  date: { dateStyle: "medium" },
  time: { timeStyle: "short" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

/** A date in the language's format; `timeZone` for server-side formatting (the owners' zone). */
export function formatDate(
  locale: Locale,
  date: Date | string | number,
  style: keyof typeof DATE_STYLES = "datetime",
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(FORMAT_LOCALE[locale], { ...DATE_STYLES[style], timeZone }).format(
    new Date(date),
  );
}

/** Everything about one language, for server code and emails. */
export interface I18n {
  locale: Locale;
  t: (key: MessageKey, params?: Params) => string;
  /** A message the server chose earlier, such as a refusal from a library function. */
  say: (message: Said) => string;
  formatDate: (
    date: Date | string | number,
    style?: keyof typeof DATE_STYLES,
    timeZone?: string,
  ) => string;
  formatNumber: (value: number) => string;
}

export function i18n(locale: Locale): I18n {
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
    say: (message) => sayIn(locale, message),
    formatDate: (date, style, timeZone) => formatDate(locale, date, style, timeZone),
    formatNumber: (value) => formatNumber(locale, value),
  };
}
