import type { Page } from "@playwright/test";
import sharp from "sharp";
import { canvas, expect, openEditor, paths, test } from "./fixtures";

async function jpeg(width: number, height: number, color = "#b0703a"): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

const imagePanel = (page: Page) => page.getByRole("region", { name: "Image" });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const heroImage = (page: Page) => canvas(page).locator(".hero img");
const status = (page: Page) => page.getByRole("toolbar", { name: "Editing" }).getByRole("status");

async function selectHeroImage(page: Page) {
  // Svedit lays a selection overlay over the image; a click lands on it, as a user's would.
  await heroImage(page).click({ force: true });
  await expect(imagePanel(page)).toBeVisible();
}

test("upload a photo in the library and use it as the hero image", async ({ page }) => {
  await openEditor(page);
  await selectHeroImage(page);
  await imagePanel(page).getByRole("button", { name: "Replace…" }).click();
  await expect(library(page)).toBeVisible();

  await library(page)
    .getByLabel("Choose files…")
    .setInputFiles({
      name: "Pult s chlebem.jpg",
      mimeType: "image/jpeg",
      buffer: await jpeg(1200, 900),
    });
  await expect(library(page).getByRole("list", { name: "Uploads" })).toContainText("Uploaded");
  const option = library(page).getByRole("option", { name: /Pult s chlebem\.jpg/ });
  await expect(option).toHaveAttribute("aria-selected", "true");
  await library(page).getByRole("button", { name: "Use this image" }).click();

  await expect(library(page)).toBeHidden();
  await expect(heroImage(page)).toHaveAttribute(
    "src",
    /\/media\/pult-s-chlebem-[0-9a-f]{8}-1200\.webp$/,
  );
  await expect(heroImage(page)).toHaveAttribute("width", "1200");
  // A different picture: its description starts empty, and the panel asks for one.
  const alt = imagePanel(page).getByLabel(/Description/);
  await expect(alt).toBeFocused();
  await expect(alt).toHaveValue("");
  await expect(
    imagePanel(page).getByText("Describe the image, or mark it as decorative."),
  ).toBeVisible();
  await expect(status(page)).toHaveText("Unsaved changes");
});

test("a PDF is refused with the accepted formats", async ({ page }) => {
  await openEditor(page);
  await selectHeroImage(page);
  await imagePanel(page).getByRole("button", { name: "Replace…" }).click();
  await library(page)
    .getByLabel("Choose files…")
    .setInputFiles({
      name: "menu.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
  await expect(library(page).getByRole("alert")).toHaveText(
    "Only JPEG, PNG and WebP images can be uploaded.",
  );
  await expect(library(page).getByRole("option", { name: /menu\.pdf/ })).toHaveCount(0);
  await library(page).getByRole("button", { name: "Cancel" }).click();
  await expect(status(page)).toHaveText("All changes saved");
});

test("remove the hero image, add it back, describe it, save and preview", async ({ page }) => {
  await openEditor(page);
  await selectHeroImage(page);
  await imagePanel(page).getByRole("button", { name: "Remove" }).click();
  await expect(heroImage(page)).toHaveCount(0);

  await canvas(page).getByRole("button", { name: "Add image…" }).click();
  await library(page)
    .getByRole("option", { name: /hero\.png/ })
    .click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await expect(heroImage(page)).toHaveAttribute("src", /\/media\/hero\.png-320\.webp$/);

  const alt = imagePanel(page).getByLabel(/Description/);
  await expect(alt).toBeFocused();
  await alt.fill("Chléb na pultu");
  await page
    .getByRole("toolbar", { name: "Editing" })
    .getByRole("button", { name: "Save" })
    .click();
  await expect(status(page)).toHaveText("Saved");

  const preview = await (await page.request.get(paths().preview)).text();
  expect(preview).toContain('alt="Chléb na pultu"');
  expect(preview).toContain("assets/images/hero.png-320.webp");
});

test("undo brings a removed hero image back with its description", async ({ page }) => {
  await openEditor(page);
  await selectHeroImage(page);
  await imagePanel(page).getByRole("button", { name: "Remove" }).click();
  await expect(heroImage(page)).toHaveCount(0);
  await page
    .getByRole("toolbar", { name: "Editing" })
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(heroImage(page)).toHaveAttribute(
    "alt",
    "Bochníky kváskového chleba na dřevěném pultu",
  );
});

test("drop a photo onto the library to upload it", async ({ page }) => {
  await openEditor(page);
  await selectHeroImage(page);
  await imagePanel(page).getByRole("button", { name: "Replace…" }).click();
  const bytes = [...(await jpeg(640, 480, "#2a6"))];
  const dataTransfer = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(data)], "Dort.jpg", { type: "image/jpeg" }));
    return transfer;
  }, bytes);
  await library(page)
    .getByRole("region", { name: "Images" })
    .dispatchEvent("drop", { dataTransfer });
  await expect(library(page).getByRole("option", { name: /Dort\.jpg/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
