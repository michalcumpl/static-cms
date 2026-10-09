import { readdirSync } from "node:fs";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { imports, media, pageOrigins, projects, siteDocuments } from "../db/schema";
import { mediaRoot } from "../import-working-copy";
import { readSite } from "../site-documents";
import { useTestProject } from "../test-project";
import { type FixtureServer, startFixtureServer } from "./fixture-server";
import {
  failInterruptedImports,
  importAddress,
  importsSettled,
  readImport,
  startImport,
} from "./job";

const project = useTestProject();
let server: FixtureServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

/** Starts an import of a fixture site and waits for it. */
async function importFixture(site: string, path = "/", failing: string[] = []) {
  server = await startFixtureServer(site);
  for (const failed of failing) server.failing.add(failed);
  const { db, workspaceId, owner } = project();
  const started = startImport(
    db,
    {
      workspaceId,
      userId: owner.id,
      address: `${server.origin}${path}`,
      confirmed: true,
      locale: "en",
    },
    { allowHosts: new Set([server.host]) },
  );
  if (!started.ok) throw new Error(started.message.key);
  await importsSettled();
  return readImport(db, started.importId, owner.id);
}

const projectsOf = () => {
  const { db, workspaceId } = project();
  return db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).all();
};

describe("the import job", () => {
  it("Done: a project named after the site, its images, old addresses and report", async () => {
    const before = projectsOf().length;
    const row = await importFixture("bakery");
    expect(row).toMatchObject({
      state: "done",
      error: null,
      progress: { phase: "building", done: 1 },
    });
    const { db } = project();
    const projectId = row?.projectId ?? "";
    expect(projectsOf()).toHaveLength(before + 1);
    expect(db.select().from(projects).where(eq(projects.id, projectId)).get()?.name).toBe(
      "Pekárna U Lípy",
    );
    const site = readSite(db, projectId);
    const doc = site?.document as {
      nodes: Record<string, { type: string; title?: string; src?: string }>;
    };
    expect(
      Object.values(doc.nodes)
        .filter((n) => n.type === "page")
        .map((n) => n.title),
    ).toEqual(["Úvod", "Naše pečivo", "Náš příběh", "Letošní akce", "Kontakt"]);
    // Images went into the library, and the documents name their keys.
    const keys = db
      .select()
      .from(media)
      .where(eq(media.projectId, projectId))
      .all()
      .map((m) => m.key);
    expect(keys.length).toBeGreaterThanOrEqual(10);
    for (const image of Object.values(doc.nodes).filter((n) => n.type === "image")) {
      expect(keys).toContain(image.src);
    }
    // What the owner has to do: describe the images that had no description.
    expect(
      new Set(site?.problems.filter((p) => p.severity === "error").map((p) => p.code)),
    ).toEqual(new Set(["missing-alt"]));
    const origins = db.select().from(pageOrigins).where(eq(pageOrigins.projectId, projectId)).all();
    expect(origins.map((o) => o.path)).toEqual([
      "/",
      "/nase-pecivo/",
      "/o-nas/",
      "/akce/",
      "/kontakt.html",
    ]);
    expect(row?.report?.leftOut.map((l) => l.reason)).toEqual(
      expect.arrayContaining([
        "disallowed",
        "unreachable",
        "language",
        "hidden-email",
        "form",
        "embed",
      ]),
    );
  });

  it("keeps what a retry needs: failed pages and images, the queue, the menu, the pages", async () => {
    const row = await importFixture("bakery", "/", ["/images/rohliky.jpg"]);
    const origin = server?.origin ?? "";
    const { db } = project();
    const stored = db
      .select()
      .from(imports)
      .where(eq(imports.id, row?.id ?? ""))
      .get();
    const state = stored?.retryState;
    const current = db
      .select({ id: siteDocuments.currentVersionId })
      .from(siteDocuments)
      .where(eq(siteDocuments.projectId, row?.projectId ?? ""))
      .get()?.id;
    expect(state?.versionId).toBe(current);
    expect(stored?.importVersionId).toBe(current);
    expect(state?.unreachable).toEqual([`${origin}/cenik.pdf`]);
    expect(state?.queue).toEqual([]);
    expect(state?.menu).toContain(`${origin}/kontakt.html`);
    expect(state?.failedImages).toEqual([
      {
        id: `${origin}/images/rohliky.jpg`,
        candidates: [`${origin}/images/rohliky.jpg`],
        alt: expect.any(String),
        role: "content",
        pages: ["/nase-pecivo/"],
      },
    ]);
    // Every other image arrived, under a key of the project's library.
    const keys = db
      .select()
      .from(media)
      .where(eq(media.projectId, row?.projectId ?? ""))
      .all()
      .map((m) => m.key);
    expect(Object.keys(state?.media ?? {})).toContain(`${origin}/images/chleb.jpg`);
    for (const key of Object.values(state?.media ?? {})) expect(keys).toContain(key);
    expect(state?.pages.map((p) => p.url.replace(origin, ""))).toEqual([
      "/",
      "/nase-pecivo/",
      "/o-nas/",
      "/akce/",
      "/kontakt.html",
    ]);
  });

  it("fails a site built in the browser, leaving no project, version or media file", async () => {
    const before = projectsOf().length;
    const folders = readdirSync(mediaRoot()).length;
    const row = await importFixture("spa");
    expect(row).toMatchObject({
      state: "failed",
      projectId: null,
      error: "This website builds its pages in the browser with JavaScript; we can't read it yet.",
    });
    expect(projectsOf()).toHaveLength(before);
    expect(readdirSync(mediaRoot())).toHaveLength(folders);
  });

  it("Site down: failed with a message", async () => {
    server = await startFixtureServer("bakery");
    const { origin, host } = server;
    await server.close();
    server = undefined;
    const { db, workspaceId, owner } = project();
    const started = startImport(
      db,
      { workspaceId, userId: owner.id, address: `${origin}/`, confirmed: true, locale: "cs" },
      { allowHosts: new Set([host]) },
    );
    if (!started.ok) throw new Error("not started");
    await importsSettled();
    expect(readImport(db, started.importId, owner.id)?.error).toBe(
      "Web neodpověděl. Zkontrolujte adresu a zkuste to znovu.",
    );
  });

  it("fails an import cut off by a restart", () => {
    const { db, workspaceId, owner } = project();
    db.insert(imports)
      .values({
        id: "im_cut",
        workspaceId,
        userId: owner.id,
        address: "https://x.cz/",
        state: "running",
        startedAt: new Date(),
      })
      .run();
    expect(failInterruptedImports(db)).toBe(1);
    expect(readImport(db, "im_cut", owner.id)).toMatchObject({
      state: "failed",
      error: "The import was interrupted. Start it again.",
    });
  });

  it("shows an import only to the person who started it", async () => {
    const row = await importFixture("bakery");
    const { db, outsider } = project();
    expect(readImport(db, row?.id ?? "", outsider.id)).toBeUndefined();
  });
});

describe("starting an import", () => {
  const start = (address: string, confirmed = true) => {
    const { db, workspaceId, owner } = project();
    return startImport(db, { workspaceId, userId: owner.id, address, confirmed, locale: "en" });
  };

  it("No confirmation: nothing starts", () => {
    expect(start("pekarna-ulipy.cz", false)).toEqual({
      ok: false,
      message: { key: "server.import.confirm" },
    });
  });

  it("Not a web address: refused", () => {
    for (const address of [
      "ftp://pekarna-ulipy.cz",
      "http://192.168.1.10/",
      "localhost",
      "intranet.local",
      "",
    ]) {
      expect(start(address), address).toEqual({
        ok: false,
        message: { key: "server.import.notAddress" },
      });
    }
  });

  it("refuses a second import while one runs", () => {
    const { db, workspaceId, owner } = project();
    db.insert(imports)
      .values({
        id: "im_run",
        workspaceId,
        userId: owner.id,
        address: "https://x.cz/",
        state: "running",
        startedAt: new Date(),
      })
      .run();
    expect(start("pekarna-ulipy.cz")).toEqual({
      ok: false,
      message: { key: "server.import.running" },
    });
  });

  it("reads an address without a scheme as https", () => {
    expect(importAddress("pekarna-ulipy.cz")?.href).toBe("https://pekarna-ulipy.cz/");
    expect(importAddress("  http://www.pekarna-ulipy.cz/kontakt#mapa ")?.href).toBe(
      "http://www.pekarna-ulipy.cz/kontakt",
    );
    expect(importAddress("93.184.216.34")?.href).toBe("https://93.184.216.34/");
  });
});
