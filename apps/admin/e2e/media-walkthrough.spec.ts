import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import sharp from "sharp";
import { canvas, expect, openEditor, paths, test } from "./fixtures";

/** The files of a ZIP archive, read through its central directory. */
function unzip(archive: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (let at = archive.indexOf("PK\x01\x02", 0, "latin1"); at >= 0; ) {
    const method = archive.readUInt16LE(at + 10);
    const compressed = archive.readUInt32LE(at + 20);
    const nameLength = archive.readUInt16LE(at + 28);
    const extra = archive.readUInt16LE(at + 30);
    const comment = archive.readUInt16LE(at + 32);
    const local = archive.readUInt32LE(at + 42);
    const name = archive.toString("utf8", at + 46, at + 46 + nameLength);
    const dataStart =
      local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const data = archive.subarray(dataStart, dataStart + compressed);
    files.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data));
    at = archive.indexOf("PK\x01\x02", at + 46 + nameLength + extra + comment, "latin1");
  }
  return files;
}

test("a phone photo with GPS goes into the hero and is published without metadata", async ({
  page,
}) => {
  // Processing a 12-megapixel photo takes a few seconds on a CI runner.
  test.slow();
  const photo = await sharp({
    create: { width: 4032, height: 3024, channels: 3, background: "#a0662d" },
  })
    .jpeg({ quality: 90 })
    .withExif({
      IFD0: { Make: "Phone", Model: "Camera" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "50/1 1/1 30/1" },
    })
    .toBuffer();
  expect((await sharp(photo).metadata()).exif).toBeDefined();

  await openEditor(page);
  await canvas(page).locator(".hero img").click({ force: true });
  const panel = page.getByRole("region", { name: "Image" });
  await panel.getByRole("button", { name: "Replace…" }).click();
  const library = page.getByRole("dialog", { name: "Images" });
  await library
    .getByLabel("Choose files…")
    .setInputFiles({ name: "IMG_0042.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(library.getByRole("option", { name: /IMG_0042\.jpg/ })).toHaveAttribute(
    "aria-selected",
    "true",
    { timeout: 20_000 },
  );
  await library.getByRole("button", { name: "Use this image" }).click();
  await panel.getByLabel(/Description/).fill("Bochníky na pultu");
  const toolbar = page.getByRole("toolbar", { name: "Editing" });
  await toolbar.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar.getByRole("status")).toHaveText("Saved");

  const home = await (await page.request.get(paths().preview)).text();
  expect(home).toMatch(/srcset="[^"]*img-0042-[0-9a-f]{8}-2400\.webp 2400w"/);
  expect(home).toContain('width="4032" height="3024"');

  await page.goto(paths().publishPage);
  // The ZIP is built in the browser: click only once the page's script has taken over.
  await page.waitForLoadState("networkidle");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP" }).click();
  const files = unzip(readFileSync((await (await downloading).path()) as string));
  const images = [...files.keys()].filter((name) => name.startsWith("assets/images/")).sort();
  expect(images.map((name) => name.replace(/[0-9a-f]{8}/, "HASH"))).toEqual([
    "assets/images/img-0042-HASH-1600.webp",
    "assets/images/img-0042-HASH-2400.webp",
    "assets/images/img-0042-HASH-480.webp",
    "assets/images/img-0042-HASH-960.webp",
  ]);
  for (const name of images) {
    const bytes = files.get(name) as Buffer;
    const metadata = await sharp(bytes).metadata();
    expect(metadata.format, name).toBe("webp");
    expect(metadata.exif, name).toBeUndefined();
    expect(bytes.includes("GPS"), name).toBe(false);
  }
});
