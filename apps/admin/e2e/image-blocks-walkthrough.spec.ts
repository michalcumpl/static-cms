import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  addBlockAfterCaret,
  canvas,
  expect,
  openEditor,
  paths,
  selectText,
  test,
} from "./fixtures";

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const imagePanel = (page: Page) => page.getByRole("region", { name: "Image" });

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

async function insertBlock(page: Page, label: string) {
  await canvas(page)
    .locator(".page-blocks > [data-type=node]")
    .last()
    .locator("h2, p")
    .first()
    .click();
  await page.keyboard.press("End");
  await addBlockAfterCaret(page, label);
}

async function pickFromLibrary(page: Page, button: string) {
  await canvas(page).getByRole("button", { name: button }).last().click();
  await library(page)
    .getByRole("option", { name: /hero\.png/ })
    .click();
  await library(page)
    .getByRole("button", { name: /^(Use this image|Add 1 image)$/ })
    .click();
  await expect(library(page)).toBeHidden();
}

test("all four image blocks on a page: fill, describe, save, preview and ZIP", async ({ page }) => {
  test.slow();
  await openEditor(page, paths().edit("page_contact"));

  await insertBlock(page, "Text with image");
  await pickFromLibrary(page, "Add image…");
  await imagePanel(page)
    .getByLabel(/Description/)
    .fill("Dárkový poukaz");

  await insertBlock(page, "Gallery");
  await pickFromLibrary(page, "Add photos…");
  await canvas(page).locator(".gallery-item img").click({ force: true });
  await imagePanel(page)
    .getByLabel(/Description/)
    .fill("Děti malují");

  await insertBlock(page, "Team");
  await pickFromLibrary(page, "Add people…");
  const name = canvas(page).locator(".person-name").last();
  await selectText(page, name, "Jméno");
  await page.keyboard.type("Kateřina");
  await expect(name).toHaveText("Kateřina");

  await insertBlock(page, "Partner logos");
  await pickFromLibrary(page, "Add logos…");

  const problems = page.getByRole("region", { name: "Problems" });
  await expect(problems).toContainText("No problems");
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status")).toHaveText("Saved");

  const html = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  for (const cls of ["text-with-image image-right", "gallery", "team", "logos"]) {
    expect(html, cls).toContain(`<section class="block ${cls}">`);
  }
  expect(html).toContain('alt="Dárkový poukaz"');
  expect(html).toMatch(
    /<a href="[^"]*assets\/images\/hero\.png-320\.webp"><img [^>]*alt="Děti malují"/,
  );
  expect(html).toContain('<h3 class="person-name">Kateřina</h3>');
  expect(html).toMatch(/<li><img [^>]*alt="hero"/);

  await page.goto(paths().publishPage);
  await page.waitForLoadState("networkidle");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP" }).click();
  const names = zipNames(readFileSync((await (await downloading).path()) as string));
  expect(names.filter((n) => n.startsWith("assets/images/"))).toEqual([
    "assets/images/hero.png-320.webp",
  ]);
});
