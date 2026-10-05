// Builds the demo site into out/website.zip. Runs on the built package: `pnpm build-demo`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { exportSite, zipFiles } from "@webmio/site";

const fixtures = new URL("../fixtures/", import.meta.url);
const mediaDir = new URL("media/", fixtures);
const outDir = new URL("../out/", import.meta.url);

const doc: unknown = JSON.parse(readFileSync(new URL("demo-site.json", fixtures), "utf8"));
const media = new Map(
  readdirSync(mediaDir).map((name) => [
    name,
    new Uint8Array(readFileSync(new URL(name, mediaDir))),
  ]),
);

const result = exportSite(doc, media);
if (!result.ok) {
  for (const p of result.problems) console.error(`${p.code} ${p.nodeId}: ${p.message}`);
  process.exit(1);
}
for (const p of result.warnings) console.warn(`warning: ${p.code} ${p.nodeId}: ${p.message}`);

const zip = zipFiles(result.files);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("website.zip", outDir), zip);
console.log(`Wrote out/website.zip: ${result.files.size} files, ${zip.byteLength} bytes.`);
