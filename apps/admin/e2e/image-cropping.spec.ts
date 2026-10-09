import type { Locator, Page } from "@playwright/test";
import sharp from "sharp";
import { projectPaths } from "../src/lib/project-paths";
import { listLibrary, removeFromLibrary } from "../src/lib/server/media";
import { addLanguage, readSite } from "../src/lib/server/site-documents";
import {
  canvas,
  expect,
  openEditor,
  paths,
  state,
  storeImageBlocksSite,
  test,
  testDb,
} from "./fixtures";

// Crop, rotate and the focal point (image-cropping, site-editing delta).

// biome-ignore lint/suspicious/noExplicitAny: tests read the stored document freely.
type Doc = { document_id: string; nodes: Record<string, any> };

// Other tests expect the demo picture alone under its name: take this file's images out of the
// library again (their files stay, as for any removed image).
test.afterEach(() => {
  const { projectId } = state();
  for (const image of listLibrary(testDb(), projectId)) {
    if (image.source || image.originalName === "bokem.png") {
      removeFromLibrary(testDb(), projectId, image.key);
    }
  }
});

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const imagePanel = (page: Page) => page.getByRole("region", { name: "Image" });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const cropDialog = (page: Page) => page.getByRole("dialog", { name: "Crop and rotate" });
const frameState = (page: Page) => cropDialog(page).getByText(/^Crop \d+ × \d+ pixels/);
const heroImage = (page: Page) => canvas(page).locator(".hero img");
const galerie = () => paths().edit("page_gallery");
const undo = (page: Page) => toolbar(page).getByRole("button", { name: "Undo" }).click();

/** Clicks an image on the canvas; Svedit lays a selection overlay over it. */
async function selectImage(page: Page, image: Locator) {
  await image.click({ force: true });
  await expect(imagePanel(page)).toBeVisible();
}

/** A picture whose left half is red and right half blue, as a PNG. */
async function halves(width: number, height: number): Promise<Buffer> {
  const half = await sharp({
    create: { width: width / 2, height, channels: 3, background: "#0000ff" },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 3, background: "#ff0000" } })
    .composite([{ input: half, left: width / 2, top: 0 }])
    .png()
    .toBuffer();
}

/** The library's options for the demo picture and its crops (all named `hero.png`). */
const heroOptions = (page: Page) => library(page).getByRole("option", { name: /hero\.png/ });

/**
 * Opens the library from the hero image and selects the demo picture itself. The library keeps
 * images from earlier tests, so it is told apart by its file.
 */
async function openLibraryOnHero(page: Page): Promise<number> {
  await openEditor(page);
  await selectImage(page, heroImage(page));
  await imagePanel(page).getByRole("button", { name: "Replace…" }).click();
  await expect(library(page)).toBeVisible();
  await library(page)
    .getByRole("option")
    .filter({ has: page.locator('img[src$="/hero.png-320.webp"]') })
    .click();
  return heroOptions(page).count();
}

test.describe("the crop dialog", () => {
  test("Keyboard only: move a square frame and make it smaller, then save", async ({ page }) => {
    const before = await openLibraryOnHero(page);
    await library(page).getByRole("button", { name: "Edit…" }).click();
    await expect(cropDialog(page)).toBeVisible();
    // The demo picture is 320 × 180: free, the frame is all of it.
    await expect(frameState(page)).toHaveText(
      "Crop 320 × 180 pixels, 0 from the left and 0 from the top.",
    );
    await cropDialog(page).getByLabel("Square (1:1)").check();
    await expect(frameState(page)).toHaveText(
      "Crop 180 × 180 pixels, 70 from the left and 0 from the top.",
    );
    await cropDialog(page).getByRole("button", { name: "Crop frame" }).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 2; i++) await page.keyboard.press("Shift+ArrowUp");
    // Steps of 1 % of the picture: 3 pixels across, 2 down.
    await expect(frameState(page)).toHaveText(
      "Crop 176 × 176 pixels, 79 from the left and 0 from the top.",
    );
    await cropDialog(page).getByRole("button", { name: "Save as new image" }).click();
    await expect(cropDialog(page)).toBeHidden();
    const options = heroOptions(page);
    // A new crop, or the same crop an earlier run made, now first and selected.
    await expect(options.first().locator("img")).toHaveAttribute(
      "src",
      /\/media\/hero-[0-9a-f]{8}-176\.webp$/,
    );
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    expect(await options.count()).toBeLessThanOrEqual(before + 1);
  });

  test("Cancel: nothing is added and the document is unchanged", async ({ page }) => {
    const before = await openLibraryOnHero(page);
    await library(page).getByRole("button", { name: "Edit…" }).click();
    await cropDialog(page).getByRole("button", { name: "Turn right" }).click();
    await expect(frameState(page)).toHaveText(
      "Crop 180 × 320 pixels, 0 from the left and 0 from the top.",
    );
    await cropDialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(cropDialog(page)).toBeHidden();
    await expect(heroOptions(page)).toHaveCount(before);
    await library(page).getByRole("button", { name: "Cancel" }).click();
    await expect(toolbar(page).getByRole("status").first()).toHaveText("All changes saved");
  });

  test("Turn a sideways photo in the library: the upright one joins it, selected", async ({
    page,
  }) => {
    await openLibraryOnHero(page);
    await library(page)
      .getByLabel("Choose files…")
      .setInputFiles({ name: "bokem.png", mimeType: "image/png", buffer: await halves(300, 200) });
    const options = library(page).getByRole("option", { name: /bokem\.png/ });
    // Uploaded (or found again, after an earlier run): first and selected.
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await library(page).getByRole("button", { name: "Edit…" }).click();
    await cropDialog(page).getByRole("button", { name: "Turn right" }).click();
    await expect(frameState(page)).toHaveText(
      "Crop 200 × 300 pixels, 0 from the left and 0 from the top.",
    );
    await cropDialog(page).getByRole("button", { name: "Save as new image" }).click();
    await expect(options).toHaveCount(2);
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "false");
    await library(page).getByRole("button", { name: "Use this image" }).click();
    await expect(heroImage(page)).toHaveAttribute("width", "200");
    await expect(heroImage(page)).toHaveAttribute("height", "300");
  });
});

test.describe("cropping a placed image", () => {
  test.beforeEach(() => storeImageBlocksSite());

  test("Crop a portrait from a group photo, keep its description, undo in one step", async ({
    page,
  }) => {
    await openEditor(page, galerie());
    const portrait = canvas(page).locator(".person img");
    await selectImage(page, portrait);
    await imagePanel(page).getByRole("button", { name: "Crop and rotate…" }).click();
    await expect(cropDialog(page).getByLabel("As shown here")).toBeChecked();
    await expect(frameState(page)).toHaveText(
      "Crop 180 × 180 pixels, 70 from the left and 0 from the top.",
    );
    await cropDialog(page).getByRole("button", { name: "Crop frame" }).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
    await cropDialog(page).getByRole("button", { name: "Save as new image" }).click();
    await expect(cropDialog(page)).toBeHidden();

    await expect(portrait).toHaveAttribute("src", /\/media\/hero-[0-9a-f]{8}-180\.webp$/);
    await expect(imagePanel(page).getByLabel(/Decorative/)).toBeChecked();
    await undo(page);
    await expect(portrait).toHaveAttribute("src", /\/media\/hero\.png-320\.webp$/);
  });

  test("Re-crop: the whole source with the earlier frame, which can grow past it", async ({
    page,
  }) => {
    await openEditor(page, galerie());
    const portrait = canvas(page).locator(".person img");
    await selectImage(page, portrait);
    await imagePanel(page).getByRole("button", { name: "Crop and rotate…" }).click();
    await cropDialog(page).getByRole("button", { name: "Crop frame" }).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
    await cropDialog(page).getByRole("button", { name: "Save as new image" }).click();
    await expect(portrait).toHaveAttribute("src", /\/media\/hero-[0-9a-f]{8}-180\.webp$/);

    await imagePanel(page).getByRole("button", { name: "Crop and rotate…" }).click();
    await expect(frameState(page)).toHaveText(
      "Crop 180 × 180 pixels, 55 from the left and 0 from the top.",
    );
    await cropDialog(page).getByLabel("Free").check();
    await cropDialog(page).getByRole("button", { name: "Whole picture" }).click();
    await expect(frameState(page)).toHaveText(
      "Crop 320 × 180 pixels, 0 from the left and 0 from the top.",
    );
    await cropDialog(page).getByRole("button", { name: "Save as new image" }).click();
    // Nothing cut: the source itself.
    await expect(portrait).toHaveAttribute("src", /\/media\/hero\.png-320\.webp$/);
  });

  test("No focal point for logos", async ({ page }) => {
    await openEditor(page, galerie());
    await selectImage(page, canvas(page).locator(".logo-item").first().locator("img"));
    await expect(imagePanel(page).getByRole("button", { name: "Crop and rotate…" })).toBeVisible();
    await expect(imagePanel(page).getByRole("button", { name: "Focal point" })).toHaveCount(0);
  });

  test("outside the primary language, a portrait can't be cropped or framed", async ({ page }) => {
    const { projectId, owner } = state();
    addLanguage(testDb(), projectId, "en", owner.id);
    await openEditor(page, projectPaths(projectId, "en").edit("page_gallery"));
    await selectImage(page, canvas(page).locator(".person img"));
    await expect(imagePanel(page).getByRole("button", { name: "Crop and rotate…" })).toHaveCount(0);
    await expect(imagePanel(page).getByRole("button", { name: "Focal point" })).toHaveCount(0);
  });
});

test.describe("the focal point", () => {
  const focalPoint = (page: Page) => imagePanel(page).getByRole("button", { name: "Focal point" });
  const value = (page: Page) => imagePanel(page).getByText(/% from the left/);

  test("Keep a face in view: a click near the top frames the hero there", async ({ page }) => {
    await openEditor(page);
    await selectImage(page, heroImage(page));
    const view = focalPoint(page).locator("img");
    const box = await view.boundingBox();
    if (!box) throw new Error("no focal point view");
    // The click lands on a whole pixel and the view may start between two, so the point is
    // where that pixel falls: about 15 % from the top.
    const y = Math.round(box.y + box.height * 0.15) - box.y;
    const top = Math.round((y / box.height) * 100);
    expect(Math.abs(top - 15)).toBeLessThanOrEqual(1);
    await view.click({ position: { x: box.width / 2, y } });
    await expect(value(page)).toHaveText(`50 % from the left, ${top} % from the top`);
    await expect(heroImage(page)).toHaveCSS("object-position", `50% ${top}%`);
    await undo(page);
    await expect(value(page)).toHaveText("50 % from the left, 50 % from the top");
  });

  test("Arrow keys: by 1, by 10 with Shift, merged into one undo step, and saved", async ({
    page,
  }) => {
    await openEditor(page);
    await selectImage(page, heroImage(page));
    await focalPoint(page).focus();
    await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("ArrowUp");
    await expect(value(page)).toHaveText("30 % from the left, 49 % from the top");
    await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
    await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
    const stored = readSite(testDb(), state().projectId)?.document as Doc;
    expect(stored.nodes.image_hero).toMatchObject({ focus_x: 30, focus_y: 49 });
    await undo(page);
    await expect(value(page)).toHaveText("50 % from the left, 50 % from the top");
  });

  test("Reset: Centre puts the point back", async ({ page }) => {
    await openEditor(page);
    await selectImage(page, heroImage(page));
    const centre = imagePanel(page).getByRole("button", { name: "Centre" });
    await expect(centre).toBeDisabled();
    await focalPoint(page).focus();
    await page.keyboard.press("Shift+ArrowDown");
    await expect(value(page)).toHaveText("50 % from the left, 60 % from the top");
    await centre.click();
    await expect(value(page)).toHaveText("50 % from the left, 50 % from the top");
    await expect(centre).toBeDisabled();
  });
});
