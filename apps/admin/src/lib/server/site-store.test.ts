import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { demoSite } from "./demo";
import { readSite, saveSite } from "./site-store";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely to build documents.
type Doc = { nodes: Record<string, any> };

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "site-store-"));
  process.env.SITE_DATA_DIR = dir;
});

afterEach(async () => {
  delete process.env.SITE_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

function editedDemo(edit: (nodes: Doc["nodes"]) => void): Doc {
  const doc = demoSite() as Doc;
  edit(doc.nodes);
  return doc;
}

function withHeading(text: string): Doc {
  return editedDemo((n) => {
    n.hero_1.heading.content = text;
  });
}

describe("site store", () => {
  it("seeds the working copy from the demo fixture on first read", async () => {
    const site = await readSite();
    expect(site.document).toEqual(demoSite());
    expect(site.version).toMatch(/^[0-9a-f-]{36}$/);
    expect(site.problems).toEqual([]);
    const stored = JSON.parse(await readFile(join(dir, "site.json"), "utf8"));
    expect(stored).toEqual({ version: site.version, document: demoSite() });
  });

  it("returns the saved document after a restart, not the fixture", async () => {
    const { version } = await readSite();
    const doc = editedDemo((n) => {
      n.hero_1.heading.content = "Nový nadpis";
    });
    const saved = await saveSite(doc, version);
    expect(saved).toMatchObject({ ok: true });
    // A "restart" is a fresh read of the file; the store keeps no state in memory.
    const reread = await readSite();
    expect(reread.document).toEqual(doc);
    expect(reread.version).toBe(saved.ok ? saved.version : "");
  });

  it("accepts unfinished content and returns its problems", async () => {
    const { version } = await readSite();
    const doc = editedDemo((n) => {
      n.sub_about.content.content = "";
    });
    const saved = await saveSite(doc, version);
    expect(saved.ok).toBe(true);
    expect(saved.ok && saved.problems).toEqual([
      expect.objectContaining({ code: "empty-heading", category: "site", nodeId: "sub_about" }),
    ]);
  });

  it("refuses a structurally broken document and keeps the working copy", async () => {
    const before = await readSite();
    const doc = editedDemo((n) => {
      n.page_home.blocks.nodes.push("services_9");
    });
    const saved = await saveSite(doc, before.version);
    expect(saved).toEqual({
      ok: false,
      reason: "invalid",
      problems: [expect.objectContaining({ code: "missing-reference", category: "structure" })],
    });
    expect(await readSite()).toEqual(before);
  });

  it("rejects a save based on an outdated version", async () => {
    const { version: v5 } = await readSite();
    const first = await saveSite(withHeading("A"), v5);
    expect(first.ok).toBe(true);
    const second = await saveSite(withHeading("B"), v5);
    expect(second).toEqual({ ok: false, reason: "conflict" });
    const current = (await readSite()).document as Doc;
    expect(current.nodes.hero_1.heading.content).toBe("A");
  });

  it("serializes concurrent saves so only one wins a version", async () => {
    const { version } = await readSite();
    const results = await Promise.all(
      ["A", "B", "C"].map((t) => saveSite(withHeading(t), version)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === "conflict")).toHaveLength(2);
  });

  it("gives readers during a save a complete document and leaves no temp files", async () => {
    const before = await readSite();
    const doc = withHeading("Nový");
    const [saved, during] = await Promise.all([saveSite(doc, before.version), readSite()]);
    expect(saved.ok).toBe(true);
    expect([JSON.stringify(before.document), JSON.stringify(doc)]).toContain(
      JSON.stringify(during.document),
    );
    expect(await readdir(dir)).toEqual(["site.json"]);
  });
});
