// The shape of a catalogue (admin-foundation design.md decision 5). English defines the keys;
// Czech must have exactly the same ones, which TypeScript checks.

export const LOCALES = ["en", "cs"] as const;
export type Locale = (typeof LOCALES)[number];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/** Words that change with a count, chosen by `Intl.PluralRules` (Czech: one, few, other). */
export interface Plural {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Widen<T[K]>;
};

/** Every message, keyed by area. `en.ts` is the source; `cs.ts` is typed as this. */
export type Messages = Widen<typeof import("./en").en>;

type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string | Plural
    ? `${Prefix}${K}`
    : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** A message's dotted key, such as `"shell.signOut"`; a typo is a type error. */
export type MessageKey = Paths<Messages>;

export type Params = Record<string, string | number>;

/** A message chosen where it arises, said in the reader's language later (decision 7). */
export interface Said {
  key: MessageKey;
  /** A parameter may itself be a message, said in the same language. */
  params?: Record<string, string | number | Said>;
}

export const said = (key: MessageKey, params?: Said["params"]): Said => ({ key, params });
