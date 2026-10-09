// The media library on a store that isn't a folder (admin-on-aws design.md decision 2): every
// file goes through the store, so the S3 bucket behaves as the folder does. A memory store
// stands in for the bucket.
import { imageVariants } from "@webmio/model";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db/index";
import { users, workspaces } from "./db/schema";
import { demoSite } from "./demo";
import { newId } from "./ids";
import {
  cleanupMedia,
  derivedFile,
  editImage,
  mediaFile,
  mediaFiles,
  registerLegacyMedia,
  removeFromLibrary,
  uploadImage,
} from "./media";
import { memoryStore } from "./media-store";
import { deleteProject, purgeProject } from "./project-deletion";
import { createProject } from "./site-documents";

let db: Db;
let store: ReturnType<typeof memoryStore>;
let projectId = "";
let workspaceId = "";
let userId = "";

beforeEach(() => {
  db = openDatabase(":memory:");
  store = memoryStore();
  workspaceId = newId("w");
  userId = newId("u");
  db.insert(workspaces).values({ id: workspaceId, name: "Pekárna", createdAt: new Date() }).run();
  db.insert(users).values({ id: userId, email: "jana@example.cz", createdAt: new Date() }).run();
  projectId = createProject(db, workspaceId, "Pekárna", demoSite());
});

const photo = async (width: number, height: number, color = "#c08040") =>
  new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: color } })
      .jpeg()
      .toBuffer(),
  );

describe("the media library on a store", () => {
  it("keeps an upload's original and sizes in the store, before reporting it done", async () => {
    const result = await uploadImage(
      db,
      projectId,
      userId,
      { name: "Pec.jpg", bytes: await photo(1000, 600) },
      store,
    );
    if (!result.ok) throw new Error("upload failed");
    const key = result.media.key;
    expect(store.keys()).toEqual(
      [
        `${projectId}/originals/${key}.jpg`,
        ...imageVariants(1000).map((width) => `${projectId}/${key}-${width}.webp`),
      ].sort(),
    );
    expect(
      await mediaFile(projectId, `${key}-${imageVariants(1000)[0]}.webp`, store),
    ).toBeDefined();
    expect(await mediaFile(projectId, `originals/${key}.jpg`, store)).toBeUndefined();
  });

  it("makes share and icon files from the original and keeps them in the store", async () => {
    const result = await uploadImage(
      db,
      projectId,
      userId,
      { name: "Logo.jpg", bytes: await photo(800, 800) },
      store,
    );
    if (!result.ok) throw new Error("upload failed");
    const share = await derivedFile(projectId, `${result.media.key}-share.jpg`, store);
    expect(share).toBeDefined();
    expect(store.keys()).toContain(`${projectId}/${result.media.key}-share.jpg`);
    const files = await mediaFiles(
      projectId,
      [`${result.media.key}-icon-180.png`, "nope.webp"],
      store,
    );
    expect([...files.keys()]).toEqual([`${result.media.key}-icon-180.png`]);
  });

  it("crops from the original in the store", async () => {
    const result = await uploadImage(
      db,
      projectId,
      userId,
      { name: "Pec.jpg", bytes: await photo(1200, 800) },
      store,
    );
    if (!result.ok) throw new Error("upload failed");
    const crop = await editImage(
      db,
      projectId,
      userId,
      result.media.key,
      { turn: 0, crop: { x: 0, y: 0, width: 600, height: 400 } },
      store,
    );
    expect(crop).toMatchObject({ ok: true, created: true });
    if (!crop.ok) return;
    expect(await mediaFile(projectId, `${crop.media.key}-600.webp`, store)).toBeDefined();
  });

  it("registers images from before the library that are in the store", async () => {
    await store.write(
      `${projectId}/hero.png`,
      await sharp({ create: { width: 320, height: 180, channels: 3, background: "#336699" } })
        .png()
        .toBuffer(),
    );
    expect(await registerLegacyMedia(db, projectId, store)).toEqual(["hero.png"]);
    expect(await mediaFile(projectId, "hero.png-320.webp", store)).toBeDefined();
  });

  it("deletes a removed, unused image's files from the store", async () => {
    const result = await uploadImage(
      db,
      projectId,
      userId,
      { name: "Pryč.jpg", bytes: await photo(400, 300) },
      store,
    );
    if (!result.ok) throw new Error("upload failed");
    await derivedFile(projectId, `${result.media.key}-share.jpg`, store);
    removeFromLibrary(db, projectId, result.media.key);
    expect(await cleanupMedia(db, { root: store })).toEqual([{ projectId, key: result.media.key }]);
    expect(store.keys().filter((key) => key.includes(result.media.key))).toEqual([]);
  });

  it("removes a project's files with the project", async () => {
    await uploadImage(
      db,
      projectId,
      userId,
      { name: "Pec.jpg", bytes: await photo(400, 300) },
      store,
    );
    await deleteProject(db, projectId, userId);
    expect(await purgeProject(db, workspaceId, projectId, store)).toBe(true);
    expect(store.keys()).toEqual([]);
  });
});
