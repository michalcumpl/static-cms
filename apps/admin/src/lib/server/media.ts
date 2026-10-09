// A project's images (media design.md decisions 1–3): upload and processing with sharp,
// the library, and reading the published variant files and the icon and share files made
// from them.

import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  ICON_SIZES,
  type IconSize,
  iconFile,
  imageFile,
  imageVariants,
  shareFile,
  slugify,
} from "@webmio/model";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import sharp, { type Metadata, type Sharp } from "sharp";
import { type Said, said } from "$lib/i18n";
import { editProblem, type ImageEdit, isIdentity, turnedSize } from "$lib/image-edit";
import type { Db } from "./db/index";
import { media, projects, siteDocuments, versions } from "./db/schema";
import { mediaRoot } from "./import-working-copy";
import { asStore, type MediaStore } from "./media-store";

/** Where media lives: a store, or a media folder by its path (tests); the server's by default. */
export type MediaPlace = MediaStore | string | undefined;

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
  /** For an image made by editing another: that image, its size, and the edit relative to it. */
  source?: { key: string; width: number; height: number } & ImageEdit;
}

export type UploadResult =
  | { ok: true; created: boolean; media: MediaItem }
  | { ok: false; status: 413 | 415; message: Said };

/** A project's media folder on disk, for the folder store (development and tests). */
export function projectFolder(projectId: string, root = mediaRoot()): string {
  return join(root, projectId);
}

/** A project's file next to its variants: `<projectId>/<name>`. */
const fileKey = (projectId: string, name: string) => `${projectId}/${name}`;
/** A project's metadata-free original, which is never served: `<projectId>/originals/<name>`. */
const originalKey = (projectId: string, name: string) => `${projectId}/originals/${name}`;

// Uploads are processed one at a time, in arrival order.
let queue: Promise<unknown> = Promise.resolve();
function serially<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

type MediaRow = typeof media.$inferSelect;

/** A row as a library item; an edited image's source row gives the source's size. */
function toItem(row: MediaRow, source?: Pick<MediaRow, "width" | "height">): MediaItem {
  const { key, originalName, width, height, createdAt, sourceKey, edit } = row;
  const item: MediaItem = { key, originalName, width, height, createdAt };
  if (sourceKey && edit && source) {
    item.source = { key: sourceKey, width: source.width, height: source.height, ...edit };
  }
  return item;
}

interface Inspected {
  format: Format;
  width: number;
  height: number;
}

/**
 * Reads an image's header: its format and upright size, or why it can't be used. The importer
 * checks fetched images with it before uploading them (site-import).
 */
export async function inspect(
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

/** Encodes an image as an original: in its own format, without metadata. */
function encodeOriginal(image: Sharp, format: Format): Promise<Buffer> {
  return format === "jpeg"
    ? image.jpeg({ quality: ORIGINAL_QUALITY }).toBuffer()
    : format === "png"
      ? image.png().toBuffer()
      : image.webp({ quality: ORIGINAL_QUALITY }).toBuffer();
}

/**
 * Stores a decoded image as a metadata-free original and its WebP variants. `rotate()` applies
 * the EXIF orientation to the pixels; sharp's output then carries no metadata at all (EXIF,
 * GPS, XMP, IPTC) and is converted to sRGB. With `asOriginal`, the bytes are already an
 * original (an edit's) and are stored as they are.
 */
async function storeImage(
  bytes: Uint8Array,
  key: string,
  image: Inspected,
  projectId: string,
  store: MediaStore,
  asOriginal = false,
): Promise<void> {
  const upright = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate();
  const original = asOriginal ? bytes : await encodeOriginal(upright.clone(), image.format);
  await store.write(originalKey(projectId, `${key}.${EXTENSIONS[image.format]}`), original);

  for (const width of imageVariants(image.width)) {
    const variant = await upright
      .clone()
      .resize({ width })
      .webp({ quality: VARIANT_QUALITY })
      .toBuffer();
    await store.write(fileKey(projectId, imageFile(key, width)), variant);
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
  root?: MediaPlace,
): Promise<UploadResult> {
  const store = asStore(root);
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
    if (existing) return { ok: true, created: false, media: restored(db, existing) };

    const inspected = await inspect(bytes);
    if (!inspected.ok) return inspected;
    const { image } = inspected;
    const key = newKey(db, projectId, name, sha256);
    await storeImage(bytes, key, image, projectId, store);
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
    return {
      ok: true,
      created: true,
      media: toItem({ ...row, removedAt: null, sourceKey: null, edit: null }),
    };
  });
}

export type EditResult =
  | { ok: true; created: boolean; media: MediaItem }
  | { ok: false; status: 400 | 404; message: Said };

const EDIT_PROBLEMS = {
  invalid: "server.media.editInvalid",
  outside: "server.media.cropOutside",
  tooSmall: "server.media.cropTooSmall",
} as const;

function mediaRow(db: Db, projectId: string, key: string) {
  return db
    .select()
    .from(media)
    .where(and(eq(media.projectId, projectId), eq(media.key, key)))
    .get();
}

/** Returns a row as a library item, bringing it back into the library if it was removed. */
function restored(db: Db, row: MediaRow): MediaItem {
  if (row.removedAt) {
    db.update(media)
      .set({ removedAt: null })
      .where(and(eq(media.projectId, row.projectId), eq(media.key, row.key)))
      .run();
  }
  return mediaItem(db, row.projectId, row.key) as MediaItem;
}

/**
 * Makes a new image from a library image by turning it and cutting it (image-cropping design
 * decision 1). An edited image is edited from its source, so the edit is relative to the
 * source, and an image is never cut from a cut. The result is stored like an upload; an edit
 * the library already holds returns that image, and an edit that changes nothing the source.
 */
export function editImage(
  db: Db,
  projectId: string,
  userId: string | null,
  key: string,
  edit: ImageEdit,
  root?: MediaPlace,
): Promise<EditResult> {
  const store = asStore(root);
  return serially(async (): Promise<EditResult> => {
    const row = mediaRow(db, projectId, key);
    if (!row) return { ok: false, status: 404, message: said("server.media.noSuchImage") };
    const source = row.sourceKey ? mediaRow(db, projectId, row.sourceKey) : row;
    if (!source) return { ok: false, status: 404, message: said("server.media.noSource") };

    const problem = editProblem(edit, source.width, source.height);
    if (problem) return { ok: false, status: 400, message: said(EDIT_PROBLEMS[problem]) };
    if (isIdentity(edit, source.width, source.height)) {
      return { ok: true, created: false, media: restored(db, source) };
    }
    const bytes = await derivedSource(projectId, source.key, store);
    if (!bytes) return { ok: false, status: 404, message: said("server.media.noSource") };

    // Without an original the largest variant stands in, which may be smaller than the image.
    const decoded = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "error" });
    const { width = source.width } = await decoded.metadata();
    const scale = width / source.width;
    const [turnedWidth, turnedHeight] = turnedSize(
      Math.round(source.width * scale),
      Math.round(source.height * scale),
      edit.turn,
    );
    const left = Math.min(Math.round(edit.crop.x * scale), turnedWidth - 1);
    const top = Math.min(Math.round(edit.crop.y * scale), turnedHeight - 1);
    const region = {
      left,
      top,
      width: Math.max(1, Math.min(Math.round(edit.crop.width * scale), turnedWidth - left)),
      height: Math.max(1, Math.min(Math.round(edit.crop.height * scale), turnedHeight - top)),
    };
    const encoded = await encodeOriginal(decoded.rotate(edit.turn).extract(region), source.format);
    const sha256 = createHash("sha256").update(encoded).digest("hex");
    const existing = db
      .select()
      .from(media)
      .where(and(eq(media.projectId, projectId), eq(media.sha256, sha256)))
      .get();
    if (existing) return { ok: true, created: false, media: restored(db, existing) };

    const newRow = {
      projectId,
      key: newKey(db, projectId, source.originalName, sha256),
      sha256,
      originalName: source.originalName,
      format: source.format,
      width: region.width,
      height: region.height,
      bytes: encoded.byteLength,
      createdAt: new Date(),
      createdBy: userId,
      sourceKey: source.key,
      edit,
    };
    const image = { format: source.format, width: region.width, height: region.height };
    await storeImage(encoded, newRow.key, image, projectId, store, true);
    // Files first, row last, as for uploads.
    db.insert(media).values(newRow).run();
    return { ok: true, created: true, media: toItem({ ...newRow, removedAt: null }, source) };
  });
}

/** A project's library: images not removed from it, newest first. */
export function listLibrary(db: Db, projectId: string): MediaItem[] {
  const rows = db
    .select()
    .from(media)
    .where(eq(media.projectId, projectId))
    .orderBy(desc(media.createdAt), desc(media.key))
    .all();
  // Sources may have been removed from the library; their sizes are still needed.
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return rows
    .filter((row) => !row.removedAt)
    .map((row) => toItem(row, row.sourceKey ? byKey.get(row.sourceKey) : undefined));
}

/** One image of a project, removed from the library or not, or undefined when unknown. */
export function mediaItem(db: Db, projectId: string, key: string): MediaItem | undefined {
  const row = mediaRow(db, projectId, key);
  if (!row) return undefined;
  return toItem(row, row.sourceKey ? mediaRow(db, projectId, row.sourceKey) : undefined);
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
async function variantFile(
  projectId: string,
  name: string,
  store: MediaStore,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (!VARIANT_FILE.test(name)) return undefined;
  return store.read(fileKey(projectId, name));
}

/**
 * The image a derived file is made from (seo-and-metadata design.md decision 3): its
 * metadata-free original, else the largest of its variants (images used before the library).
 */
async function derivedSource(
  projectId: string,
  key: string,
  store: MediaStore,
): Promise<Uint8Array | undefined> {
  for (const extension of Object.values(EXTENSIONS)) {
    const original = await store.read(originalKey(projectId, `${key}.${extension}`));
    if (original) return original;
  }
  const widths = (await store.list(`${projectId}/`)).flatMap((name) => {
    const match = VARIANT_FILE.exec(name);
    return match?.[1] === key ? [Number(match[2])] : [];
  });
  if (widths.length === 0) return undefined;
  return variantFile(projectId, imageFile(key, Math.max(...widths)), store);
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
  root?: MediaPlace,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const store = asStore(root);
  const match = DERIVED_FILE.exec(name);
  const key = match?.[1];
  if (!match || key === undefined) return undefined;
  const kept = await store.read(fileKey(projectId, name));
  if (kept) return kept;
  const kind: DerivedKind = match[2] === undefined ? "share" : (Number(match[2]) as IconSize);
  return serially(async () => {
    const madeMeanwhile = await store.read(fileKey(projectId, name));
    if (madeMeanwhile) return madeMeanwhile;
    const source = await derivedSource(projectId, key, store);
    if (!source) return undefined;
    const bytes = new Uint8Array(await makeDerived(source, kind));
    await store.write(fileKey(projectId, name), bytes);
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
  root?: MediaPlace,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const store = asStore(root);
  // Only names of a project's own files, never a path into another folder.
  if (name.includes("/") || name.includes("\\") || name.startsWith(".")) return undefined;
  return (await variantFile(projectId, name, store)) ?? (await derivedFile(projectId, name, store));
}

/** The bytes of the given media files that exist, keyed by name (for preview and export). */
export async function mediaFiles(
  projectId: string,
  names: readonly string[],
  root?: MediaPlace,
): Promise<Map<string, Uint8Array>> {
  const store = asStore(root);
  const files = new Map<string, Uint8Array>();
  for (const name of names) {
    const bytes = await mediaFile(projectId, name, store);
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
  root?: MediaPlace,
): Promise<string[]> {
  const store = asStore(root);
  const names = await store.list(`${projectId}/`);
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
    const bytes = await store.read(fileKey(projectId, name));
    if (!bytes) continue;
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const duplicate = db
      .select({ key: media.key })
      .from(media)
      .where(and(eq(media.projectId, projectId), eq(media.sha256, sha256)))
      .get();
    if (duplicate) continue;
    const inspected = await inspect(bytes);
    if (!inspected.ok) continue;
    await serially(() => storeImage(bytes, name, inspected.image, projectId, store));
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
  root?: MediaPlace,
): Promise<Map<string, string[]>> {
  const store = asStore(root);
  const registered = new Map<string, string[]>();
  for (const { id } of db.select({ id: projects.id }).from(projects).all()) {
    const keys = await registerLegacyMedia(db, id, store);
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
 * of any of their project's documents references (media design.md decision 8), unless an
 * image it keeps was made by editing them (image-cropping design decision 6). Images still
 * in the library are never touched. With `dryRun`, only reports what it would delete.
 */
export async function cleanupMedia(
  db: Db,
  options: { dryRun?: boolean; root?: MediaPlace } = {},
): Promise<{ projectId: string; key: string }[]> {
  const store = asStore(options.root);
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

  const id = (row: { projectId: string; key: string }) => `${row.projectId}/${row.key}`;
  const doomed = new Map(
    removed.filter((row) => !referencedIn(row.projectId).has(row.key)).map((r) => [id(r), r]),
  );
  // An image's source stays while the image does, so it can be edited again.
  const edited = db.select().from(media).where(isNotNull(media.sourceKey)).all();
  for (let changed = true; changed; ) {
    changed = false;
    for (const row of edited) {
      const source = `${row.projectId}/${row.sourceKey}`;
      if (!doomed.has(id(row)) && doomed.delete(source)) changed = true;
    }
  }

  const deleted: { projectId: string; key: string }[] = [];
  for (const row of doomed.values()) {
    deleted.push({ projectId: row.projectId, key: row.key });
    if (options.dryRun) continue;
    const files = (name: string) => fileKey(row.projectId, name);
    await store.remove([
      ...imageVariants(row.width).map((width) => files(imageFile(row.key, width))),
      ...ICON_SIZES.map((size) => files(iconFile(row.key, size))),
      files(shareFile(row.key)),
      originalKey(row.projectId, `${row.key}.${EXTENSIONS[row.format]}`),
    ]);
    db.delete(media)
      .where(and(eq(media.projectId, row.projectId), eq(media.key, row.key)))
      .run();
  }
  return deleted;
}
