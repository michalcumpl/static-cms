import type { Page } from "@playwright/test";
import { demoSite } from "../src/lib/server/demo";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import {
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  pageAction,
  paths,
  state,
  test,
  testDb,
} from "./fixtures";

// Groups of links in the menu, in the editor and in a browser (menu-groups).

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

/** The demo site with "Kontakt" in a menu group "Více", after "Úvod". */
function storeGroup(): void {
  const doc = demoSite() as Doc;
  const { nodes } = doc;
  nodes.group_more = {
    id: "group_more",
    type: "menu_group",
    label: text("Více"),
    items: list(["nav_contact"]),
  };
  nodes.nav_1.items = list(["nav_home", "group_more"]);
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  if (!saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "").ok) {
    throw new Error("could not store the site");
  }
}

const sidebar = (page: Page) => page.getByRole("complementary", { name: "Pages" });
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
/** The menu section of the sidebar, as text per entry; a group's links follow it indented. */
const sidebarMenu = (page: Page) =>
  sidebar(page)
    .locator("section[aria-labelledby='menu-heading'] li")
    .evaluateAll((items) =>
      items.map((i) => {
        const own = i.querySelector(":scope > .name");
        const name = (own?.querySelector("a, button") ?? own ?? i).textContent?.trim() ?? "";
        return i.closest(".in-group") ? `  ${name}` : name;
      }),
    );

test("Group four pages: add a group, move a page into it, undo", async ({ page }) => {
  await openEditor(page);
  await sidebar(page).getByRole("button", { name: "+ Group" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a group to the menu" });
  await dialog.getByRole("button", { name: "Add group" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Enter a label for the group.");
  await dialog.getByLabel("Label").fill("Více");
  await dialog.getByRole("button", { name: "Add group" }).click();
  await pageAction(page, "Kontakt", "Více");
  expect(await sidebarMenu(page)).toEqual(["Úvod", "Více", "  Kontakt"]);
  // On the canvas the group shows its name in Kontakt's place.
  await expect(canvas(page).locator(".site-nav .canvas-menu-label")).toHaveText("Více");
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  expect(await sidebarMenu(page)).toEqual(["Úvod", "Kontakt", "Více", "  No links yet."]);
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
});

test("Remove a group: its links stay in its place", async ({ page }) => {
  storeGroup();
  await openEditor(page);
  expect(await sidebarMenu(page)).toEqual(["Úvod", "Více", "  Kontakt"]);
  await pageAction(page, "Více", "Remove group (keep its links)");
  expect(await sidebarMenu(page)).toEqual(["Úvod", "Kontakt"]);
  await expect(canvas(page).locator(".canvas-menu-group")).toHaveCount(0);
});

test("Edit a group's label on the canvas", async ({ page }) => {
  storeGroup();
  await openEditor(page);
  const group = canvas(page).locator(".canvas-menu-group");
  await expect(group.locator("ul")).toBeHidden();
  await caretAtEnd(page, group.locator(".canvas-menu-label"));
  await page.keyboard.type(" info");
  await expect(group.locator(".canvas-menu-label")).toHaveText("Více info");
  await expect(group.locator("ul")).toBeVisible();
  await expect(sidebar(page).locator(".group-name")).toHaveText("Více info");
});

test.describe("in a browser", () => {
  test("Escape closes the group", async ({ page }) => {
    storeGroup();
    await page.goto(paths().preview);
    const group = page.locator(".site-nav details");
    await page.getByText("Více", { exact: true }).click();
    await expect(group).toHaveAttribute("open", "");
    await expect(group.getByRole("link", { name: "Kontakt" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(group).not.toHaveAttribute("open", "");
    await expect(page.locator("summary")).toBeFocused();
  });

  test("Click outside", async ({ page }) => {
    storeGroup();
    await page.goto(paths().preview);
    const group = page.locator(".site-nav details");
    await page.getByText("Více", { exact: true }).click();
    await expect(group).toHaveAttribute("open", "");
    await page.locator("main").click({ position: { x: 5, y: 5 } });
    await expect(group).not.toHaveAttribute("open", "");
  });

  test("Focus leaving the group closes it", async ({ page }) => {
    storeGroup();
    await page.goto(paths().preview);
    const group = page.locator(".site-nav details");
    await page.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(group).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    await expect(group.getByRole("link", { name: "Kontakt" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(group).not.toHaveAttribute("open", "");
  });
});
