import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test as base, expect, type Locator, type Page } from "@playwright/test";

const require = createRequire(import.meta.url);
const demoSite = readFileSync(require.resolve("@static-cms/site/fixtures/demo-site.json"), "utf8");

/** Puts the demo site back into the working copy, whatever the previous test saved. */
async function resetSite(page: Page): Promise<void> {
  const { version } = await (await page.request.get("/api/site")).json();
  const response = await page.request.put("/api/site", {
    data: { document: JSON.parse(demoSite), baseVersion: version },
  });
  expect(response.ok()).toBe(true);
}

/**
 * Every test starts from the demo site and fails on any uncaught error in the page.
 * Leaving an editor with unsaved edits would open a dialog; tests that care handle it.
 */
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));
      await resetSite(page);
      await use(errors);
      expect(errors.map((e) => e.message)).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const canvas = (page: Page) => page.locator(".site-canvas");

/** Opens the editor for a page and waits for the canvas. */
export async function openEditor(page: Page, path = "/edit/"): Promise<void> {
  await page.goto(path);
  await expect(canvas(page).locator("[contenteditable=true]")).toBeVisible();
}

/**
 * Selects `text` inside `within` through the DOM, like a user would, and waits for the
 * editor to take the selection over (Svedit follows the browser's selectionchange).
 */
export async function selectText(page: Page, within: Locator, text: string): Promise<void> {
  await within.evaluate((element, needle) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const index = (node as Text).data.indexOf(needle);
      if (index < 0) continue;
      (element.closest("[contenteditable=true]") as HTMLElement | null)?.focus();
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + needle.length);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    throw new Error(`Text not found: ${needle}`);
  }, text);
  await page.waitForTimeout(100);
}

/** Puts the caret at the end of an editable text, and waits for the editor to see it. */
export async function caretAtEnd(page: Page, text: Locator): Promise<void> {
  await text.click();
  await page.keyboard.press("End");
  await page.waitForTimeout(100);
}

export const toolbarButton = (page: Page, name: string) =>
  page.getByRole("toolbar", { name: "Editing" }).getByRole("button", { name, exact: true });

export const blockOrder = (page: Page) =>
  canvas(page)
    .locator(".page-blocks > [data-type=node]")
    .evaluateAll((nodes) => nodes.map((n) => /node-(\w+)/.exec(n.className)?.[1]));
