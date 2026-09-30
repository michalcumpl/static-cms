import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { canvas, expect, openEditor, paths, test } from "./fixtures";

const photo = () => readFileSync(new URL("media/photo.heic", import.meta.url));
const large = () => readFileSync(new URL("media/large.heic", import.meta.url));
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const uploads = (page: Page) => library(page).getByRole("list", { name: "Uploads" });

type Item = { key: string; originalName: string; width: number; height: number };
async function libraryItem(page: Page, name: string): Promise<Item | undefined> {
  const items: Item[] = await (await page.request.get(paths().library)).json();
  return items.find((item) => item.originalName === name);
}

async function openLibrary(page: Page) {
  await openEditor(page);
  await canvas(page).locator(".hero img").click({ force: true });
  await page
    .getByRole("region", { name: "Image" })
    .getByRole("button", { name: "Replace…" })
    .click();
  await expect(library(page)).toBeVisible();
}

test("the picker offers HEIC and HEIF files", async ({ page }) => {
  await openLibrary(page);
  const accept = await library(page).getByLabel("Choose files…").getAttribute("accept");
  expect(accept?.split(",")).toEqual(
    expect.arrayContaining([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      ".heic",
      ".heif",
    ]),
  );
});

test("a chosen HEIC photo is converted to JPEG and uploaded", async ({ page }) => {
  await openLibrary(page);
  await library(page)
    .getByLabel("Choose files…")
    .setInputFiles({ name: "IMG_5420.HEIC", mimeType: "image/heic", buffer: photo() });
  await expect(uploads(page)).toContainText("IMG_5420.jpg");
  await expect(uploads(page)).toContainText("Uploaded", { timeout: 20_000 });
  await expect(library(page).getByRole("option", { name: /IMG_5420\.jpg/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const item = await libraryItem(page, "IMG_5420.jpg");
  expect(item).toMatchObject({ width: 4032, height: 3024 });
  expect(item?.key).toMatch(/^img-5420-[0-9a-f]{8}$/);
});

test("a dropped HEIC photo is converted like a chosen one", async ({ page }) => {
  await openLibrary(page);
  const data = [...photo()];
  const dataTransfer = await page.evaluateHandle((bytes) => {
    const transfer = new DataTransfer();
    // No type, as some systems send it: recognised by name and content.
    transfer.items.add(new File([new Uint8Array(bytes)], "Dort.heic"));
    return transfer;
  }, data);
  await library(page)
    .getByRole("region", { name: "Images" })
    .dispatchEvent("drop", { dataTransfer });
  await expect(uploads(page)).toContainText("Dort.jpg");
  await expect(uploads(page)).toContainText("Uploaded", { timeout: 20_000 });
  // The same photo may already be in the library under an earlier name (one image per content).
  const selected = library(page).getByRole("option", { selected: true });
  await expect(selected).toHaveCount(1);
});

test("a very large HEIC photo is scaled to 4096 px", async ({ page }) => {
  await openLibrary(page);
  await library(page)
    .getByLabel("Choose files…")
    .setInputFiles({ name: "velka.heic", mimeType: "image/heic", buffer: large() });
  await expect(uploads(page)).toContainText("Uploaded", { timeout: 20_000 });
  expect(await libraryItem(page, "velka.jpg")).toMatchObject({ width: 4096, height: 3072 });
});

test("an unreadable HEIC file is reported and nothing is uploaded", async ({ page }) => {
  await openLibrary(page);
  const before: Item[] = await (await page.request.get(paths().library)).json();
  await library(page)
    .getByLabel("Choose files…")
    .setInputFiles({
      name: "photo.heic",
      mimeType: "image/heic",
      buffer: Buffer.from("not an image"),
    });
  await expect(uploads(page).getByRole("alert")).toHaveText(
    "This photo couldn't be converted. Export it as JPEG and try again.",
  );
  const after: Item[] = await (await page.request.get(paths().library)).json();
  expect(after).toEqual(before);
});
