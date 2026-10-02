// A project's images (media design.md decisions 1–3): upload and processing with sharp,
// the library, and reading the published variant files and the icon and share files made
// from them.

import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ICON_SIZES,
  type IconSize,
  iconFile,
  imageFile,
  imageVariants,
  shareFile,
  slugify,
} from "@static-cms/site";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import sharp, { type Metadata } from "sharp";
import { type Said, said } from "$lib/i18n";
import type { Db } from "./db/index";
import { media, projects, siteDocuments, versions } from "./db/schema";
import { mediaRoot } from "./import-working-copy";

// A 40-megapixel decode needs ~160 MB; keep one image in memory at a time on a small server.
sharp.cache(false);
sharp.concurrency(1);

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
const FORMATS = ["jpeg", "png", "webp"] as const;
type Format = (typeof FORMATS)[number];
const EXTENSIONS: Record<Format, string> = { jpeg: "jpg", png: "png", webp: "webp" };
const VARIANT_QUALITY = 80;
const ORIGINAL_QUALITY = 95;

// The site validator's rule for image sources: a plain file name that can't leave the folder.
const MEDIA_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const VARIANT_FILE = /^([A-Za-z0-9][A-Za-z0-9._-]*)-(\d+)\.webp$/;
// Icon and share files (seo-and-metadata design.md decision 3), matching the names that
// `iconFile` and `shareFile` give.
const DERIVED_FILE = /^([A-Za-z0-9][A-Za-z0-9._-]*)-(?:icon-(32|180|512)\.png|share\.jpg)$/;
type DerivedKind = IconSize | "share";
const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 630;
const SHARE_QUALITY = 82;

/** The request body limit uploads need; adapter-node's default of 512 KB refuses every photo. */
export const REQUIRED_BODY_SIZE_LIMIT = 25 * 1024 * 1024;

/** adapter-node's `BODY_SIZE_LIMIT` in bytes: a number with an optional K, M or G suffix. */
function parseBodySizeLimit(value: string): number {
  if (value.trim() === "Infinity") return Number.POSITIVE_INFINITY;
  const match = /^(\d+)([KMG]?)$/i.exec(value.trim());
  if (!match) return Number.NaN;
  const factor = { "": 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[
    (match[2] ?? "").toUpperCase() as "" | "K" | "M" | "G"
  ];
  return Number(match[1]) * factor;
}

/**
 * A warning when the production server would refuse image uploads before they reach the
 * upload code, or undefined when `BODY_SIZE_LIMIT` is large enough (or not in production).
 */
export function bodySizeWarning(env: Record<string, string | undefined>): string | undefined {
  if (env.NODE_ENV !== "production") return undefined;
  const limit = env.BODY_SIZE_LIMIT;
  if (limit !== undefined && parseBodySizeLimit(limit) >= REQUIRED_BODY_SIZE_LIMIT) {
    return undefined;
  }
  return `BODY_SIZE_LIMIT is ${limit === undefined ? "not set (512K)" : `"${limit}"`}; set it to at least 25M, or image uploads over that size are refused.`;
}

export interface MediaItem {
  key: string;
  originalName: string;
  width: number;
  height: number;
  createdAt: Date;
}

export type UploadResult =
  | { ok: true; created: boolean; media: MediaItem }
  | { ok: false; status: 413 | 415; message: Said };

export function projectFolder(projectId: string, root = mediaRoot()): string {
  return join(root, projectId);
}

/** Where a project keeps its metadata-free originals, which are never served. */
function originalsFolder(projectId: string, root: string): string {
  return join(projectFolder(projectId, root), "originals");
}

// Uploads are processed one at a time, in arrival order.
let queue: Promise<unknown> = Promise.resolve();
function serially<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Writes a file under a temporary name and renames it into place, so readers never see half. */
function writeAtomically(path: string, bytes: Uint8Array): void {
  const temporary = `${path}.tmp-${randomBytes(6).toString("hex")}`;
  writeFileSync(temporary, bytes);
  renameSync(temporary, path);
}

function toItem(row: typeof media.$inferSelect): MediaItem {
  const { key, originalName, width, height, createdAt } = row;
  return { key, originalName, width, height, createdAt };
}

interface Inspected {
  format: Format;
  width: number;
  height: number;
}

/** Reads an image's header: its format and upright size, or why it can't be used. */
async function inspect(
  bytes: Uint8Array,
): Promise<{ ok: true; image: Inspected } | { ok: false; status: 413 | 415; message: Said }> {
  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, { animated: true }).metadata();
  } catch {
    return { ok: false, status: 415, message: said("server.media.accepted") };
  }
  const format = metadata.format as Format;
  if (!FORMATS.includes(format))
    return { ok: false, status: 415, message: said("server.media.accepted") };
  if ((metadata.pages ?? 1) > 1) {
    return { ok: false, status: 415, message: said("server.media.animated") };
  }
  const { width = 0, height = 0 } = metadata;
  if (width * height > MAX_PIXELS) {
    return { ok: false, status: 413, message: said("server.media.megapixels") };
  }
  // EXIF orientations 5–8 turn the picture by 90°: the upright image is the other way round.
  const turned = (metadata.orientation ?? 1) >= 5;
  return {
    ok: true,
    image: { format, width: turned ? height : width, height: turned ? width : height },
  };
}

/**
 * Stores a decoded image as a metadata-free original and its WebP variants. `rotate()` applies
 * the EXIF orientation to the pixels; sharp's output then carries no metadata at all (EXIF,
 * GPS, XMP, IPTC) and is converted to sRGB.
 */
async function storeImage(
  bytes: Uint8Array,
  key: string,
  image: Inspected,
  projectId: string,
  root: string,
): Promise<void> {
  const upright = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate();
  const folder = projectFolder(projectId, root);
  const originals = originalsFolder(projectId, root);
  mkdirSync(originals, { recursive: true });

  const original =
    image.format === "jpeg"
      ? upright.clone().jpeg({ quality: ORIGINAL_QUALITY })
      : image.format === "png"
        ? upright.clone().png()
        : upright.clone().webp({ quality: ORIGINAL_QUALITY });
  writeAtomically(join(originals, `${key}.${EXTENSIONS[image.format]}`), await original.toBuffer());

  for (const width of imageVariants(image.width)) {
    const variant = await upright
      .clone()
      .resize({ width })
      .webp({ quality: VARIANT_QUALITY })
      .toBuffer();
    writeAtomically(join(folder, imageFile(key, width)), variant);
  }
}

/** The media key of a new upload: the slug of its name and the start of its content hash. */
function newKey(db: Db, projectId: string, name: string, sha256: string): string {
  const base = slugify(name.replace(/\.[^.]*$/, "")) || "image";
  for (const length of [8, 12, 16, 64]) {
    const key = `${base}-${sha256.slice(0, length)}`;
    const taken = db
      .select({ sha256: media.sha256 })
      .from(media)
      .where(and(eq(media.projectId, projectId), eq(media.key, key)))
      .get();
    if (!taken) return key;
  }
  throw new Error(`No free media key for ${name}`);
}

/**
 * Uploads an image to a project: checks it, strips its metadata, and stores its variants.
 * The same content uploaded again (under any name) returns the existing image, and brings it
 * back into the library if it was removed.
 */
export function uploadImage(
  db: Db,
  projectId: string,
  userId: string | null,
  upload: { name: string; bytes: Uint8Array },
  root = mediaRoot(),
): Promise<UploadResult> {
  const { bytes, name } = upload;
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return Promise.resolve({
      ok: false,
      status: 413,
      message: said("server.media.tooLarge"),
    });
  }
  return serially(async (): Promise<UploadResult> => {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const existing = db
      .select()
      .from(media)
      .where(and(eq(media.projectId, projectId), eq(media.sha256, sha256)))
      .get();
    if (existing) {
      if (existing.removedAt) {
        db.update(media)
          .set({ removedAt: null })
          .where(and(eq(media.projectId, projectId), eq(media.key, existing.key)))
          .run();
      }
      return { ok: true, created: false, media: toItem(existing) };
    }

    const inspected = await inspect(bytes);
    if (!inspected.ok) return inspected;
    const { image } = inspected;
    const key = newKey(db, projectId, name, sha256);
    await storeImage(bytes, key, image, projectId, root);
    const row = {
      projectId,
      key,
      sha256,
      originalName: name,
      format: image.format,
      width: image.width,
      height: image.height,
      bytes: bytes.byteLength,
      createdAt: new Date(),
      createdBy: userId,
    };
    // Files first, row last: a crash never leaves a listed image without its files.
    db.insert(media).values(row).run();
    return { ok: true, created: true, media: toItem({ ...row, removedAt: null }) };
  });
}

/** A project's library: images not removed from it, newest first. */
export function listLibrary(db: Db, projectId: string): MediaItem[] {
  return db
    .select()
    .from(media)
    .where(and(eq(media.projectId, projectId), isNull(media.removedAt)))
    .orderBy(desc(media.createdAt), desc(media.key))
    .all()
    .map(toItem);
}

/**
 * Hides an image from the library. Its files stay: documents, older versions and undo may
 * still use it. Returns false for an unknown key.
 */
export function removeFromLibrary(db: Db, projectId: string, key: string): boolean {
  const result = db
    .update(media)
    .set({ removedAt: new Date() })
    .where(and(eq(media.projectId, projectId), eq(media.key, key), isNull(media.removedAt)))
    .run();
  return result.changes > 0;
}

/** A variant file (`<key>-<width>.webp`) of a project, or undefined when it doesn't exist. */
function variantFile(
  projectId: string,
  name: string,
  root: string,
): Uint8Array<ArrayBuffer> | undefined {
  if (!VARIANT_FILE.test(name)) return undefined;
  return readIfExists(join(projectFolder(projectId, root), name));
}

function readIfExists(path: string): Uint8Array<ArrayBuffer> | undefined {
  try {
    return new Uint8Array(readFileSync(path));
  } catch {
    return undefined;
  }
}

/**
 * The image a derived file is made from (seo-and-metadata design.md decision 3): its
 * metadata-free original, else the largest of its variants (images used before the library).
 */
function derivedSource(projectId: string, key: string, root: string): Uint8Array | undefined {
  for (const extension of Object.values(EXTENSIONS)) {
    const original = readIfExists(join(originalsFolder(projectId, root), `${key}.${extension}`));
    if (original) return original;
  }
  let names: string[];
  try {
    names = readdirSync(projectFolder(projectId, root));
  } catch {
    return undefined;
  }
  const widths = names.flatMap((name) => {
    const match = VARIANT_FILE.exec(name);
    return match?.[1] === key ? [Number(match[2])] : [];
  });
  if (widths.length === 0) return undefined;
  return variantFile(projectId, imageFile(key, Math.max(...widths)), root);
}

/** Makes a derived file's bytes from its source image. */
async function makeDerived(source: Uint8Array, kind: DerivedKind): Promise<Buffer> {
  const upright = sharp(source, { limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate();
  if (kind === "share") {
    return upright
      .resize(SHARE_WIDTH, SHARE_HEIGHT, { fit: "cover", position: "centre" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: SHARE_QUALITY })
      .toBuffer();
  }
  // Phones show transparency in home-screen icons as black, so that icon gets white.
  const white = kind === 180;
  const icon = upright.resize(kind, kind, {
    fit: "contain",
    background: white ? "#ffffff" : { r: 0, g: 0, b: 0, alpha: 0 },
  });
  return (white ? icon.flatten({ background: "#ffffff" }) : icon).png().toBuffer();
}

/**
 * An icon or share file of a project's image (media spec, "Icon and share files"), made from
 * the image when first asked for and kept next to its variants. Undefined for other names and
 * for images without a source.
 */
export async function derivedFile(
  projectId: string,
  name: string,
  root = mediaRoot(),
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const match = DERIVED_FILE.exec(name);
  const key = match?.[1];
  if (!match || key === undefined) return undefined;
  const path = join(projectFolder(projectId, root), name);
  const kept = readIfExists(path);
  if (kept) return kept;
  const kind: DerivedKind = match[2] === undefined ? "share" : (Number(match[2]) as IconSize);
  return serially(async () => {
    const madeMeanwhile = readIfExists(path);
    if (madeMeanwhile) return madeMeanwhile;
    const source = derivedSource(projectId, key, root);
    if (!source) return undefined;
    const bytes = new Uint8Array(await makeDerived(source, kind));
    writeAtomically(path, bytes);
    return bytes;
  });
}

/**
 * A file the project's sites use: a variant (`<key>-<width>.webp`), or an icon or share file,
 * made on first use. Undefined for anything else: originals and other files are never served.
 */
export async function mediaFile(
  projectId: string,
  name: string,
  root = mediaRoot(),
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  return variantFile(projectId, name, root) ?? (await derivedFile(projectId, name, root));
}

/** The bytes of the given media files that exist, keyed by name (for preview and export). */
export async function mediaFiles(
  projectId: string,
  names: readonly string[],
  root = mediaRoot(),
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  for (const name of names) {
    const bytes = await mediaFile(projectId, name, root);
    if (bytes) files.set(name, bytes);
  }
  return files;
}

/**
 * Registers image files from before the library (media spec, "Media from before the
 * library"): each top-level file that is neither a variant nor a registered image becomes an
 * image under its own file name as key. The file itself stays where it is.
 */
export async function registerLegacyMedia(
  db: Db,
  projectId: string,
  root = mediaRoot(),
): Promise<string[]> {
  const folder = projectFolder(projectId, root);
  let names: string[];
  try {
    names = readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
  // Which files are generated variants follows from the library's records, not from file
  // names: an older file can itself be called `jak-pracujeme-0.webp` or `katerina-350.webp`.
  const generated = new Set(
    db
      .select({ key: media.key, width: media.width })
      .from(media)
      .where(eq(media.projectId, projectId))
      .all()
      .flatMap(({ key, width }) => imageVariants(width).map((w) => imageFile(key, w))),
  );
  const registered: string[] = [];
  for (const name of names) {
    if (!MEDIA_KEY.test(name) || generated.has(name) || name.includes(".tmp-")) continue;
    const known = db
      .select({ key: media.key })
      .from(media)
      .where(and(eq(media.projectId, projectId), eq(media.key, name)))
      .get();
    if (known) continue;
    const bytes = new Uint8Array(readFileSync(join(folder, name)));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const duplicate = db
      .select({ key: media.key })
      .from(media)
      .where(and(eq(media.projectId, projectId), eq(media.sha256, sha256)))
      .get();
    if (duplicate) continue;
    const inspected = await inspect(bytes);
    if (!inspected.ok) continue;
    await serially(() => storeImage(bytes, name, inspected.image, projectId, root));
    for (const w of imageVariants(inspected.image.width)) generated.add(imageFile(name, w));
    db.insert(media)
      .values({
        projectId,
        key: name,
        sha256,
        originalName: name,
        format: inspected.image.format,
        width: inspected.image.width,
        height: inspected.image.height,
        bytes: bytes.byteLength,
        createdAt: new Date(),
        createdBy: null,
      })
      .run();
    registered.push(name);
  }
  return registered;
}

/** Registers files from before the library in every project; returns `projectId: keys`. */
export async function registerAllLegacyMedia(
  db: Db,
  root = mediaRoot(),
): Promise<Map<string, string[]>> {
  const registered = new Map<string, string[]>();
  for (const { id } of db.select({ id: projects.id }).from(projects).all()) {
    const keys = await registerLegacyMedia(db, id, root);
    if (keys.length > 0) registered.set(id, keys);
  }
  return registered;
}

/** The `src` of every image node in a document, reachable or not (to be safe). */
function imageSources(document: unknown): string[] {
  const nodes = (document as { nodes?: Record<string, { type?: unknown; src?: unknown }> })?.nodes;
  return Object.values(nodes ?? {}).flatMap((node) =>
    node?.type === "image" && typeof node.src === "string" ? [node.src] : [],
  );
}

/**
 * Deletes the files and records of images removed from the library that no stored version
 * of any of their project's documents references (media design.md decision 8). Images still
 * in the library are never touched. With `dryRun`, only reports what it would delete.
 */
export function cleanupMedia(
  db: Db,
  options: { dryRun?: boolean; root?: string } = {},
): { projectId: string; key: string }[] {
  const root = options.root ?? mediaRoot();
  const removed = db.select().from(media).where(isNotNull(media.removedAt)).all();
  const referenced = new Map<string, Set<string>>();
  const referencedIn = (projectId: string): Set<string> => {
    let keys = referenced.get(projectId);
    if (!keys) {
      keys = new Set(
        db
          .select({ document: versions.document })
          .from(versions)
          .innerJoin(siteDocuments, eq(siteDocuments.id, versions.documentId))
          .where(eq(siteDocuments.projectId, projectId))
          .all()
          .flatMap((row) => imageSources(row.document)),
      );
      referenced.set(projectId, keys);
    }
    return keys;
  };

  const deleted: { projectId: string; key: string }[] = [];
  for (const row of removed) {
    if (referencedIn(row.projectId).has(row.key)) continue;
    deleted.push({ projectId: row.projectId, key: row.key });
    if (options.dryRun) continue;
    const folder = projectFolder(row.projectId, root);
    for (const width of imageVariants(row.width)) {
      rmSync(join(folder, imageFile(row.key, width)), { force: true });
    }
    for (const size of ICON_SIZES) rmSync(join(folder, iconFile(row.key, size)), { force: true });
    rmSync(join(folder, shareFile(row.key)), { force: true });
    rmSync(join(originalsFolder(row.projectId, root), `${row.key}.${EXTENSIONS[row.format]}`), {
      force: true,
    });
    db.delete(media)
      .where(and(eq(media.projectId, row.projectId), eq(media.key, row.key)))
      .run();
  }
  return deleted;
}
