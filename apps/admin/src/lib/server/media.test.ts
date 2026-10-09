import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ne } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db/index";
import { users, versions, workspaces } from "./db/schema";
import { demoSite } from "./demo";
import { newId } from "./ids";
import {
  bodySizeWarning,
  cleanupMedia,
  editImage,
  listLibrary,
  mediaFile,
  registerAllLegacyMedia,
  removeFromLibrary,
  uploadImage,
} from "./media";
import { createProject, readSite, saveSite } from "./site-documents";

let root = "";
let db: Db;
let projectId = "";
let userId = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "media-"));
  db = openDatabase(":memory:");
  const workspaceId = newId("w");
  userId = newId("u");
  db.insert(workspaces).values({ id: workspaceId, name: "Pekárna", createdAt: new Date() }).run();
  db.insert(users).values({ id: userId, email: "jana@example.cz", createdAt: new Date() }).run();
  projectId = createProject(db, workspaceId, "Pekárna", demoSite());
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function image(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp" = "jpeg",
  color = "#c08040",
): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: color } })
      [format]()
      .toBuffer(),
  );
}

const upload = (name: string, bytes: Uint8Array) =>
  uploadImage(db, projectId, userId, { name, bytes }, root);

/** Every stored file of the project: variants and originals. */
function storedFiles(): string[] {
  const folder = join(root, projectId);
  return [
    ...readdirSync(folder)
      .filter((n) => n.endsWith(".webp"))
      .map((n) => join(folder, n)),
    ...readdirSync(join(folder, "originals")).map((n) => join(folder, "originals", n)),
  ];
}

describe("uploadImage", () => {
  it("accepts a photo and returns its key and size", async () => {
    const result = await upload("Chléb na pultu.jpg", await image(4032, 3024));
    expect(result).toMatchObject({ ok: true, created: true });
    if (!result.ok) return;
    expect(result.media.key).toMatch(/^chleb-na-pultu-[0-9a-f]{8}$/);
    expect(result.media).toMatchObject({ width: 4032, height: 3024 });
  });

  it("stores variants 480/960/1600/2400 of a large photo, and the original", async () => {
    const result = await upload("pult.jpg", await image(4032, 3024));
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    const { key } = result.media;
    for (const [width, height] of [
      [480, 360],
      [960, 720],
      [1600, 1200],
      [2400, 1800],
    ] as const) {
      const bytes = await mediaFile(projectId, `${key}-${width}.webp`, root);
      if (!bytes) throw new Error(`no ${width} variant`);
      expect(await sharp(bytes).metadata()).toMatchObject({ format: "webp", width, height });
    }
    expect(readdirSync(join(root, projectId, "originals"))).toEqual([`${key}.jpg`]);
  });

  it("stores variants 480/960/1000 of a 1000 px image", async () => {
    const result = await upload("maly.png", await image(1000, 500, "png"));
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    const variants = readdirSync(join(root, projectId)).filter((n) => n.endsWith(".webp"));
    expect(variants.sort()).toEqual(
      [480, 960, 1000].map((w) => `${result.media.key}-${w}.webp`).sort(),
    );
  });

  it("keeps a transparent PNG logo transparent in its variants", async () => {
    // A 600 × 200 logo: transparent, with an opaque dark mark on its left third.
    const mark = await sharp({
      create: { width: 200, height: 200, channels: 4, background: "#1f5a8aff" },
    })
      .png()
      .toBuffer();
    const logo = await sharp({
      create: { width: 600, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: mark, left: 0, top: 0 }])
      .png()
      .toBuffer();
    const result = await upload("logo.png", new Uint8Array(logo));
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    const bytes = await mediaFile(projectId, `${result.media.key}-480.webp`, root);
    if (!bytes) throw new Error("no 480 variant");
    expect(await sharp(bytes).metadata()).toMatchObject({ format: "webp", hasAlpha: true });
    const { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
    expect(alphaAt(400, 80)).toBe(0);
    expect(alphaAt(40, 80)).toBe(255);
  });

  it("refuses an SVG disguised as a PNG, a PDF and garbage", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    );
    const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
    for (const [name, bytes] of [
      ["logo.png", svg],
      ["menu.pdf", pdf],
      ["x.jpg", new Uint8Array([1, 2, 3])],
    ] as const) {
      expect(await upload(name, bytes)).toEqual({
        ok: false,
        status: 415,
        message: { key: "server.media.accepted" },
      });
    }
    expect(listLibrary(db, projectId)).toEqual([]);
  });

  it("refuses files over 20 MB and images over 40 megapixels", async () => {
    expect(await upload("velky.jpg", new Uint8Array(25 * 1024 * 1024))).toEqual({
      ok: false,
      status: 413,
      message: { key: "server.media.tooLarge" },
    });
    const huge = await sharp({
      create: { width: 8000, height: 6000, channels: 3, background: "#000" },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(await upload("obri.png", new Uint8Array(huge))).toMatchObject({
      ok: false,
      status: 413,
      message: { key: "server.media.megapixels" },
    });
  });

  it("refuses animated images", async () => {
    const frames = await Promise.all([image(20, 10, "png", "red"), image(20, 10, "png", "blue")]);
    const animated = await sharp(frames.map(Buffer.from), { join: { animated: true } })
      .webp()
      .toBuffer();
    expect(await upload("gif.webp", new Uint8Array(animated))).toMatchObject({
      ok: false,
      status: 415,
    });
  });

  it("removes EXIF and GPS from every stored file", async () => {
    const photo = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#789" },
    })
      .jpeg()
      .withExif({
        IFD0: { Make: "Phone", Model: "X" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "50/1 1/1 0/1" },
      })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();
    const result = await upload("telefon.jpg", new Uint8Array(photo));
    expect(result.ok).toBe(true);
    for (const file of storedFiles()) {
      const metadata = await sharp(readFileSync(file)).metadata();
      expect(metadata.exif, file).toBeUndefined();
      expect(metadata.xmp, file).toBeUndefined();
      expect(metadata.iptc, file).toBeUndefined();
      expect(readFileSync(file).includes("GPS"), file).toBe(false);
    }
  });

  it("stores a sideways photo upright, with its upright size", async () => {
    const sideways = await sharp({
      create: { width: 1200, height: 600, channels: 3, background: "#456" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const result = await upload("bokem.jpg", new Uint8Array(sideways));
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    expect(result.media).toMatchObject({ width: 600, height: 1200 });
    const variant = await mediaFile(projectId, `${result.media.key}-600.webp`, root);
    expect(await sharp(variant).metadata()).toMatchObject({ width: 600, height: 1200 });
  });

  it("returns the existing image for the same content under another name", async () => {
    const bytes = await image(800, 600);
    const first = await upload("pult.jpg", bytes);
    const second = await upload("IMG_0042.jpg", bytes);
    if (!first.ok || !second.ok) throw new Error("upload failed");
    expect(second).toMatchObject({ created: false });
    expect(second.media.key).toBe(first.media.key);
    expect(first.media.key).toMatch(/^pult-/);
    expect(listLibrary(db, projectId).map((m) => m.key)).toEqual([first.media.key]);
  });

  it("names images without a usable name image-<hash>", async () => {
    const result = await upload("!!!.jpg", await image(100, 100));
    expect(result.ok && result.media.key).toMatch(/^image-[0-9a-f]{8}$/);
  });
});

describe("library", () => {
  it("lists uploads newest first", async () => {
    const first = await upload("prvni.jpg", await image(100, 100, "jpeg", "#111"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await upload("druhy.jpg", await image(100, 100, "jpeg", "#222"));
    if (!first.ok || !second.ok) throw new Error("upload failed");
    expect(listLibrary(db, projectId).map((m) => m.originalName)).toEqual([
      "druhy.jpg",
      "prvni.jpg",
    ]);
  });

  it("hides a removed image but keeps its files, and a re-upload brings it back", async () => {
    const bytes = await image(500, 500);
    const result = await upload("pult.jpg", bytes);
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    const { key } = result.media;
    expect(removeFromLibrary(db, projectId, key)).toBe(true);
    expect(listLibrary(db, projectId)).toEqual([]);
    expect(await mediaFile(projectId, `${key}-480.webp`, root)).toBeDefined();
    expect(removeFromLibrary(db, projectId, key)).toBe(false);

    await upload("znovu.jpg", bytes);
    expect(listLibrary(db, projectId).map((m) => m.key)).toEqual([key]);
  });
});

describe("editImage", () => {
  const edit = (
    key: string,
    turn: 0 | 90 | 180 | 270,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => editImage(db, projectId, userId, key, { turn, crop: { x, y, width: w, height: h } }, root);

  async function uploaded(name: string, bytes: Uint8Array): Promise<string> {
    const result = await upload(name, bytes);
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    return result.media.key;
  }

  /** A picture whose left half is red and right half blue. */
  async function halves(width: number, height: number): Promise<Uint8Array> {
    const half = await sharp({
      create: { width: width / 2, height, channels: 3, background: "#0000ff" },
    })
      .png()
      .toBuffer();
    return new Uint8Array(
      await sharp({ create: { width, height, channels: 3, background: "#ff0000" } })
        .composite([{ input: half, left: width / 2, top: 0 }])
        .png()
        .toBuffer(),
    );
  }

  /** The colour at a point of an image's stored original, as `[r, g, b]`. */
  async function pixel(key: string, x: number, y: number): Promise<number[]> {
    const file = readdirSync(join(root, projectId, "originals")).find((n) =>
      n.startsWith(`${key}.`),
    );
    const { data } = await sharp(readFileSync(join(root, projectId, "originals", file ?? "")))
      .extract({ left: x, top: y, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return [...data];
  }

  it("Crop a photo: a new image, the source unchanged", async () => {
    const key = await uploaded("pult.jpg", await image(1600, 1200));
    const result = await edit(key, 0, 400, 0, 1200, 1200);
    expect(result).toMatchObject({ ok: true, created: true });
    if (!result.ok) return;
    expect(result.media.key).toMatch(/^pult-[0-9a-f]{8}$/);
    expect(result.media.key).not.toBe(key);
    expect(result.media).toMatchObject({
      width: 1200,
      height: 1200,
      originalName: "pult.jpg",
      source: { key, turn: 0, crop: { x: 400, y: 0, width: 1200, height: 1200 } },
    });
    expect(listLibrary(db, projectId).map((m) => m.key)).toEqual([result.media.key, key]);
    expect(listLibrary(db, projectId)[1]).toMatchObject({ width: 1600, height: 1200 });
    expect(listLibrary(db, projectId)[1]?.source).toBeUndefined();
    expect(await mediaFile(projectId, `${result.media.key}-1200.webp`, root)).toBeDefined();
  });

  it("Turn a sideways scan: a quarter turn clockwise", async () => {
    const key = await uploaded("sken.png", await halves(300, 200));
    const result = await edit(key, 90, 0, 0, 200, 300);
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    expect(result.media).toMatchObject({ width: 200, height: 300 });
    // The left half (red) is now on top.
    expect(await pixel(result.media.key, 100, 10)).toEqual([255, 0, 0]);
    expect(await pixel(result.media.key, 100, 290)).toEqual([0, 0, 255]);
  });

  it("cuts the turned picture, not the source", async () => {
    const key = await uploaded("sken.png", await halves(300, 200));
    const result = await edit(key, 270, 0, 150, 200, 150);
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    // Turned left, the right half (blue) is on top; the bottom half of that is red.
    expect(result.media).toMatchObject({ width: 200, height: 150 });
    expect(await pixel(result.media.key, 100, 75)).toEqual([255, 0, 0]);
  });

  it("Edit an edited image: from the source, and the whole picture is the source", async () => {
    const key = await uploaded("pult.jpg", await image(1600, 1200));
    const crop = await edit(key, 0, 0, 0, 500, 500);
    if (!crop.ok) throw new Error(JSON.stringify(crop.message));
    const wider = await edit(crop.media.key, 0, 0, 0, 1000, 800);
    if (!wider.ok) throw new Error(JSON.stringify(wider.message));
    expect(wider.media).toMatchObject({ width: 1000, height: 800, source: { key } });
    const whole = await edit(crop.media.key, 0, 0, 0, 1600, 1200);
    expect(whole).toMatchObject({ ok: true, created: false, media: { key } });
  });

  it("Same edit twice: one image", async () => {
    const key = await uploaded("pult.jpg", await image(800, 600));
    const first = await edit(key, 0, 100, 100, 300, 300);
    const second = await edit(key, 0, 100, 100, 300, 300);
    if (!first.ok || !second.ok) throw new Error("refused");
    expect(second).toMatchObject({ created: false });
    expect(second.media.key).toBe(first.media.key);
    expect(listLibrary(db, projectId)).toHaveLength(2);
  });

  it("brings a removed crop back when it is made again", async () => {
    const key = await uploaded("pult.jpg", await image(800, 600));
    const first = await edit(key, 0, 100, 100, 300, 300);
    if (!first.ok) throw new Error("refused");
    removeFromLibrary(db, projectId, first.media.key);
    await edit(key, 0, 100, 100, 300, 300);
    expect(listLibrary(db, projectId).map((m) => m.key)).toContain(first.media.key);
  });

  it("Crop outside the picture, too small, or not whole pixels: refused, nothing stored", async () => {
    const key = await uploaded("pult.jpg", await image(1000, 800));
    const before = storedFiles().length;
    expect(await edit(key, 0, 500, 0, 600, 400)).toEqual({
      ok: false,
      status: 400,
      message: expect.objectContaining({ key: "server.media.cropOutside" }),
    });
    expect(await edit(key, 0, 0, 0, 40, 400)).toMatchObject({
      status: 400,
      message: { key: "server.media.cropTooSmall" },
    });
    expect(await edit(key, 0, 0.5, 0, 400, 400)).toMatchObject({
      message: { key: "server.media.editInvalid" },
    });
    expect(await edit(key, 45 as 0, 0, 0, 400, 400)).toMatchObject({
      message: { key: "server.media.editInvalid" },
    });
    // Turned, the 1000 × 800 picture is 800 wide.
    expect(await edit(key, 90, 0, 0, 1000, 800)).toMatchObject({
      message: { key: "server.media.cropOutside" },
    });
    expect(storedFiles()).toHaveLength(before);
    expect(listLibrary(db, projectId)).toHaveLength(1);
  });

  it("refuses an unknown image", async () => {
    expect(await edit("nic-12345678", 0, 0, 0, 100, 100)).toMatchObject({
      ok: false,
      status: 404,
    });
  });

  it("cuts from the largest variant when the original is missing", async () => {
    const key = await uploaded("velky.jpg", await image(3000, 2000));
    rmSync(join(root, projectId, "originals", `${key}.jpg`));
    const result = await edit(key, 0, 1500, 0, 1500, 2000);
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    // The 2400-pixel variant stands in: the crop is scaled to it.
    expect(result.media).toMatchObject({ width: 1200, height: 1600, source: { key } });
  });

  it("stores the crop of a phone photo without EXIF or GPS", async () => {
    const photo = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: "#789" },
    })
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "50/1 1/1 0/1" } })
      .toBuffer();
    const key = await uploaded("telefon.jpg", new Uint8Array(photo));
    const result = await edit(key, 90, 0, 0, 600, 600);
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    for (const file of storedFiles()) {
      const metadata = await sharp(readFileSync(file)).metadata();
      expect(metadata.exif, file).toBeUndefined();
      expect(readFileSync(file).includes("GPS"), file).toBe(false);
    }
  });
});

describe("mediaFile", () => {
  it("serves only variant files, never originals or other names", async () => {
    const result = await upload("pult.jpg", await image(500, 500));
    if (!result.ok) throw new Error(JSON.stringify(result.message));
    const { key } = result.media;
    expect(await mediaFile(projectId, `${key}-480.webp`, root)).toBeDefined();
    expect(await mediaFile(projectId, `${key}.jpg`, root)).toBeUndefined();
    expect(await mediaFile(projectId, `originals/${key}.jpg`, root)).toBeUndefined();
    expect(await mediaFile(projectId, "../x-1.webp", root)).toBeUndefined();
  });
});

describe("media from before the library", () => {
  function placeDemoHero() {
    const require = createRequire(import.meta.url);
    const demoHero = require.resolve("@webmio/model/fixtures/media/hero.png");
    mkdirSync(join(root, projectId), { recursive: true });
    copyFileSync(demoHero, join(root, projectId, "hero.png"));
  }

  it("registers the imported demo image under its file name, with its variant", async () => {
    placeDemoHero();
    expect(await registerAllLegacyMedia(db, root)).toEqual(new Map([[projectId, ["hero.png"]]]));
    expect(listLibrary(db, projectId)).toEqual([
      expect.objectContaining({ key: "hero.png", width: 320, height: 180 }),
    ]);
    const variant = await mediaFile(projectId, "hero.png-320.webp", root);
    expect(await sharp(variant).metadata()).toMatchObject({ format: "webp", width: 320 });
    expect(readdirSync(join(root, projectId))).toContain("hero.png");
  });

  it("registers older files whose names look like variants", async () => {
    mkdirSync(join(root, projectId), { recursive: true });
    const { writeFileSync } = await import("node:fs");
    const webp = async (width: number) =>
      sharp({ create: { width, height: 100, channels: 3, background: `#${width}` } })
        .webp()
        .toBuffer();
    writeFileSync(join(root, projectId, "jak-pracujeme-0.webp"), await webp(800));
    writeFileSync(join(root, projectId, "katerina-350.webp"), await webp(350));
    const registered = await registerAllLegacyMedia(db, root);
    expect(registered.get(projectId)?.sort()).toEqual([
      "jak-pracujeme-0.webp",
      "katerina-350.webp",
    ]);
    for (const file of [
      "jak-pracujeme-0.webp-480.webp",
      "jak-pracujeme-0.webp-800.webp",
      "katerina-350.webp-350.webp",
    ]) {
      expect(await mediaFile(projectId, file, root), file).toBeDefined();
    }
    // Their generated variants are recognised as such on the next start.
    expect(await registerAllLegacyMedia(db, root)).toEqual(new Map());
  });

  it("registers nothing new on a second start", async () => {
    placeDemoHero();
    await registerAllLegacyMedia(db, root);
    expect(await registerAllLegacyMedia(db, root)).toEqual(new Map());
    expect(listLibrary(db, projectId)).toHaveLength(1);
  });

  it("leaves uploaded variants and originals alone", async () => {
    await upload("pult.jpg", await image(500, 500));
    expect(await registerAllLegacyMedia(db, root)).toEqual(new Map());
  });
});

describe("bodySizeWarning", () => {
  it("warns in production when BODY_SIZE_LIMIT is missing or below 25M", () => {
    expect(bodySizeWarning({ NODE_ENV: "production" })).toMatch(/not set \(512K\)/);
    expect(bodySizeWarning({ NODE_ENV: "production", BODY_SIZE_LIMIT: "10M" })).toMatch(
      /"10M"; set it to at least 25M/,
    );
    expect(bodySizeWarning({ NODE_ENV: "production", BODY_SIZE_LIMIT: "nonsense" })).toBeDefined();
  });

  it("is quiet when the limit is large enough, or outside production", () => {
    for (const limit of ["25M", "26214400", "1G", "Infinity", "30m"]) {
      expect(bodySizeWarning({ NODE_ENV: "production", BODY_SIZE_LIMIT: limit }), limit).toBe(
        undefined,
      );
    }
    expect(bodySizeWarning({ NODE_ENV: "development" })).toBeUndefined();
  });
});

describe("cleanupMedia", () => {
  // biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
  type Doc = { nodes: Record<string, any> };

  /** Saves the current document with its hero image set to `key`. */
  function saveWithHeroImage(key: string, width: number) {
    const site = readSite(db, projectId);
    if (!site) throw new Error("no site");
    const doc = structuredClone(site.document) as Doc;
    Object.assign(doc.nodes.image_hero, { src: key, width, height: width });
    const result = saveSite(db, projectId, userId, doc, site.version);
    if (!result.ok) throw new Error("save failed");
  }

  it("deletes removed images no version uses, and keeps those an older version uses", async () => {
    const unused = await upload("nepouzity.jpg", await image(600, 600, "jpeg", "#111"));
    const older = await upload("starsi.jpg", await image(600, 600, "jpeg", "#222"));
    const kept = await upload("v-knihovne.jpg", await image(600, 600, "jpeg", "#333"));
    if (!unused.ok || !older.ok || !kept.ok) throw new Error("upload failed");
    saveWithHeroImage(older.media.key, 600);
    saveWithHeroImage("hero.png", 320);
    removeFromLibrary(db, projectId, unused.media.key);
    removeFromLibrary(db, projectId, older.media.key);

    expect(await cleanupMedia(db, { dryRun: true, root })).toEqual([
      { projectId, key: unused.media.key },
    ]);
    expect(await mediaFile(projectId, `${unused.media.key}-480.webp`, root)).toBeDefined();

    expect(await cleanupMedia(db, { root })).toEqual([{ projectId, key: unused.media.key }]);
    const left = readdirSync(join(root, projectId)).concat(
      readdirSync(join(root, projectId, "originals")),
    );
    expect(left.some((name) => name.startsWith(unused.media.key))).toBe(false);
    expect(await mediaFile(projectId, `${older.media.key}-600.webp`, root)).toBeDefined();
    expect(await mediaFile(projectId, `${kept.media.key}-600.webp`, root)).toBeDefined();
    expect(listLibrary(db, projectId).map((m) => m.key)).toEqual([kept.media.key]);
    expect(await cleanupMedia(db, { root })).toEqual([]);
  });

  it("Source of a kept crop: kept with the crop, deleted with it", async () => {
    const group = await upload("skupina.jpg", await image(800, 600, "jpeg", "#444"));
    if (!group.ok) throw new Error("upload failed");
    const crop = await editImage(
      db,
      projectId,
      userId,
      group.media.key,
      { turn: 0, crop: { x: 0, y: 0, width: 400, height: 400 } },
      root,
    );
    if (!crop.ok) throw new Error("edit failed");
    saveWithHeroImage(crop.media.key, 400);
    removeFromLibrary(db, projectId, group.media.key);
    expect(await cleanupMedia(db, { root })).toEqual([]);
    expect(await mediaFile(projectId, `${group.media.key}-800.webp`, root)).toBeDefined();

    // Once the crop goes too, so does its source.
    saveWithHeroImage("hero.png", 320);
    const site = readSite(db, projectId);
    if (!site) throw new Error("no site");
    // Older versions used the crop; forget them, as if they had never been saved.
    db.delete(versions).where(ne(versions.id, site.versionId)).run();
    removeFromLibrary(db, projectId, crop.media.key);
    expect((await cleanupMedia(db, { root })).map((d) => d.key).sort()).toEqual(
      [crop.media.key, group.media.key].sort(),
    );
  });

  it("deletes a removed favicon's icon and share files with it, and keeps a used image's", async () => {
    const favicon = await upload("logo.png", await image(300, 300, "png", "#444"));
    const used = await upload("pult.jpg", await image(600, 600, "jpeg", "#555"));
    if (!favicon.ok || !used.ok) throw new Error("upload failed");
    const derived = (key: string) => [
      `${key}-icon-32.png`,
      `${key}-icon-180.png`,
      `${key}-icon-512.png`,
      `${key}-share.jpg`,
    ];
    for (const name of [...derived(favicon.media.key), ...derived(used.media.key)]) {
      expect(await mediaFile(projectId, name, root), name).toBeDefined();
    }
    saveWithHeroImage(used.media.key, 600);
    removeFromLibrary(db, projectId, favicon.media.key);
    removeFromLibrary(db, projectId, used.media.key);

    expect(await cleanupMedia(db, { root })).toEqual([{ projectId, key: favicon.media.key }]);
    const left = readdirSync(join(root, projectId));
    expect(left.filter((name) => name.startsWith(favicon.media.key))).toEqual([]);
    for (const name of derived(used.media.key)) expect(left, name).toContain(name);
  });
});
