import { getContext, setContext } from "svelte";
import { formatDate, formatNumber, type I18n, sayIn, translate } from "./translate";
import type { Locale, MessageKey, Params, Said } from "./types";

// The interface language in components: one reactive object per app, so switching the language
// re-renders every text that came from `t()`.
class ReactiveI18n implements I18n {
  locale = $state<Locale>("en");

  constructor(locale: Locale) {
    this.locale = locale;
  }

  t = (key: MessageKey, params?: Params) => translate(this.locale, key, params);
  say = (message: Said) => sayIn(this.locale, message);
  formatDate = (
    date: Date | string | number,
    style?: "datetime" | "date" | "time",
    timeZone?: string,
  ) => formatDate(this.locale, date, style, timeZone);
  formatNumber = (value: number) => formatNumber(this.locale, value);
}

const KEY = Symbol("i18n");

export function setI18n(locale: Locale): ReactiveI18n {
  return setContext(KEY, new ReactiveI18n(locale));
}

export function getI18n(): I18n {
  const i18n = getContext<I18n | undefined>(KEY);
  if (!i18n) throw new Error("getI18n() needs setI18n() in a parent layout.");
  return i18n;
}
