import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { inCzech, thrownBy, useTestProject } from "$lib/server/test-project";
import { isForeignApiWrite } from "../../../hooks.server";
import { GET as getLibrary, POST as postMedia } from "./[project]/media/+server";
import { DELETE as deleteMedia, GET as getFile } from "./[project]/media/[name]/+server";
import { GET as getEditInfo, POST as postEdit } from "./[project]/media/[name]/edit/+server";

type LibraryEvent = Parameters<typeof postMedia>[0];
type FileEvent = Parameters<typeof getFile>[0];
type User = { id: string; email: string };

let name = "";
const project = useTestProject(() => ({ name }));
const base = () => `/api/projects/${project().projectId}/media`;

async function jpeg(width: number, height: number): Promise<Blob> {
  const bytes = await sharp({ create: { width, height, channels: 3, background: "#963" } })
    .jpeg()
    .toBuffer();
  return new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
}

// `null` means not signed in (`undefined` would pick the default, the owner).
function upload(file: Blob, fileName: string, user: User | null = project().owner) {
  const body = new FormData();
  body.set("file", file, fileName);
  return postMedia(
    project().event(base(), user ?? undefined, { method: "POST", body }) as unknown as LibraryEvent,
  );
}
const library = (user: User | null = project().owner) =>
  getLibrary(project().event(base(), user ?? undefined) as unknown as LibraryEvent);
function file(fileName: string, user: User | null = project().owner) {
  name = fileName;
  return getFile(
    project().event(`${base()}/${fileName}`, user ?? undefined) as unknown as FileEvent,
  );
}
function remove(key: string, user: User | null = project().owner) {
  name = key;
  return deleteMedia(
    project().event(`${base()}/${key}`, user ?? undefined, {
      method: "DELETE",
    }) as unknown as FileEvent,
  );
}

function editOf(key: string, edit: unknown, user: User | null = project().owner) {
  name = key;
  return postEdit(
    project().event(`${base()}/${key}/edit`, user ?? undefined, {
      method: "POST",
      body: JSON.stringify(edit),
      headers: { "content-type": "application/json" },
    }) as unknown as Parameters<typeof postEdit>[0],
  );
}
const square = { turn: 0, crop: { x: 300, y: 0, width: 900, height: 900 } };

describe("POST /api/projects/[project]/media", () => {
  it("refuses a file that isn't an image in the person's language", async () => {
    const body = new FormData();
    body.set("file", new Blob(["hello"], { type: "text/plain" }), "notes.txt");
    const event = project().event(base(), project().owner, { method: "POST", body });
    const response = await postMedia(inCzech(event) as unknown as LibraryEvent);
    expect(response.status).toBe(415);
    expect((await response.json()).message).toBe("Nahrát jde jen obrázky JPEG, PNG a WebP.");
  });

  it("asks a signed-out person to sign in, in their language", async () => {
    const event = project().event(base(), undefined);
    const thrown = (await thrownBy(() => getLibrary(inCzech(event) as unknown as LibraryEvent))) as
      | { status: number; body?: { message: string } }
      | undefined;
    expect(thrown?.status).toBe(401);
    expect(thrown?.body?.message).toBe("Nejdřív se přihlaste.");
  });

  it("answers 201 with the new image, and 200 for the same file again", async () => {
    const photo = await jpeg(1200, 900);
    const first = await upload(photo, "Chléb.jpg");
    expect(first.status).toBe(201);
    const created = await first.json();
    expect(created).toMatchObject({ width: 1200, height: 900, originalName: "Chléb.jpg" });
    expect(created.key).toMatch(/^chleb-[0-9a-f]{8}$/);

    const again = await upload(photo, "kopie.jpg");
    expect(again.status).toBe(200);
    expect((await again.json()).key).toBe(created.key);
  });

  it("answers 415 for files that aren't JPEG, PNG or WebP images", async () => {
    const response = await upload(new Blob(["%PDF-1.4"]), "menu.pdf");
    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      message: "Only JPEG, PNG and WebP images can be uploaded.",
    });
  });

  it("answers 413 for files over 20 MB", async () => {
    const response = await upload(new Blob([new Uint8Array(21 * 1024 * 1024)]), "velky.jpg");
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ message: "Images can be at most 20 MB." });
  });

  it("answers 400 without a file", async () => {
    const response = postMedia(
      project().event(base(), project().owner, {
        method: "POST",
        body: new FormData(),
      }) as unknown as LibraryEvent,
    );
    expect(await thrownBy(() => response)).toMatchObject({ status: 400 });
  });

  it("is only for members", async () => {
    const photo = await jpeg(10, 10);
    expect(await thrownBy(() => upload(photo, "a.jpg", null))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => upload(photo, "a.jpg", project().outsider))).toMatchObject({
      status: 404,
    });
  });
});

describe("GET /api/projects/[project]/media", () => {
  it("lists the library newest first", async () => {
    await upload(await jpeg(100, 100), "prvni.jpg");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await upload(await jpeg(100, 101), "druhy.jpg");
    const items = await (await library()).json();
    expect(items.map((i: { originalName: string }) => i.originalName)).toEqual([
      "druhy.jpg",
      "prvni.jpg",
      "hero.png",
    ]);
  });

  it("is only for members", async () => {
    expect(await thrownBy(() => library(null))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => library(project().outsider))).toMatchObject({ status: 404 });
  });
});

describe("GET /api/projects/[project]/media/[name]", () => {
  it("serves variant files to members as WebP", async () => {
    const response = await file("hero.png-320.webp");
    expect(response.headers.get("content-type")).toBe("image/webp");
  });

  it("serves icon and share files to members, and not to others", async () => {
    const created = await (await upload(await jpeg(600, 400), "logo.jpg")).json();
    const icon = await file(`${created.key}-icon-180.png`);
    expect(icon.headers.get("content-type")).toBe("image/png");
    expect(await sharp(new Uint8Array(await icon.arrayBuffer())).metadata()).toMatchObject({
      width: 180,
      height: 180,
    });
    const share = await file(`${created.key}-share.jpg`);
    expect(share.headers.get("content-type")).toBe("image/jpeg");
    expect(
      await thrownBy(() => file(`${created.key}-share.jpg`, project().outsider)),
    ).toMatchObject({ status: 404 });
    expect(await thrownBy(() => file(`${created.key}-icon-64.png`))).toMatchObject({
      status: 404,
    });
  });

  it("answers 404 for originals, legacy files, other names and other workspaces", async () => {
    const created = await (await upload(await jpeg(600, 400), "pult.jpg")).json();
    for (const bad of [
      "hero.png",
      `${created.key}.jpg`,
      `originals%2F${created.key}.jpg`,
      "../app.db",
      "missing-480.webp",
    ]) {
      expect(await thrownBy(() => file(bad)), bad).toMatchObject({ status: 404 });
    }
    expect(await thrownBy(() => file("hero.png-320.webp", project().outsider))).toMatchObject({
      status: 404,
    });
    expect(await thrownBy(() => file("hero.png-320.webp", null))).toMatchObject({ status: 401 });
  });
});

describe("DELETE /api/projects/[project]/media/[key]", () => {
  it("removes an image from the library but keeps its files", async () => {
    expect((await remove("hero.png")).status).toBe(204);
    expect(await (await library()).json()).toEqual([]);
    expect((await file("hero.png-320.webp")).status).toBe(200);
    expect(await thrownBy(() => remove("hero.png"))).toMatchObject({ status: 404 });
  });

  it("is only for members", async () => {
    expect(await thrownBy(() => remove("hero.png", project().outsider))).toMatchObject({
      status: 404,
    });
  });
});

describe("POST /api/projects/[project]/media/[key]/edit", () => {
  it("answers 201 with the crop and its source, and 200 for the same crop again", async () => {
    const created = await (await upload(await jpeg(1200, 900), "pult.jpg")).json();
    const first = await editOf(created.key, square);
    expect(first.status).toBe(201);
    const crop = await first.json();
    expect(crop).toMatchObject({
      width: 900,
      height: 900,
      originalName: "pult.jpg",
      source: { key: created.key, width: 1200, height: 900, ...square },
    });
    const again = await editOf(created.key, square);
    expect(again.status).toBe(200);
    expect((await again.json()).key).toBe(crop.key);
    const items = await (await library()).json();
    expect(items[0]).toMatchObject({ key: crop.key, source: { key: created.key } });
  });

  it("answers 400 with the reason, in the person's language", async () => {
    const created = await (await upload(await jpeg(1000, 800), "pult.jpg")).json();
    const outside = { turn: 0, crop: { x: 500, y: 0, width: 600, height: 400 } };
    const response = await editOf(created.key, outside);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "The crop must lie within the picture." });
    name = created.key;
    const event = project().event(`${base()}/${created.key}/edit`, project().owner, {
      method: "POST",
      body: JSON.stringify(outside),
    });
    const czech = await postEdit(inCzech(event) as unknown as Parameters<typeof postEdit>[0]);
    expect((await czech.json()).message).toBe("Výřez musí ležet uvnitř obrázku.");
    expect(await thrownBy(() => editOf(created.key, { turn: 0 }))).toMatchObject({ status: 400 });
  });

  it("answers 404 for an unknown image", async () => {
    const response = await editOf("nic-12345678", square);
    expect(response.status).toBe(404);
  });

  it("describes an image for the crop dialog: an edit with its source's size, even removed", async () => {
    const created = await (await upload(await jpeg(1200, 900), "pult.jpg")).json();
    const crop = await (await editOf(created.key, square)).json();
    await remove(created.key);
    await remove(crop.key);
    const info = (key: string, user: User | null = project().owner) => {
      name = key;
      return getEditInfo(
        project().event(`${base()}/${key}/edit`, user ?? undefined) as unknown as Parameters<
          typeof getEditInfo
        >[0],
      );
    };
    expect(await (await info(crop.key)).json()).toEqual({
      key: crop.key,
      width: 900,
      height: 900,
      originalName: "pult.jpg",
      source: { key: created.key, width: 1200, height: 900, ...square },
    });
    expect((await (await info(created.key)).json()).source).toBeUndefined();
    expect(await thrownBy(() => info("nic-12345678"))).toMatchObject({ status: 404 });
    expect(await thrownBy(() => info(crop.key, project().outsider))).toMatchObject({
      status: 404,
    });
  });

  it("is only for members, and refuses cross-site requests", async () => {
    expect(await thrownBy(() => editOf("hero.png", square, null))).toMatchObject({
      status: 401,
    });
    expect(await thrownBy(() => editOf("hero.png", square, project().outsider))).toMatchObject({
      status: 404,
    });
    const url = new URL(`https://admin.example.cz${base()}/hero.png/edit`);
    const foreign = new Request(url, {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(isForeignApiWrite(foreign, url)).toBe(true);
  });
});
