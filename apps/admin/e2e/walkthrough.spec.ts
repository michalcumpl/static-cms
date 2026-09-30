import { canvas, expect, openEditor, paths, storeVersion1Site, test } from "./fixtures";

/** File names in a ZIP archive, read from its central directory. */
function zipNames(bytes: Buffer): string[] {
  const names: string[] = [];
  for (let at = bytes.indexOf("PK\x01\x02", 0, "latin1"); at >= 0; ) {
    const length = bytes.readUInt16LE(at + 28);
    const extra = bytes.readUInt16LE(at + 30);
    const comment = bytes.readUInt16LE(at + 32);
    names.push(bytes.toString("utf8", at + 46, at + 46 + length));
    at = bytes.indexOf("PK\x01\x02", at + 46 + length + extra + comment, "latin1");
  }
  return names.sort();
}

test("a version-1 project: add, duplicate, set as home, delete, save, preview and ZIP", async ({
  page,
}) => {
  storeVersion1Site();
  await openEditor(page);
  const sidebar = page.getByRole("complementary", { name: "Pages" });
  const settings = page.getByRole("region", { name: "Page", exact: true });
  const toolbar = page.getByRole("toolbar", { name: "Editing" });

  // The upgraded document: the home page got a slug.
  await expect(settings.getByLabel("Address (slug)")).toHaveValue("uvod");

  await sidebar.getByRole("button", { name: "+ Page" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a page" });
  await dialog.getByLabel("Title").fill("Ceník");
  await dialog.getByRole("button", { name: "Add page" }).click();
  await expect(canvas(page).locator("h1")).toHaveText("Ceník");

  await settings.getByRole("button", { name: "Duplicate" }).click();
  await expect(canvas(page).locator("h1")).toHaveText("Ceník (copy)");
  await settings.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog", { name: "Delete “Ceník (copy)”?" })
    .getByRole("button", {
      name: "Delete page",
    })
    .click();
  await expect(canvas(page).locator(".hero h1")).toBeVisible();

  await sidebar.getByRole("link", { name: "Ceník" }).click();
  await settings.getByRole("button", { name: "Set as home" }).click();
  await toolbar.getByRole("button", { name: "Save" }).click();
  await expect(toolbar.getByRole("status")).toHaveText("Saved");

  const home = await page.request.get(paths().preview);
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain("<title>Pekárna U Lípy</title>");
  expect(await home.text()).toContain('<h1 class="page-title">Ceník</h1>');
  const intro = await page.request.get(`${paths().preview}uvod/`);
  expect(await intro.text()).toContain("<title>Úvod – Pekárna U Lípy</title>");

  await page.goto(paths().overview);
  // The ZIP is built in the browser: click only once the page's script has taken over.
  await page.waitForLoadState("networkidle");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP" }).click();
  const download = await downloading;
  const { readFileSync } = await import("node:fs");
  const names = zipNames(readFileSync((await download.path()) as string));
  expect(names).toEqual([
    "assets/images/hero.png-320.webp",
    "assets/style.css",
    "index.html",
    "kontakt/index.html",
    "sitemap.xml",
    "uvod/index.html",
  ]);
});
