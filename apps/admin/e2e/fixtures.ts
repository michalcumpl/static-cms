import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  type BrowserContext,
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { projectPaths } from "../src/lib/project-paths";
import { createSession } from "../src/lib/server/auth";
import { type Db, openDatabase } from "../src/lib/server/db/index";
import { projectHosting, publishes, siteDocuments, versions } from "../src/lib/server/db/schema";
import { demoSite, imageBlocksSite } from "../src/lib/server/demo";
import { fakeHosting, resetFakeHosting } from "../src/lib/server/publishing/webmio-fake";
import {
  projectLanguages,
  readSite,
  removeLanguage,
  saveSite,
} from "../src/lib/server/site-documents";
import { webmioPort } from "./ports";
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
  // Back to Czech only: languages added by an earlier test go.
  for (const language of projectLanguages(testDb(), projectId)) {
    if (!language.primary) removeLanguage(testDb(), projectId, language.lang);
  }
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
  const file = require.resolve("@webmio/model/fixtures/demo-site-v1.json");
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

/** Replaces the project's site with the image blocks fixture (the demo plus a page "Galerie"). */
export function storeImageBlocksSite(): void {
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, imageBlocksSite(), current?.version ?? "");
  if (!result.ok) throw new Error("could not store the image blocks site");
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

/** The folder the dev server's Webmio hosting fake keeps its websites in. */
const webmioDir = () => process.env.WEBMIO_HOSTING_FAKE_DIR ?? "";

/**
 * Switches Webmio hosting off and forgets the project's website on it, so every test starts on
 * a server without it, as the Netlify flows expect.
 */
function resetWebmio(): void {
  resetFakeHosting(webmioDir(), false);
  const { projectId } = state();
  const onWebmio = testDb()
    .select({ id: projectHosting.projectId })
    .from(projectHosting)
    .where(and(eq(projectHosting.projectId, projectId), eq(projectHosting.provider, "webmio")))
    .get();
  if (!onWebmio) return;
  testDb().delete(publishes).where(eq(publishes.projectId, projectId)).run();
  testDb().delete(projectHosting).where(eq(projectHosting.projectId, projectId)).run();
}

/** Switches the dev server's Webmio hosting on for this test, empty, with a redirect server or not. */
export function useWebmioHosting(options: { redirectAddress?: string } = {}): void {
  resetFakeHosting(webmioDir(), true, options);
}

/** While on, the fake edge keeps serving each website's previous publish, so verification fails. */
export function staleEdge(stale: boolean): void {
  fakeHosting(webmioDir()).serveStale(stale);
}

/** A website's address on the Webmio hosting fake, as a browser reaches it. */
export const webmioSite = (name: string, path = "/") =>
  `http://${name}.localhost:${webmioPort}${path}`;

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
      resetWebmio();
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
  // Put the caret after the last character through the DOM, as `selectText` does: the End key
  // goes to the end of the visual line, which depends on where the text wraps.
  await text.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let last: Text | undefined;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node as Text).data.length > 0) last = node as Text;
    }
    if (!last) return;
    const range = document.createRange();
    range.setStart(last, last.data.length);
    range.collapse(true);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.waitForTimeout(100);
}

/**
 * Adds a block right after the block holding the caret, as an owner does: "+ Add block" below
 * that block, then the block's card in the picker, by its name ("Text with image").
 */
export async function addBlockAfterCaret(page: Page, name: string): Promise<void> {
  await page.locator(".canvas-overlay .cs-add.cs-bottom").click();
  const picker = page.getByRole("menu", { name: "Add a block" });
  await picker
    .getByRole("menuitem")
    .filter({ has: page.locator(".label", { hasText: new RegExp(`^${name}$`) }) })
    .click();
  await expect(picker).toBeHidden();
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

/** The fake Netlify the dev server publishes to. */
export const fakeNetlify = () => process.env.NETLIFY_API_URL ?? "";

/** Registers a token with the fake Netlify, with the teams it can access. */
export async function fakeNetlifyToken(token: string, teams: { slug: string; name: string }[]) {
  await fetch(`${fakeNetlify()}/__fake/token`, {
    method: "POST",
    body: JSON.stringify({ token, teams }),
  });
}

/** Connects the test workspace to the fake Netlify directly (the UI is tested separately). */
export async function connectTestWorkspace(token = "nfp_e2e_token"): Promise<void> {
  await fakeNetlifyToken(token, [{ slug: "e2e", name: "E2E team" }]);
  const { connectWorkspace } = await import("../src/lib/server/publishing/connection");
  const { workspaceId, owner } = state();
  const result = await connectWorkspace(testDb(), workspaceId, owner.id, { token, account: "e2e" });
  if (!result.ok) throw new Error(result.message.key);
}

/** Removes the test workspace's Netlify connection and its projects' hosting. */
export async function resetPublishing(): Promise<void> {
  const { hostingConnections, projectHosting, publishes } = await import(
    "../src/lib/server/db/schema"
  );
  const { eq } = await import("drizzle-orm");
  const { workspaceId, projectId } = state();
  testDb().delete(publishes).where(eq(publishes.projectId, projectId)).run();
  testDb().delete(projectHosting).where(eq(projectHosting.projectId, projectId)).run();
  testDb().delete(hostingConnections).where(eq(hostingConnections.workspaceId, workspaceId)).run();
}

/** Opens the project's Settings tab (of a language, the primary without one) and waits for it. */
/** Opens the panel's Business section (in a language) and waits until it can be edited. */
export async function openBusiness(page: Page, lang?: string): Promise<void> {
  await page.goto(projectPaths(state().projectId, lang).business);
  await expect(page.getByRole("region", { name: "Business", exact: true })).toBeVisible();
  // The section's fields work once its script has taken over.
  await page.waitForLoadState("networkidle");
}

/** Opens a list section of the panel (in a language) and waits until it can be edited. */
export async function openLists(page: Page, section: "offer" | "about", lang?: string) {
  await page.goto(projectPaths(state().projectId, lang)[section]);
  await expect(page.locator("[contenteditable=true]:has(.list-forms)")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

/** Opens the panel's Website section (in a language) and waits until it can be edited. */
export async function openWebsite(page: Page, lang?: string): Promise<void> {
  await page.goto(projectPaths(state().projectId, lang).website);
  await expect(page.getByRole("region", { name: "Site", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

/** Saves on the Settings tab and waits for "Saved". */
export async function saveSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
}

/** The "⋯" menu of an entry in the editor's pages list, opened. */
export async function openPageMenu(page: Page, name: string): Promise<Locator> {
  await page
    .getByRole("complementary", { name: "Pages" })
    .getByRole("button", { name: `Actions for “${name}”` })
    .click();
  return page.getByRole("menu", { name: `Actions for “${name}”` });
}

/** Chooses an action in the "⋯" menu of an entry in the pages list. */
export async function pageAction(page: Page, name: string, action: string): Promise<void> {
  const menu = await openPageMenu(page, name);
  await menu.getByRole("menuitem", { name: action }).click();
}
