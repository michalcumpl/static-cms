import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  type BrowserContext,
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import { eq } from "drizzle-orm";
import { projectPaths } from "../src/lib/project-paths";
import { createSession } from "../src/lib/server/auth";
import { type Db, openDatabase } from "../src/lib/server/db/index";
import { siteDocuments, versions } from "../src/lib/server/db/schema";
import { demoSite } from "../src/lib/server/demo";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import { readState } from "./state";

let db: Db | undefined;
/** The test database (the same file the dev server uses). */
export function testDb(): Db {
  db ??= openDatabase();
  return db;
}

export const state = () => readState();
export const paths = () => projectPaths(state().projectId);

/** Puts the demo site back into the project, whatever the previous test saved. */
function resetSite(): void {
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, demoSite(), current?.version ?? "");
  if (!result.ok) throw new Error("could not reset the project");
}

/**
 * Stores the demo site in the version-1 format as the project's current document, as an
 * installation from before page management would have it (bypassing the save rules).
 */
export function storeVersion1Site(): void {
  const require = createRequire(import.meta.url);
  const file = require.resolve("@static-cms/site/fixtures/demo-site-v1.json");
  const document = JSON.parse(readFileSync(file, "utf8"));
  const current = testDb()
    .select({ versionId: siteDocuments.currentVersionId })
    .from(siteDocuments)
    .where(eq(siteDocuments.projectId, state().projectId))
    .get();
  testDb()
    .update(versions)
    .set({ document })
    .where(eq(versions.id, current?.versionId ?? ""))
    .run();
}

/** Signs a browser context in as `user` by giving it a fresh session cookie. */
export async function signIn(context: BrowserContext, user = state().owner): Promise<void> {
  const token = createSession(testDb(), user.id);
  await context.addCookies([
    {
      name: "session",
      value: token,
      url: process.env.ORIGIN ?? "",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Every test starts from the demo site, signed in as the project's owner, and fails on
 * any uncaught error in the page. Tests about signing in use the `anonymous` option.
 * Leaving an editor with unsaved edits would open a dialog; tests that care handle it.
 */
export const test = base.extend<{ anonymous: boolean; pageErrors: Error[] }>({
  anonymous: [false, { option: true }],
  pageErrors: [
    async ({ page, context, anonymous }, use) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));
      resetSite();
      if (!anonymous) await signIn(context);
      await use(errors);
      expect(errors.map((e) => e.message)).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const canvas = (page: Page) => page.locator(".site-canvas");

/** Opens the editor for a page and waits for the canvas. */
export async function openEditor(page: Page, path = paths().edit()): Promise<void> {
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

/** The newest email in the outbox addressed to `to`, and the first link in it. */
export async function latestLink(to: string, since = 0): Promise<string> {
  const { readOutbox } = await import("../src/lib/server/mail");
  for (let attempt = 0; attempt < 20; attempt++) {
    const message = readOutbox(process.env.OUTBOX_DIR ?? "")
      .filter((m) => m.to === to && Date.parse(m.sentAt) >= since)
      .at(-1);
    const link = /https?:\/\/\S+/.exec(message?.text ?? "")?.[0];
    if (link) return link;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`no email to ${to}`);
}
