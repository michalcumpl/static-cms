import type { Page } from "@playwright/test";
import sharp from "sharp";
import {
  addBlockAfterCaret,
  canvas,
  expect,
  openEditor,
  paths,
  storeImageBlocksSite,
  test,
} from "./fixtures";

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const imagePanel = (page: Page) => page.getByRole("region", { name: "Image" });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const galerie = () => paths().edit("page_gallery");

async function jpeg(color: string): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

/**
 * Selects an item as a whole: click into it, then Escape turns the caret into a selection of
 * the item. Waits until the editor has taken the selection (the move button comes alive).
 */
/**
 * Selects an item as a whole: the caret into `inside`, then Escape, until the toolbar names the
 * item. An Escape that beats the click would select the previous selection's block instead.
 */
async function selectItem(page: Page, inside: ReturnType<Page["locator"]>, label: string) {
  const status = toolbar(page).locator(".selection-label");
  await expect(async () => {
    await inside.click();
    await expect(status).toHaveText("", { timeout: 1000 });
    await page.keyboard.press("Escape");
    await expect(status).toHaveText(`${label} selected`, { timeout: 1000 });
  }).toPass();
}

/** Puts the caret at the end of the last block, so inserted blocks go after it. */
async function caretInLastBlock(page: Page) {
  await canvas(page).locator(".rich-text p").last().click();
  await page.keyboard.press("End");
}

test.describe("inserting image blocks", () => {
  for (const [label, cls] of [
    ["Text with image", ".text-with-image"],
    ["Gallery", ".gallery"],
    ["Team", ".team"],
    ["Partner logos", ".logos"],
  ] as const) {
    test(`insert a ${label} block`, async ({ page }) => {
      await openEditor(page, paths().edit("page_contact"));
      await caretInLastBlock(page);
      await addBlockAfterCaret(page, label);
      const block = canvas(page).locator(cls);
      await expect(block).toHaveCount(1);
      await expect(block.locator("h2")).toHaveText("Nadpis");
      if (cls === ".text-with-image") {
        await expect(block.getByRole("button", { name: "Add image…" })).toBeVisible();
      } else {
        await expect(
          block.getByRole("button", { name: /^Add (photos|people|logos)…$/ }),
        ).toBeVisible();
      }
    });
  }
});

test.describe("images in blocks", () => {
  test.beforeEach(() => storeImageBlocksSite());

  test("put the image of a text with image block on the left and back", async ({ page }) => {
    await openEditor(page, galerie());
    const block = canvas(page).locator(".text-with-image");
    await expect(block).toHaveClass(/image-left/);
    await block.locator("img").click({ force: true });
    await imagePanel(page).getByLabel("Right of the text").check();
    await expect(block).toHaveClass(/image-right/);
    await imagePanel(page).getByLabel("Left of the text").check();
    await expect(block).toHaveClass(/image-left/);
  });

  test("a logo is described by its name and can be linked, unlinked and undone", async ({
    page,
  }) => {
    await openEditor(page, galerie());
    await canvas(page).locator(".logo-item").first().locator("img").click({ force: true });
    await expect(imagePanel(page)).toContainText("Described by its name: Nadace Harmonie");
    await expect(imagePanel(page).getByLabel(/Description/)).toHaveCount(0);

    await imagePanel(page).getByLabel("An address").check();
    const address = imagePanel(page).getByRole("textbox", { name: "Address", exact: true });
    await address.fill("javascript:alert(1)");
    await address.press("Enter");
    await expect(imagePanel(page).getByRole("alert")).toContainText("isn't allowed");

    await address.fill("https://nadace-harmonie.example");
    await address.press("Enter");
    await expect(imagePanel(page).getByRole("alert")).toHaveCount(0);
    await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
    await expect(toolbar(page).getByRole("status")).toHaveText("Saved");
    const html = await (await page.request.get(`${paths().preview}galerie/`)).text();
    expect(html).toContain('<a href="https://nadace-harmonie.example"><img');

    await toolbar(page).getByRole("button", { name: "Undo" }).click();
    await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
    await expect(toolbar(page).getByRole("status")).toHaveText("Saved");
    const reverted = await (await page.request.get(`${paths().preview}galerie/`)).text();
    expect(reverted).toContain('<a href="https://harmonie.example"><img');
  });

  test("gallery photos and logos can be replaced but not removed; portraits can", async ({
    page,
  }) => {
    await openEditor(page, galerie());
    await canvas(page).locator(".gallery-item").first().locator("img").click({ force: true });
    await expect(imagePanel(page).getByRole("button", { name: "Replace…" })).toBeVisible();
    await expect(imagePanel(page).getByRole("button", { name: "Remove" })).toHaveCount(0);
    await canvas(page).locator(".person img").click({ force: true });
    await expect(imagePanel(page).getByRole("button", { name: "Remove" })).toBeVisible();
    await expect(imagePanel(page).getByLabel(/Decorative/)).toBeChecked();
  });
});

test.describe("adding and arranging items", () => {
  test.beforeEach(() => storeImageBlocksSite());

  test("add three photos to a gallery at once, and one undo removes them", async ({ page }) => {
    await openEditor(page, galerie());
    const items = canvas(page).locator(".gallery-item");
    await expect(items).toHaveCount(3);
    await canvas(page).getByRole("button", { name: "Add photos…" }).click();
    await expect(library(page)).toBeVisible();
    for (const [name, color] of [
      ["prvni.jpg", "#a33"],
      ["druha.jpg", "#3a3"],
      ["treti.jpg", "#33a"],
    ] as const) {
      await library(page)
        .getByLabel("Choose files…")
        .setInputFiles({ name, mimeType: "image/jpeg", buffer: await jpeg(color) });
      await expect(library(page).getByRole("option", { name })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }
    await library(page).getByRole("button", { name: "Add 3 images" }).click();
    await expect(items).toHaveCount(6);
    await expect(items.nth(3).locator("img")).toHaveAttribute("src", /prvni-/);
    await expect(items.nth(5).locator("img")).toHaveAttribute("src", /treti-/);
    await toolbar(page).getByRole("button", { name: "Undo" }).click();
    await expect(items).toHaveCount(3);
  });

  test("add logos from the library: named after their files", async ({ page }) => {
    await openEditor(page, galerie());
    await canvas(page).getByRole("button", { name: "Add logos…" }).click();
    await library(page)
      .getByRole("option", { name: /hero\.png/ })
      .click();
    await library(page).getByRole("button", { name: "Add 1 image" }).click();
    await expect(canvas(page).locator(".logo-item")).toHaveCount(3);
    await expect(canvas(page).locator(".logo-item .logo-name").last()).toHaveText("hero");
  });

  test("add a person with a decorative portrait", async ({ page }) => {
    await openEditor(page, galerie());
    await canvas(page).getByRole("button", { name: "Add people…" }).click();
    await library(page)
      .getByRole("option", { name: /hero\.png/ })
      .click();
    await library(page).getByRole("button", { name: "Add 1 image" }).click();
    const people = canvas(page).locator(".person");
    await expect(people).toHaveCount(3);
    await expect(people.last().locator(".person-name")).toHaveText("Jméno");
    await people.last().locator("img").click({ force: true });
    await expect(imagePanel(page).getByLabel(/Decorative/)).toBeChecked();
  });

  test("reorder gallery photos and delete a logo", async ({ page }) => {
    await openEditor(page, galerie());
    const captions = canvas(page).locator(".gallery-item figcaption");
    await expect(captions.first()).toHaveText("Malování na plátno");
    // Select the third photo as a whole, then move it to the top.
    await selectItem(
      page,
      canvas(page).locator(".gallery-item").nth(2).locator("figcaption"),
      "Photo 3 of 3",
    );
    await toolbar(page).getByRole("button", { name: "Move up" }).click();
    await toolbar(page).getByRole("button", { name: "Move up" }).click();
    await expect(captions.first()).toHaveText("Keramická dílna");

    await selectItem(
      page,
      canvas(page).locator(".logo-item").last().locator(".logo-name"),
      "Logo 2 of 2",
    );
    await toolbar(page).getByRole("button", { name: "Delete", exact: true }).click();
    await expect(canvas(page).locator(".logo-item")).toHaveCount(1);
  });

  test("Add item adds a person, but not a gallery photo", async ({ page }) => {
    await openEditor(page, galerie());
    await canvas(page).locator(".person-name").last().click();
    await page.keyboard.press("End");
    await expect(toolbar(page).getByRole("button", { name: "Add item" })).toBeEnabled();
    await toolbar(page).getByRole("button", { name: "Add item" }).click();
    await expect(canvas(page).locator(".person")).toHaveCount(3);
    await canvas(page).locator(".gallery-item figcaption").first().click();
    await expect(toolbar(page).getByRole("button", { name: "Add item" })).toBeDisabled();
  });
});
