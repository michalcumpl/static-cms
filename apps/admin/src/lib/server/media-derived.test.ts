import { copyFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db/index";
import { users, workspaces } from "./db/schema";
import { demoSite } from "./demo";
import { newId } from "./ids";
import { derivedFile, mediaFile, uploadImage } from "./media";
import { createProject } from "./site-documents";

let root = "";
let db: Db;
let projectId = "";
let userId = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "media-derived-"));
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

/** Uploads an image and returns its media key. */
async function uploaded(name: string, bytes: Uint8Array | Buffer): Promise<string> {
  const result = await uploadImage(
    db,
    projectId,
    userId,
    { name, bytes: new Uint8Array(bytes) },
    root,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.message));
  return result.media.key;
}

const solid = (width: number, height: number, background: string, alpha = false) =>
  sharp({
    create: {
      width,
      height,
      channels: alpha ? 4 : 3,
      background: alpha ? { r: 200, g: 40, b: 40, alpha: 1 } : background,
    },
  });

/** The RGBA value of one pixel of an image. */
async function pixel(bytes: Uint8Array | undefined, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (y * info.width + x) * 4;
  return [...data.subarray(at, at + 4)];
}

describe("share files", () => {
  it("cuts a 1200 × 630 JPEG from the middle of a portrait photo, without metadata", async () => {
    // Blue photo with a red band across its top quarter, which the middle cut leaves out.
    const photo = await solid(3000, 4000, "#0000ff")
      .composite([{ input: await solid(3000, 1000, "#ff0000").png().toBuffer(), top: 0, left: 0 }])
      .jpeg()
      .withExif({ IFD0: { Copyright: "Jana" } })
      .toBuffer();
    const key = await uploaded("pult.jpg", photo);
    const share = await derivedFile(projectId, `${key}-share.jpg`, root);
    const metadata = await sharp(share).metadata();
    expect(metadata).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
    expect(metadata.exif).toBeUndefined();
    for (const [x, y] of [
      [0, 0],
      [600, 315],
      [1199, 629],
    ] as const) {
      const [r, , b] = (await pixel(share, x, y)) as [number, number, number];
      expect(b, `blue at ${x},${y}`).toBeGreaterThan(200);
      expect(r, `no red at ${x},${y}`).toBeLessThan(60);
    }
  });

  it("is made from the largest variant of an image used before the library", async () => {
    const require = createRequire(import.meta.url);
    const variant = require.resolve("@static-cms/site/fixtures/media/hero.png-320.webp");
    mkdirSync(join(root, projectId), { recursive: true });
    copyFileSync(variant, join(root, projectId, "hero.png-320.webp"));
    const share = await derivedFile(projectId, "hero.png-share.jpg", root);
    expect(await sharp(share).metadata()).toMatchObject({ width: 1200, height: 630 });
  });

  it("is made once and kept", async () => {
    const key = await uploaded("pult.jpg", await solid(800, 600, "#c08040").jpeg().toBuffer());
    const first = await mediaFile(projectId, `${key}-share.jpg`, root);
    const path = join(root, projectId, `${key}-share.jpg`);
    const madeAt = statSync(path).mtimeMs;
    // Without its source, the kept file is still served.
    rmSync(join(root, projectId, "originals"), { recursive: true });
    const second = await mediaFile(projectId, `${key}-share.jpg`, root);
    expect(second).toEqual(first);
    expect(statSync(path).mtimeMs).toBe(madeAt);
  });
});

describe("icon files", () => {
  it("scales a small logo up to all three sizes", async () => {
    const key = await uploaded("logo.png", await solid(100, 100, "#8a4b1f").png().toBuffer());
    for (const size of [32, 180, 512]) {
      const icon = await mediaFile(projectId, `${key}-icon-${size}.png`, root);
      expect(await sharp(icon).metadata()).toMatchObject({
        format: "png",
        width: size,
        height: size,
      });
    }
  });

  it("fits a wide logo whole, on transparent padding, and white padding for phones", async () => {
    const logo = await solid(400, 100, "", true).png().toBuffer();
    const key = await uploaded("logo.png", logo);
    const icon = await derivedFile(projectId, `${key}-icon-512.png`, root);
    // The logo is 512 × 128, centred: rows 192–319 are logo, the rest padding.
    expect((await pixel(icon, 256, 256))[3]).toBe(255);
    expect(await pixel(icon, 256, 10)).toEqual([0, 0, 0, 0]);
    expect((await pixel(icon, 0, 200))[3]).toBe(255);
    const phone = await derivedFile(projectId, `${key}-icon-180.png`, root);
    expect(await pixel(phone, 90, 5)).toEqual([255, 255, 255, 255]);
    expect(await pixel(phone, 90, 90)).toEqual([200, 40, 40, 255]);
  });
});

describe("names", () => {
  it("serves only the allowed derived names", async () => {
    const key = await uploaded("pult.jpg", await solid(800, 600, "#c08040").jpeg().toBuffer());
    for (const name of [
      `${key}-icon-64.png`,
      `${key}-share.png`,
      `${key}-icon-32.jpg`,
      `../${key}-share.jpg`,
      "missing-1a2b-share.jpg",
    ]) {
      expect(await mediaFile(projectId, name, root), name).toBeUndefined();
    }
  });
});
