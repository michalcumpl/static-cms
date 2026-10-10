// Test helpers: the fixture websites as the crawler would hand them over. Uses the filesystem, so
// it is left out of the build and allowed Node modules by the boundary test.
import { existsSync, readFileSync } from "node:fs";

const fixtures = new URL("../fixtures/", import.meta.url);

/** The address each fixture site is published at. */
export const FIXTURE_ORIGINS = {
  bakery: "https://pekarna-ulipy.cz",
  studio: "https://northlight.example",
  spa: "https://kavarna.example",
  agency: "https://cestovka-vlna.example",
} as const;

export type FixtureSite = keyof typeof FIXTURE_ORIGINS;

/** A fixture file's text by its path on the site (`/`, `/o-nas/`, `/style.css`). */
export function fixtureText(site: FixtureSite, path: string): string {
  return readFileSync(fixtureFile(site, path), "utf8");
}

/** A fixture file's bytes by its path on the site. */
export function fixtureBytes(site: FixtureSite, path: string): Uint8Array {
  return new Uint8Array(readFileSync(fixtureFile(site, path)));
}

/** The file serving a path: `index.html` for a directory path. */
export function fixtureFile(site: FixtureSite, path: string): URL {
  const clean = path.split(/[?#]/)[0] ?? "/";
  const file = clean.endsWith("/") ? `${clean}index.html` : clean;
  return new URL(`${site}${file}`, fixtures);
}

export function hasFixture(site: FixtureSite, path: string): boolean {
  return existsSync(fixtureFile(site, path));
}
