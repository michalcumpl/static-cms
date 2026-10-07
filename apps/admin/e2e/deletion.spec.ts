import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Page } from "@playwright/test";
import { and, eq, ne } from "drizzle-orm";
import { projectPaths } from "../src/lib/project-paths";
import { projectHosting, projects, users } from "../src/lib/server/db/schema";
import { demoSite } from "../src/lib/server/demo";
import { newId } from "../src/lib/server/ids";
import { registerLegacyMedia } from "../src/lib/server/media";
import { addMember } from "../src/lib/server/members";
import { createProject } from "../src/lib/server/site-documents";
import {
  connectTestWorkspace,
  expect,
  fakeNetlify,
  resetPublishing,
  signIn,
  state,
  test,
  testDb,
} from "./fixtures";

// Deleting, restoring and removing a website (project-deletion). Each test deletes a throwaway
// project, so the shared one stays for the other specs.

const NAME = "Kadeřnictví Eva";
let projectId = "";
const mediaFolder = () => join(process.env.MEDIA_DIR ?? "", projectId);

test.beforeEach(async () => {
  await resetPublishing();
  projectId = createProject(testDb(), state().workspaceId, NAME, demoSite());
  // The demo's image, as the shared project gets it in the global setup.
  const fixtures = dirname(
    createRequire(import.meta.url).resolve("@webmio/model/fixtures/demo-site.json"),
  );
  mkdirSync(mediaFolder(), { recursive: true });
  copyFileSync(join(fixtures, "media", "hero.png"), join(mediaFolder(), "hero.png"));
  await registerLegacyMedia(testDb(), projectId);
});
test.afterEach(async () => {
  await resetPublishing();
  testDb()
    .delete(projects)
    .where(and(eq(projects.workspaceId, state().workspaceId), ne(projects.id, state().projectId)))
    .run();
});

const paths = () => projectPaths(projectId);
const dialog = (page: Page) => page.getByRole("dialog", { name: `Delete ${NAME}?` });
const deletedList = (page: Page) => page.getByRole("region", { name: "Deleted websites" });

async function openDeletion(page: Page) {
  await page.goto(paths().website);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Delete website…" }).click();
  await expect(dialog(page)).toBeVisible();
}

/** The throwaway project as published on the fake Netlify at its address. */
function hosted(siteId = "site-eva") {
  testDb()
    .insert(projectHosting)
    .values({
      projectId,
      provider: "netlify",
      accountSlug: "e2e",
      siteId,
      siteName: "sc-eva",
      defaultUrl: "https://sc-eva.netlify.app",
      domain: "kadernictvi-eva.cz",
    })
    .run();
}

test("Confirm with the name", async ({ page }) => {
  await openDeletion(page);
  const remove = dialog(page).getByRole("button", { name: "Delete website" });
  await expect(remove).toBeDisabled();
  await dialog(page).getByLabel(`Type ${NAME} to confirm`).fill("kadeřnictví eva");
  await expect(remove).toBeDisabled();
  await dialog(page).getByLabel(`Type ${NAME} to confirm`).fill(NAME);
  await remove.click();
  await expect(page).toHaveURL(/\/\?deleted=/);
  await expect(page.getByText(`${NAME} was deleted.`)).toBeVisible();
  await expect(page.getByRole("link", { name: NAME, exact: true })).toHaveCount(0);
  await expect(deletedList(page)).toContainText(NAME);
});

test("Delete a website: its addresses answer not found", async ({ page }) => {
  await openDeletion(page);
  await dialog(page).getByLabel(`Type ${NAME} to confirm`).fill(NAME);
  await dialog(page).getByRole("button", { name: "Delete website" }).click();
  await expect(page).toHaveURL(/\/\?deleted=/);
  expect((await page.goto(paths().website))?.status()).toBe(404);
  expect((await page.request.get(paths().api)).status()).toBe(404);
});

test("unsaved changes are dropped without asking", async ({ page }) => {
  await page.goto(paths().website);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name", { exact: true }).first().fill("Eva a spol.");
  page.on("dialog", (d) => {
    throw new Error(`unexpected dialog: ${d.message()}`);
  });
  await page.getByRole("button", { name: "Delete website…" }).click();
  await dialog(page).getByLabel(`Type ${NAME} to confirm`).fill(NAME);
  await dialog(page).getByRole("button", { name: "Delete website" }).click();
  await expect(page).toHaveURL(/\/\?deleted=/);
});

test("Published website: the confirmation says it goes offline", async ({ page }) => {
  await connectTestWorkspace();
  hosted();
  await openDeletion(page);
  await expect(dialog(page)).toContainText(
    "It goes offline at once: https://sc-eva.netlify.app and kadernictvi-eva.cz.",
  );
});

test("published, but the workspace isn't connected: the site stays on Netlify", async ({
  page,
}) => {
  hosted();
  await openDeletion(page);
  await expect(dialog(page)).toContainText("so the published site stays there");
});

test("Netlify down: nothing is deleted", async ({ page }) => {
  await connectTestWorkspace();
  hosted();
  await fetch(`${fakeNetlify()}/__fake/down`, {
    method: "POST",
    body: JSON.stringify({ down: true }),
  });
  try {
    await openDeletion(page);
    await dialog(page).getByLabel(`Type ${NAME} to confirm`).fill(NAME);
    await dialog(page).getByRole("button", { name: "Delete website" }).click();
    await expect(dialog(page).getByRole("alert")).toHaveText(
      "The hosting service (Netlify) couldn't be reached.",
    );
  } finally {
    await fetch(`${fakeNetlify()}/__fake/down`, {
      method: "POST",
      body: JSON.stringify({ down: false }),
    });
  }
  expect((await page.request.get(paths().api)).status()).toBe(200);
});

test.describe("an editor", () => {
  test.use({ anonymous: true });

  test("Editor: no Delete website area, and no deleted websites", async ({ page, context }) => {
    const id = newId("u");
    const email = `editor-${Date.now()}@example.cz`;
    testDb().insert(users).values({ id, email, createdAt: new Date() }).run();
    addMember(testDb(), state().workspaceId, id, "editor");
    testDb()
      .update(projects)
      .set({ deletedAt: new Date(), deletedBy: state().owner.id })
      .where(eq(projects.id, projectId))
      .run();
    await signIn(context, { id, email });
    await page.goto(projectPaths(state().projectId).website);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Delete website…" })).toHaveCount(0);
    await page.goto("/");
    await expect(deletedList(page)).toHaveCount(0);
  });
});

test.describe("deleted websites", () => {
  async function deleted(page: Page) {
    await openDeletion(page);
    await dialog(page).getByLabel(`Type ${NAME} to confirm`).fill(NAME);
    await dialog(page).getByRole("button", { name: "Delete website" }).click();
    await expect(page).toHaveURL(/\/\?deleted=/);
  }

  test("Restore by mistake", async ({ page }) => {
    await deleted(page);
    await expect(deletedList(page)).toContainText(`Deleted on`);
    await expect(deletedList(page)).toContainText(state().owner.email);
    await deletedList(page)
      .getByRole("group", { name: NAME })
      .getByRole("button", { name: "Restore" })
      .click();
    await expect(deletedList(page)).toHaveCount(0);
    await page.getByRole("link", { name: NAME, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${projectId}/?$`));
    await expect(page.getByText("Not published yet").first()).toBeVisible();
  });

  test("Delete now", async ({ page }) => {
    await deleted(page);
    await deletedList(page).getByRole("button", { name: "Delete now" }).click();
    const confirm = page.getByRole("dialog", { name: `Delete ${NAME} for good?` });
    await expect(confirm).toContainText("it can't be restored");
    await confirm.getByRole("button", { name: "Delete now" }).click();
    await expect(deletedList(page)).toHaveCount(0);
    expect(testDb().select().from(projects).where(eq(projects.id, projectId)).all()).toEqual([]);
    expect(existsSync(mediaFolder())).toBe(false);
  });

  test("Publish after restoring: a new site", async ({ page }) => {
    await connectTestWorkspace();
    await page.goto(paths().dashboard);
    await page.waitForLoadState("networkidle");
    const overview = page.getByRole("region", { name: "Overview" });
    await overview.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(overview.getByText(/^Published · /)).toBeVisible({ timeout: 15_000 });
    const before = (await (await fetch(`${fakeNetlify()}/__fake/sites`)).json()) as {
      id: string;
    }[];

    await deleted(page);
    const after = (await (await fetch(`${fakeNetlify()}/__fake/sites`)).json()) as {
      id: string;
    }[];
    expect(after.length).toBe(before.length - 1);
    await deletedList(page).getByRole("button", { name: "Restore" }).click();
    await page.goto(paths().dashboard);
    await page.waitForLoadState("networkidle");
    await expect(overview.getByText("Not published yet")).toBeVisible();
    await overview.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(overview.getByText(/^Published · /)).toBeVisible({ timeout: 15_000 });
  });
});
