import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Fixtures of @webmio/model, resolved through the package's `./fixtures/*` export.
const require = createRequire(import.meta.url);
const demoFile = require.resolve("@webmio/model/fixtures/demo-site.json");
const starterFile = require.resolve("@webmio/model/fixtures/starter-site.json");
const imageBlocksFile = require.resolve("@webmio/model/fixtures/image-blocks-site.json");
const demoMediaDir = join(dirname(demoFile), "media");

/** The demo site document (tests, and the images of an imported Milestone 2 working copy). */
export function demoSite(): unknown {
  return JSON.parse(readFileSync(demoFile, "utf8"));
}

/** The demo site plus an unlisted page "Galerie" with one block of each image block type (tests). */
export function imageBlocksSite(): unknown {
  return JSON.parse(readFileSync(imageBlocksFile, "utf8"));
}

/** The site a new project starts from, with its site name set to `name`. */
export function starterSite(name: string): { document_id: string; nodes: Record<string, unknown> } {
  const doc = JSON.parse(readFileSync(starterFile, "utf8"));
  doc.nodes[doc.document_id].name = name;
  return doc;
}

/** One of the demo site's images, or undefined for other names. */
export function demoMediaFile(name: string): Uint8Array<ArrayBuffer> | undefined {
  return readdirSync(demoMediaDir).includes(name)
    ? new Uint8Array(readFileSync(join(demoMediaDir, name)))
    : undefined;
}
