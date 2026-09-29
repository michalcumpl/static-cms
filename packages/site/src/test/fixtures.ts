import { readdirSync, readFileSync } from "node:fs";
import type { SiteDocument } from "../schema/index.js";

const fixturesDir = new URL("../../fixtures/", import.meta.url);

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
