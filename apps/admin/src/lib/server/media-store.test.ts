// What every media store must do: the folder, memory, and (with MEDIA_S3_CONTRACT=1 and
// MEDIA_BUCKET) the S3 bucket.
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { newId } from "./ids";
import { folderStore, type MediaStore, memoryStore, s3Store } from "./media-store";

const folders: string[] = [];
afterAll(() => {
  for (const folder of folders) rmSync(folder, { recursive: true, force: true });
});

const encode = (text: string) => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array | undefined) =>
  bytes === undefined ? undefined : new TextDecoder().decode(bytes);

function contract(name: string, make: () => MediaStore) {
  describe(`${name} media store`, () => {
    const store = make();
    const project = newId("p");
    afterAll(() => store.removePrefix(`${project}/`));

    it("writes, reads, lists files directly under a folder, and removes them", async () => {
      await store.write(`${project}/a-320.webp`, encode("a"));
      await store.write(`${project}/b-320.webp`, encode("b"));
      await store.write(`${project}/originals/a.jpg`, encode("original"));
      expect(decode(await store.read(`${project}/a-320.webp`))).toBe("a");
      expect(decode(await store.read(`${project}/originals/a.jpg`))).toBe("original");
      expect(await store.read(`${project}/missing.webp`)).toBeUndefined();
      expect(await store.list(`${project}/`)).toEqual(["a-320.webp", "b-320.webp"]);
      expect(await store.list(`${project}/originals/`)).toEqual(["a.jpg"]);
      expect(await store.list(`${newId("p")}/`)).toEqual([]);
      await store.remove([`${project}/a-320.webp`, `${project}/never-there.webp`]);
      expect(await store.list(`${project}/`)).toEqual(["b-320.webp"]);
    });

    it("tells a file's size without reading it", async () => {
      await store.write(`${project}/d.webp`, encode("12345"));
      expect(await store.size(`${project}/d.webp`)).toBe(5);
      expect(await store.size(`${project}/missing.webp`)).toBeUndefined();
    });

    it("replaces a file whole", async () => {
      await store.write(`${project}/c.png`, encode("first"));
      await store.write(`${project}/c.png`, encode("second"));
      expect(decode(await store.read(`${project}/c.png`))).toBe("second");
    });

    it("removes a project's folder with everything in it", async () => {
      const other = newId("p");
      await store.write(`${other}/x.webp`, encode("x"));
      await store.write(`${other}/originals/x.png`, encode("y"));
      await store.removePrefix(`${other}/`);
      expect(await store.read(`${other}/x.webp`)).toBeUndefined();
      expect(await store.read(`${other}/originals/x.png`)).toBeUndefined();
    });

    it("refuses keys that would leave the media root", async () => {
      await expect(store.read("../etc/passwd")).rejects.toThrow("Not a media key");
      await expect(store.write(`${project}/../x`, encode("x"))).rejects.toThrow();
    });
  });
}

contract("folder", () => {
  const folder = mkdtempSync(join(tmpdir(), "media-store-"));
  folders.push(folder);
  return folderStore(folder);
});
contract("memory", () => memoryStore());
if (process.env.MEDIA_S3_CONTRACT === "1" && process.env.MEDIA_BUCKET) {
  const bucket = process.env.MEDIA_BUCKET;
  contract("S3", () => s3Store(bucket));
}

describe("folder store", () => {
  it("keeps today's layout on disk and leaves no temporary files", async () => {
    const folder = mkdtempSync(join(tmpdir(), "media-store-"));
    folders.push(folder);
    const store = folderStore(folder);
    await store.write("p_1/originals/hero.jpg", encode("x"));
    expect(existsSync(join(folder, "p_1", "originals", "hero.jpg"))).toBe(true);
    expect(await store.list("p_1/originals/")).toEqual(["hero.jpg"]);
  });
});
