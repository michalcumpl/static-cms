import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Resolved through the package's `./fixtures/*` export, not a repo-relative path.
const require = createRequire(import.meta.url);
const fixtureFile = require.resolve("@static-cms/site/fixtures/demo-site.json");
const mediaDir = join(dirname(fixtureFile), "media");

/** File names in the demo media folder; also the only names `demoMediaFile` serves. */
export function demoMediaNames(): string[] {
  return readdirSync(mediaDir).sort();
}

/** The demo site document, freshly read so fixture edits show up without a restart. */
export function demoSiteJson(): string {
  return readFileSync(fixtureFile, "utf8");
}

export function demoSite(): unknown {
  return JSON.parse(demoSiteJson());
}

export function demoMediaFile(name: string): Uint8Array<ArrayBuffer> | undefined {
  return demoMediaNames().includes(name)
    ? new Uint8Array(readFileSync(join(mediaDir, name)))
    : undefined;
}

export function demoMedia(): Map<string, Uint8Array> {
  return new Map(
    demoMediaNames().flatMap((name) => {
      const bytes = demoMediaFile(name);
      return bytes ? [[name, bytes] as const] : [];
    }),
  );
}
