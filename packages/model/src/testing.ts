import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SiteDocument } from "./schema/index.js";

const fixturesDir = new URL("../fixtures/", import.meta.url);

/** A fresh copy of any fixture document, such as `demo-site-v2.json`. */
export function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(name, fixturesDir), "utf8"));
}

/** A fresh, mutable copy of the demo site for each call. */
export function loadDemoSite(): SiteDocument {
  return JSON.parse(readFileSync(new URL("demo-site.json", fixturesDir), "utf8")) as SiteDocument;
}

export function loadDemoMedia(): Map<string, Uint8Array> {
  const dir = new URL("media/", fixturesDir);
  return new Map(
    readdirSync(dir).map((name) => [name, new Uint8Array(readFileSync(new URL(name, dir)))]),
  );
}

// biome-ignore lint/suspicious/noExplicitAny: tests poke at nodes to build deliberately invalid documents.
export type LooseNodes = Record<string, any>;

/** Mutable, loosely typed view of the demo site's nodes, for building broken documents in tests. */
export function editableDemoSite(): { doc: SiteDocument; nodes: LooseNodes } {
  const doc = loadDemoSite();
  return { doc, nodes: doc.nodes as LooseNodes };
}

/** The demo site with its home page listed second, to check nothing relies on list position. */
export function homeListedSecondSite(): SiteDocument {
  const { doc, nodes } = editableDemoSite();
  nodes.site_1.pages.nodes = ["page_contact", "page_home"];
  return doc;
}

/** The demo site plus an unlisted page "Galerie" with one block of each image block type. */
export function editableImageBlocksSite(): { doc: SiteDocument; nodes: LooseNodes } {
  const doc = JSON.parse(
    readFileSync(new URL("image-blocks-site.json", fixturesDir), "utf8"),
  ) as SiteDocument;
  return { doc, nodes: doc.nodes as LooseNodes };
}

/**
 * Import problems in a package's source (tests excluded), for the boundary tests
 * (package-split design decisions 4 and 5): workspace packages other than `allowed`, relative
 * imports that leave `src`, and `node:` modules outside the files named in `nodeAllowed`.
 */
export function importViolations(
  srcDir: URL,
  allowed: readonly string[],
  nodeAllowed: readonly string[] = [],
): string[] {
  const root = fileURLToPath(srcDir).replace(/[\\/]$/, "");
  const files = (readdirSync(root, { recursive: true }) as string[]).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.split(sep).includes("node_modules"),
  );
  const problems: string[] = [];
  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    for (const [, spec] of source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
      if (spec === undefined) continue;
      if (spec.startsWith("node:")) {
        if (!nodeAllowed.includes(file)) problems.push(`${file}: ${spec}`);
      } else if (spec.startsWith(".")) {
        const target = resolve(dirname(join(root, file)), spec);
        if (!target.startsWith(root + sep)) problems.push(`${file}: ${spec} leaves src`);
      } else if (spec.startsWith("@webmio/")) {
        const name = spec.split("/").slice(0, 2).join("/");
        if (!allowed.includes(name)) problems.push(`${file}: ${spec}`);
      }
    }
  }
  return problems;
}
