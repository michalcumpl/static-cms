// Where media files live (admin-on-aws design.md decision 2): a folder in development and
// tests, an S3 bucket on the server. Keys are paths relative to the media root:
// `<projectId>/<name>` for variants and derived files, `<projectId>/originals/<name>` for
// originals.
import { randomBytes } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mediaRoot } from "./import-working-copy";

export interface MediaStore {
  /** A file's bytes; undefined when there is none. */
  read(key: string): Promise<Uint8Array<ArrayBuffer> | undefined>;
  /** A file's size in bytes, without reading it; undefined when there is none. */
  size(key: string): Promise<number | undefined>;
  /** Stores a file whole: readers see the old bytes or the new ones, never half. */
  write(key: string, bytes: Uint8Array): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
  /** The names of the files directly under `prefix` (which ends in `/`), not in subfolders. */
  list(prefix: string): Promise<string[]>;
  /** Removes every file whose key starts with `prefix`. */
  removePrefix(prefix: string): Promise<void>;
}

/** A key's parts, refusing anything that could leave the media root. */
function parts(key: string): string[] {
  const segments = key.split("/");
  if (segments.some((s) => s === "" || s === "." || s === ".." || s.includes("\\"))) {
    throw new Error(`Not a media key: ${key}`);
  }
  return segments;
}

/** Today's layout on disk, under `root`. */
export function folderStore(root: string): MediaStore {
  const path = (key: string) => join(root, ...parts(key));
  return {
    async read(key) {
      const target = path(key);
      try {
        return new Uint8Array(readFileSync(target));
      } catch {
        return undefined;
      }
    },
    async size(key) {
      const target = path(key);
      try {
        return statSync(target).size;
      } catch {
        return undefined;
      }
    },
    async write(key, bytes) {
      const target = path(key);
      mkdirSync(dirname(target), { recursive: true });
      const temporary = `${target}.tmp-${randomBytes(6).toString("hex")}`;
      writeFileSync(temporary, bytes);
      renameSync(temporary, target);
    },
    async remove(keys) {
      for (const key of keys) rmSync(path(key), { force: true });
    },
    async list(prefix) {
      try {
        return readdirSync(join(root, ...parts(prefix.replace(/\/$/, ""))), {
          withFileTypes: true,
        })
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name)
          .sort();
      } catch {
        return [];
      }
    },
    async removePrefix(prefix) {
      if (!prefix.endsWith("/")) throw new Error(`A media folder ends in "/": ${prefix}`);
      rmSync(join(root, ...parts(prefix.slice(0, -1))), { recursive: true, force: true });
    },
  };
}

const errorName = (error: unknown) => (error as { name?: string }).name;

/** The media bucket, with the same keys as the folder. */
export function s3Store(bucket: string, client = new S3Client({})): MediaStore {
  async function* keysUnder(prefix: string, delimiter?: string) {
    let token: string | undefined;
    do {
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
          ...(delimiter ? { Delimiter: delimiter } : {}),
        }),
      );
      for (const object of page.Contents ?? []) if (object.Key) yield object.Key;
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
  async function removeKeys(keys: readonly string[]) {
    for (let i = 0; i < keys.length; i += 1000) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }
  return {
    async read(key) {
      parts(key);
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return object.Body ? new Uint8Array(await object.Body.transformToByteArray()) : undefined;
      } catch (error) {
        if (errorName(error) === "NoSuchKey") return undefined;
        throw error;
      }
    },
    async size(key) {
      parts(key);
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return head.ContentLength;
      } catch (error) {
        if (errorName(error) === "NotFound" || errorName(error) === "NoSuchKey") return undefined;
        throw error;
      }
    },
    async write(key, bytes) {
      parts(key);
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes }));
    },
    async remove(keys) {
      for (const key of keys) parts(key);
      await removeKeys(keys);
    },
    async list(prefix) {
      const names: string[] = [];
      for await (const key of keysUnder(prefix, "/")) names.push(key.slice(prefix.length));
      return names.sort();
    },
    async removePrefix(prefix) {
      if (!prefix.endsWith("/")) throw new Error(`A media folder ends in "/": ${prefix}`);
      const keys: string[] = [];
      for await (const key of keysUnder(prefix)) keys.push(key);
      await removeKeys(keys);
    },
  };
}

/** Files in memory, for tests. */
export function memoryStore(): MediaStore & { keys(): string[] } {
  const files = new Map<string, Uint8Array<ArrayBuffer>>();
  return {
    async read(key) {
      parts(key);
      const bytes = files.get(key);
      return bytes ? new Uint8Array(bytes) : undefined;
    },
    async size(key) {
      parts(key);
      return files.get(key)?.byteLength;
    },
    async write(key, bytes) {
      parts(key);
      files.set(key, new Uint8Array(bytes));
    },
    async remove(keys) {
      for (const key of keys) files.delete(key);
    },
    async list(prefix) {
      return [...files.keys()]
        .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
        .map((key) => key.slice(prefix.length))
        .sort();
    },
    async removePrefix(prefix) {
      for (const key of [...files.keys()]) if (key.startsWith(prefix)) files.delete(key);
    },
    keys: () => [...files.keys()].sort(),
  };
}

let configured: MediaStore | undefined;
let configuredFor: string | undefined;

/** The server's media store: the bucket `MEDIA_BUCKET` names, else the media folder. */
export function mediaStore(env: Record<string, string | undefined> = process.env): MediaStore {
  const where = env.MEDIA_BUCKET ? `s3:${env.MEDIA_BUCKET}` : `folder:${mediaRoot()}`;
  if (configured && configuredFor === where) return configured;
  configured = env.MEDIA_BUCKET ? s3Store(env.MEDIA_BUCKET) : folderStore(mediaRoot());
  configuredFor = where;
  return configured;
}

/** A store, or a media folder given by its path (tests and older callers). */
export function asStore(store: MediaStore | string | undefined): MediaStore {
  if (store === undefined) return mediaStore();
  return typeof store === "string" ? folderStore(store) : store;
}
