// What an import tells the owner (site-import spec, "Import review"). Reasons are codes, so the
// admin says them in the interface language.

export type LeftOutReason =
  /** A form other than a contact form: a sign-up, search, order or login. */
  | "form"
  /** An embedded widget, map or player other than YouTube and Vimeo (`detail`: its host or tag). */
  | "embed"
  /** An email address hidden by an anti-spam script. */
  | "hidden-email"
  /** An image that couldn't be fetched or isn't JPEG, PNG or WebP (`detail`: its address). */
  | "image"
  /** Images over the limit of 100. */
  | "images-over-limit"
  /** A page `robots.txt` disallows (`page`: its path). */
  | "disallowed"
  /** A page built in the browser by a script. */
  | "script-built"
  /** A page that didn't answer, or answered with an error (`detail`: the status). */
  | "unreachable"
  /** An address that isn't an HTML page (a PDF, an image). */
  | "not-html"
  /** Pages over the limit of 20 (`detail`: how many). */
  | "over-limit"
  /** A language version of the site (`detail`: its address). */
  | "language";

export interface LeftOut {
  reason: LeftOutReason;
  /** The page it was on, or the page itself, as its path on the old site. */
  page?: string;
  detail?: string;
  /**
   * For `language`: the version's language (`en`), when known. For anything else: the language
   * version it was left out of, when it isn't the primary's (import-languages).
   */
  lang?: string;
}

export interface ImportedPageSummary {
  title: string;
  /** Its path on the old site. */
  oldPath: string;
  /** Its new slug; `""` for the home page. */
  slug: string;
  /** Its language, when it isn't the primary's (import-languages). */
  lang?: string;
}

export interface ImportReport {
  /** The address imported. */
  address: string;
  pages: ImportedPageSummary[];
  images: number;
  questions: number;
  socialProfiles: number;
  /** Which business details were found. */
  business: {
    name: boolean;
    phone: boolean;
    email: boolean;
    address: boolean;
    hours: boolean;
  };
  leftOut: LeftOut[];
}
