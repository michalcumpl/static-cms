import type { Page } from "@playwright/test";
import {
  addBlockAfterCaret,
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  paths,
  test,
} from "./fixtures";

// Key figures and steps on the canvas (figures-and-steps design decision 4).

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });

async function caretInLastBlock(page: Page) {
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
}

/** Types into the n-th element matching `selector` on the canvas, after its current text. */
async function typeInto(page: Page, selector: string, n: number, words: string) {
  await caretAtEnd(page, canvas(page).locator(selector).nth(n));
  await page.keyboard.type(words);
}

test("insert key figures and steps, save, and see them in the preview", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await caretInLastBlock(page);
  await addBlockAfterCaret(page, "Key figures");
  const figures = canvas(page).locator("section.figures");
  await expect(figures.locator(".figure")).toHaveCount(3);
  // The caret is in the first value.
  await page.keyboard.type("25 let");
  await typeInto(page, ".figure-label", 0, "pečeme v Kolíně");
  await typeInto(page, ".figure-value", 1, "3");
  await typeInto(page, ".figure-label", 1, "druhy chleba");
  await typeInto(page, ".figure-value", 2, "4:00");
  await typeInto(page, ".figure-label", 2, "začínáme péct");

  await caretAtEnd(page, figures.locator(".figure-label").nth(2));
  await addBlockAfterCaret(page, "Steps");
  const steps = canvas(page).locator("section.steps");
  await expect(steps.locator("h2")).toHaveText("Jak to funguje");
  await typeInto(page, ".step-title", 0, "Objednejte");
  await typeInto(page, ".step-text", 0, "Zavolejte nebo napište.");
  await typeInto(page, ".step-title", 1, "Upečeme");
  await typeInto(page, ".step-title", 2, "Vyzvedněte si");

  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");

  const preview = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(preview).toMatch(
    /<p class="figure-value">25 let<\/p>\s*<p class="figure-label">pečeme v Kolíně<\/p>/,
  );
  expect(preview).toContain('<p class="figure-value">4:00</p>');
  expect(preview).toContain("<h2>Jak to funguje</h2>");
  expect(preview.match(/<h3 class="step-title">/g)).toHaveLength(3);
  expect(preview).toContain('<p class="step-text">Zavolejte nebo napište.</p>');
});
