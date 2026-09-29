import {
  blockOrder,
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  selectText,
  test,
  toolbarButton,
} from "./fixtures";

test("edit the hero heading, save, and see it in the preview", async ({ page }) => {
  await openEditor(page);
  await caretAtEnd(page, canvas(page).locator(".hero h1"));
  await page.keyboard.type(" – i v neděli");
  await expect(page.getByRole("toolbar", { name: "Editing" }).getByRole("status")).toHaveText(
    "Unsaved changes",
  );

  await toolbarButton(page, "Save").click();
  await expect(page.getByRole("toolbar", { name: "Editing" }).getByRole("status")).toHaveText(
    "Saved",
  );

  await page.goto("/preview/");
  await expect(page.locator("h1")).toHaveText("Čerstvý chléb každé ráno – i v neděli");
});

test("make a word bold and link text to another page", async ({ page }) => {
  await openEditor(page);
  const paragraph = canvas(page).locator(".rich-text p").first();

  await selectText(page, paragraph, "Lipové");
  await toolbarButton(page, "Bold").click();
  await expect(paragraph.locator("strong", { hasText: "Lipové" })).toBeVisible();

  await selectText(page, paragraph, "1998");
  await toolbarButton(page, "Link").click();
  const dialog = page.getByRole("dialog", { name: "Add link" });
  await dialog.getByRole("combobox", { name: "Page" }).selectOption({ label: "Kontakt" });
  await dialog.getByRole("button", { name: "Add link" }).click();
  await expect(dialog).toBeHidden();
  await expect(paragraph.locator(".link", { hasText: "1998" })).toBeVisible();

  await toolbarButton(page, "Save").click();
  await expect(page.getByRole("toolbar", { name: "Editing" }).getByRole("status")).toHaveText(
    "Saved",
  );
  await page.goto("/preview/");
  await expect(
    page.locator("p", { hasText: "1998" }).getByRole("link", { name: "1998" }),
  ).toHaveAttribute("href", "/preview/kontakt/");
});

test("refuse an unsafe link address", async ({ page }) => {
  await openEditor(page);
  const paragraph = canvas(page).locator(".rich-text p").first();
  await selectText(page, paragraph, "1998");
  await toolbarButton(page, "Link").click();

  const dialog = page.getByRole("dialog", { name: "Add link" });
  await dialog.getByRole("radio", { name: "An address" }).check();
  await dialog.getByRole("textbox", { name: "Address" }).fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "Add link" }).click();

  await expect(dialog.getByRole("alert")).toContainText("https://, http://, mailto: or tel:");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(paragraph.locator(".link", { hasText: "1998" })).toHaveCount(0);
});

test("insert a services block and reorder blocks", async ({ page }) => {
  await openEditor(page);
  await canvas(page).locator(".hero-text").click();
  await toolbarButton(page, "Services").click();
  expect(await blockOrder(page)).toEqual(["hero", "services", "services", "rich_text"]);
  await expect(canvas(page).locator(".services h2").first()).toHaveText("Služby");

  // Select the new block (Escape selects the parent of the caret) and move it down twice.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  await toolbarButton(page, "Move down").click();
  await page.keyboard.press("Alt+ArrowDown");
  expect(await blockOrder(page)).toEqual(["hero", "services", "rich_text", "services"]);
});

test("undo and redo", async ({ page }) => {
  await openEditor(page);
  const heading = canvas(page).locator(".hero h1");
  await caretAtEnd(page, heading);
  await page.keyboard.type("!");
  await expect(heading).toHaveText("Čerstvý chléb každé ráno!");

  await toolbarButton(page, "Undo").click();
  await expect(heading).toHaveText("Čerstvý chléb každé ráno");
  await expect(page.getByRole("toolbar", { name: "Editing" }).getByRole("status")).toHaveText(
    "All changes saved",
  );

  await toolbarButton(page, "Redo").click();
  await expect(heading).toHaveText("Čerstvý chléb každé ráno!");
});

test("switching pages keeps unsaved edits", async ({ page }) => {
  await openEditor(page);
  await caretAtEnd(page, canvas(page).locator(".hero h1"));
  await page.keyboard.type(" X");

  const pages = page.getByRole("complementary", { name: "Pages" });
  await pages.getByRole("link", { name: "Kontakt" }).click();
  await expect(canvas(page).locator("h1")).toHaveText("Kontakt");
  await pages.getByRole("link", { name: "Úvod" }).click();

  await expect(canvas(page).locator(".hero h1")).toHaveText("Čerstvý chléb každé ráno X");
  await expect(page.getByRole("toolbar", { name: "Editing" }).getByRole("status")).toHaveText(
    "Unsaved changes",
  );
});

test("an empty subheading is listed as a problem, and saving still works", async ({ page }) => {
  await openEditor(page);
  const heading = canvas(page).locator(".rich-text h2", { hasText: "O nás" });
  await selectText(page, heading, "O nás");
  await page.keyboard.press("Backspace");
  await expect(heading).toHaveCount(0);

  const problems = page.getByRole("region", { name: "Problems" });
  await expect(
    problems.getByRole("button", { name: /Subheadings must not be empty/ }),
  ).toBeVisible();

  await toolbarButton(page, "Save").click();
  await expect(page.getByRole("toolbar", { name: "Editing" }).getByRole("status")).toHaveText(
    "Saved",
  );

  const preview = await page.request.get("/preview/");
  expect(preview.status()).toBe(422);
  expect(await preview.text()).toContain("empty-heading");
});

test("leaving with unsaved edits asks first", async ({ page }) => {
  await openEditor(page);
  await caretAtEnd(page, canvas(page).locator(".hero h1"));
  await page.keyboard.type("?");

  let asked = "";
  page.once("dialog", async (dialog) => {
    asked = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "← Overview" }).click();
  await expect.poll(() => asked).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/edit\/$/);
});
