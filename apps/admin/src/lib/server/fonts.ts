import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fontPackagePath, usedFontFiles } from "@webmio/site";

// Font files come from the pinned @fontsource-variable/* packages (theme-and-branding design.md
// decision 2), resolved through each package's exports so they're found wherever pnpm puts them.
const require = createRequire(import.meta.url);

/** Where a published font file or licence is on disk; undefined for any other name. */
export function fontFilePath(name: string): string | undefined {
  const path = fontPackagePath(name);
  return path === undefined ? undefined : require.resolve(`@fontsource-variable/${path}`);
}

/** The bytes of a published font file or licence, or undefined for any other name. */
export async function fontFile(name: string): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const path = fontFilePath(name);
  return path === undefined ? undefined : new Uint8Array(await readFile(path));
}

/** The bytes of each named font file, keyed by name, for an export. Unknown names are left out. */
export async function fontFiles(names: readonly string[]): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  for (const name of names) {
    const bytes = await fontFile(name);
    if (bytes) files.set(name, bytes);
  }
  return files;
}

/**
 * The font files of the primary language's theme (the theme is shared, so it's the site's), by
 * name: what an export of these languages needs.
 */
export function siteFontNames(
  languages: readonly { primary: boolean; document: unknown }[],
): string[] {
  const primary = languages.find((language) => language.primary) ?? languages[0];
  return primary ? usedFontFiles(primary.document) : [];
}

/** The bytes of the font files an export of these languages needs. */
export const siteFonts = (languages: readonly { primary: boolean; document: unknown }[]) =>
  fontFiles(siteFontNames(languages));
