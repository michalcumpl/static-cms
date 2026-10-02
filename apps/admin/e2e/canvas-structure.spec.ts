import type { Page } from "@playwright/test";
import { canvas, expect, openEditor, paths, storeImageBlocksSite, test } from "./fixtures";

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const handle = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const actions = (page: Page) => page.getByRole("menu", { name: / actions$/ });
const picker = (page: Page) => page.getByRole("menu", { name: "Add a block" });
const selectionStatus = (page: Page) => toolbar(page).locator(".selection-label");
const headings = (page: Page) => canvas(page).locator("main h2");

/** Puts the caret at the end of a text on the canvas. */
async function caretIn(page: Page, text: string) {
  await canvas(page).getByText(text, { exact: true }).click();
}

test("delete a block with its handle, and undo", async ({ page }) => {
  await openEditor(page);
  await canvas(page).getByText("Co pečeme").hover();
  await handle(page, "Services block").click();
  await expect(actions(page)).toBeVisible();
  await actions(page).getByRole("menuitem", { name: "Delete" }).click();
  await expect(canvas(page).getByText("Co pečeme")).toHaveCount(0);
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(canvas(page).getByText("Co pečeme")).toBeVisible();
});

test("remove one gallery photo with its handle", async ({ page }) => {
  storeImageBlocksSite();
  await openEditor(page, paths().edit("page_gallery"));
  const photos = canvas(page).locator(".gallery-grid img");
  await expect(photos).toHaveCount(3);
  await caretIn(page, "Keramická dílna");
  await handle(page, "Photo 3").click();
  await expect(selectionStatus(page)).toHaveText("Photo 3 of 3 selected");
  await actions(page).getByRole("menuitem", { name: "Delete" }).click();
  await expect(photos).toHaveCount(2);
  await expect(canvas(page).getByText("Jak pracujeme")).toBeVisible();
});

test("handles show for the block and item with the caret, without hovering", async ({ page }) => {
  await openEditor(page);
  await caretIn(page, "Rohlíky a housky");
  await page.mouse.move(5, 5);
  await expect(handle(page, "Service 2")).toBeVisible();
  await expect(handle(page, "Services block")).toBeVisible();
  // And the places a block can go, above and below the block.
  await expect(page.getByRole("button", { name: "+ Add block" })).toHaveCount(2);
});

test("the menu has no handle", async ({ page }) => {
  await openEditor(page);
  await canvas(page).locator(".site-nav").getByText("Kontakt").hover();
  await expect(page.locator(".canvas-overlay [aria-haspopup]")).toHaveCount(0);
});

test("the first block can't move up, and a hero can't be duplicated", async ({ page }) => {
  await openEditor(page);
  await caretIn(page, "Objednat pečivo");
  await handle(page, "Hero block").click();
  const menu = actions(page);
  await expect(menu.getByRole("menuitem", { name: "Move up" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(menu.getByRole("menuitem", { name: "Duplicate" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(menu.getByRole("menuitem", { name: "Add block above" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(menu.getByRole("menuitem", { name: "Move down" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  await expect(menu.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
});

test("duplicate a block with the keyboard only", async ({ page }) => {
  await openEditor(page);
  await caretIn(page, "Co pečeme");
  await handle(page, "Services block").focus();
  await page.keyboard.press("Enter");
  await expect(actions(page).getByRole("menuitem", { name: "Move up" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(actions(page).getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(canvas(page).getByText("Co pečeme")).toHaveCount(2);
  await expect(selectionStatus(page)).toHaveText("Services block selected");
});

test("Escape closes the menu, keeping the block selected and the canvas focused", async ({
  page,
}) => {
  await openEditor(page);
  await caretIn(page, "Co pečeme");
  await handle(page, "Services block").click();
  await page.keyboard.press("Escape");
  await expect(actions(page)).toBeHidden();
  await expect(selectionStatus(page)).toHaveText("Services block selected");
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest(".site-canvas"))))
    .toBe(true);
});

test("the toolbar names the selection as Escape climbs, and nothing while typing", async ({
  page,
}) => {
  await openEditor(page);
  await caretIn(page, "Kváskový chléb");
  await expect(selectionStatus(page)).toHaveText("");
  await page.keyboard.press("Escape");
  await expect(selectionStatus(page)).toHaveText("Service 1 of 3 selected");
  await page.keyboard.press("Escape");
  await expect(selectionStatus(page)).toHaveText("Services block selected");
  await expect(toolbar(page).getByRole("button", { name: "Delete" })).toHaveAttribute(
    "title",
    /Esc selects the paragraph, item or block/,
  );
});

test("add a block between two blocks with the picker, and undo", async ({ page }) => {
  await openEditor(page);
  await canvas(page).getByText("Co pečeme").hover();
  await page.getByRole("button", { name: "+ Add block" }).last().click();
  await expect(picker(page)).toBeVisible();
  const hours = picker(page).getByRole("menuitem", { name: /^Opening hours/ });
  await expect(hours).toContainText("Your weekly hours, from the Business tab");
  const hero = picker(page).getByRole("menuitem", { name: /^Hero/ });
  await expect(hero).toHaveAttribute("aria-disabled", "true");
  await expect(hero).toContainText("A page has only one hero");
  await hours.click();
  await expect(headings(page)).toHaveText(["Co pečeme", "Otevírací doba", "O nás"]);
  const added = canvas(page).locator("[data-just-added]");
  await expect(added).toHaveCount(1);
  await expect(added).toBeInViewport();
  await expect(added).toHaveCount(0, { timeout: 3000 });
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(headings(page)).toHaveText(["Co pečeme", "O nás"]);
});

test("add a block below another from its handle", async ({ page }) => {
  await openEditor(page);
  await caretIn(page, "Co pečeme");
  await handle(page, "Services block").click();
  await actions(page).getByRole("menuitem", { name: "Add block below" }).click();
  await picker(page)
    .getByRole("menuitem", { name: /^Gallery/ })
    .click();
  await expect(canvas(page).locator("main > * .gallery, main .gallery")).toHaveCount(1);
  const order = await canvas(page)
    .locator(
      "main [data-type='node'][data-path$='blocks__1'], main [data-type='node'][data-path$='blocks__2']",
    )
    .evaluateAll((elements) => elements.map((e) => e.className));
  expect(order.join(" ")).toMatch(/services[\s\S]*gallery/);
});

test("Escape closes the picker and returns to its button", async ({ page }) => {
  await openEditor(page);
  await caretIn(page, "Co pečeme");
  const add = page.getByRole("button", { name: "+ Add block" }).last();
  await add.click();
  await page.keyboard.press("Escape");
  await expect(picker(page)).toBeHidden();
  await expect(add).toBeFocused();
  await expect(headings(page)).toHaveText(["Co pečeme", "O nás"]);
});

test("the left column has the pages, and no buttons for adding blocks", async ({ page }) => {
  await openEditor(page);
  const left = page.locator(".left-column");
  await expect(left.getByRole("link", { name: "Kontakt" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Add block" })).toHaveCount(0);
  await expect(left.getByRole("button", { name: /^(Text|Services|Gallery|Hero)$/ })).toHaveCount(0);
});

test("the picker shows each block as a card with a drawing, name and description", async ({
  page,
}) => {
  await openEditor(page);
  await caretIn(page, "Co pečeme");
  await page.getByRole("button", { name: "+ Add block" }).last().click();
  const cards = picker(page).getByRole("menuitem");
  await expect(cards).toHaveCount(11);
  for (const card of await cards.all()) {
    await expect(card.locator(".illustration svg")).toBeVisible();
  }
  const hours = picker(page).getByRole("menuitem", { name: /^Opening hours/ });
  await expect(hours).toContainText("Your weekly hours, from the Business tab");
  // Drawings are decoration: the card's name is its name and description only.
  await expect(hours.locator(".illustration")).toHaveAttribute("aria-hidden", "true");
});

test("arrow keys move across the picker's grid", async ({ page }) => {
  await openEditor(page);
  await caretIn(page, "Co pečeme");
  await page.getByRole("button", { name: "+ Add block" }).last().click();
  const card = (name: RegExp) => picker(page).getByRole("menuitem", { name });
  // Hero can't go here, so the first card that can is focused: Text, in the right column.
  await expect(card(/^Text Paragraphs/)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(card(/^Text with image/)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(card(/^Gallery/)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(card(/^Services/)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(headings(page)).toHaveText(["Co pečeme", "Služby", "O nás"]);
});

test("an empty page offers one Add block, which gives it its first block", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await canvas(page).locator("main p").first().click();
  await handle(page, "Text block").click();
  await actions(page).getByRole("menuitem", { name: "Delete" }).click();
  await page.mouse.move(5, 5);
  const add = page.getByRole("button", { name: "+ Add block" });
  await expect(add).toHaveCount(1);
  await add.click();
  await picker(page)
    .getByRole("menuitem", { name: /^Text Paragraphs/ })
    .click();
  await expect(canvas(page).locator(".rich-text")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const node = window.getSelection()?.anchorNode;
        const element = node instanceof Element ? node : node?.parentElement;
        return Boolean(element?.closest(".rich-text"));
      }),
    )
    .toBe(true);
});
