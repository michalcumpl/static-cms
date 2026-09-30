import {
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  paths,
  storeImageBlocksSite,
  test,
  toolbarButton,
} from "./fixtures";

test("Cmd/Ctrl+A twice, then Backspace, empties only the field", async ({ page }) => {
  await openEditor(page);
  const section = canvas(page).locator(".rich-text").first();
  const paragraph = section.locator("p").first();
  await caretAtEnd(page, paragraph);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await expect(paragraph).toHaveText("");
  await expect(section.locator("h2")).toHaveText("O nás");
  await expect(section.locator("li")).toHaveCount(3);
  await expect(canvas(page).locator(".rich-text")).toHaveCount(1);
});

test("Escape still selects the paragraph as a whole", async ({ page }) => {
  await openEditor(page);
  const paragraph = canvas(page).locator(".rich-text p").first();
  await caretAtEnd(page, paragraph);
  await page.keyboard.press("Escape");
  await expect(toolbarButton(page, "Delete")).toBeEnabled();
});

test("a problem about a link inside text selects the linked words", async ({ page }) => {
  storeImageBlocksSite();
  await openEditor(page, paths().edit("page_contact"));
  const settings = page.getByRole("region", { name: "Page", exact: true });
  await settings.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog", { name: "Delete “Kontakt”?" })
    .getByRole("button", { name: "Delete page" })
    .click();
  await page
    .getByRole("complementary", { name: "Pages" })
    .getByRole("link", { name: "Galerie" })
    .click();
  await expect(canvas(page).locator("h1")).toHaveText("Galerie");

  const problems = page.getByRole("region", { name: "Problems" });
  await problems
    .getByRole("button", { name: 'A link on "Úvod" points to a page that no longer exists.' })
    .click();
  await expect(canvas(page).locator(".hero h1")).toBeVisible();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe("stránce Kontakt");
});
