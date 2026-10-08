import type { Page } from "@playwright/test";
import { demoSite } from "../src/lib/server/demo";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import { canvas, caretAtEnd, expect, openEditor, paths, state, test, testDb } from "./fixtures";

// The hero slideshow in the editor and in a browser (hero-slideshow).

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const handle = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const actions = (page: Page) => page.getByRole("menu", { name: / actions$/ });
const look = (page: Page) => page.getByRole("group", { name: "Look" });

const clip = (n: number) =>
  `https://player.vimeo.com/progressive_redirect/playback/${n}/rendition/1080p/file.mp4`;

/** The demo site with its hero a slideshow of `count` slides; projects listed on "Kontakt". */
function storeSlideshow(count = 3, withClips = false): void {
  const doc = demoSite() as Doc;
  const { nodes } = doc;
  nodes.project_race = {
    id: "project_race",
    type: "project",
    name: text("Poslední závod"),
    category_id: "",
    summary: text(""),
    body: list([]),
    facts: list([]),
    cover: list([]),
    photos: list([]),
    video_url: "",
    slug: "posledni-zavod",
  };
  nodes.site_1.projects = list(["project_race"]);
  nodes.site_1.projects_page_id = "page_contact";
  const ids = Array.from({ length: count }, (_, i) => {
    const id = `slide_${i + 1}`;
    nodes[`slide_img_${i + 1}`] = { ...nodes.image_hero, id: `slide_img_${i + 1}` };
    nodes[id] = {
      id,
      type: "slide",
      image: list([`slide_img_${i + 1}`]),
      title: text(`Snímek ${i + 1}`),
      clip_url: withClips ? clip(i + 1) : "",
      target_id: "",
      url: "",
    };
    return id;
  });
  Object.assign(nodes.hero_1, { layout: "slideshow", slides: list(ids) });
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  if (!saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "").ok) {
    throw new Error("could not store the site");
  }
}

test("Make the hero a slideshow", async ({ page }) => {
  await openEditor(page);
  const hero = canvas(page).locator("section.hero");
  await caretAtEnd(page, hero.locator("h1"));
  await look(page).getByRole("radio", { name: "Slideshow" }).check();
  await expect(hero).toHaveClass(/hero-slideshow/);
  await expect(hero.locator(".slide")).toHaveCount(2);
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(hero).not.toHaveClass(/hero-slideshow/);
  await expect(hero.locator(".slide")).toHaveCount(0);
});

test("Ninth slide", async ({ page }) => {
  storeSlideshow(8);
  await openEditor(page);
  await canvas(page).locator(".slide-title").first().click();
  await handle(page, "Slide 1").click();
  const duplicate = actions(page).getByRole("menuitem", { name: "Duplicate" });
  await expect(duplicate).toHaveAttribute("aria-disabled", "true");
  await expect(duplicate).toContainText("A slideshow holds at most eight slides");
});

test("Link a slide to a project", async ({ page }) => {
  storeSlideshow(2);
  await openEditor(page);
  await canvas(page).locator(".slide-title").first().click();
  const panel = page.getByRole("region", { name: "Slide" });
  await panel.getByLabel("A project or service").check();
  await panel
    .getByRole("combobox", { name: "Project or service" })
    .selectOption({ label: "Poslední závod" });
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
  const home = await (await page.request.get(paths().preview)).text();
  expect(home).toMatch(
    /<p class="slide-title"><a href="[^"]*kontakt\/posledni-zavod\/">Snímek 1<\/a><\/p>/,
  );
});

test("Add a clip", async ({ page }) => {
  storeSlideshow(2);
  await openEditor(page);
  await canvas(page).locator(".slide-title").first().click();
  const panel = page.getByRole("region", { name: "Slide" });
  const address = panel.getByLabel("Clip (MP4 file on Vimeo, optional)");
  await address.fill("https://vimeo.com/697475416");
  await address.press("Enter");
  await expect(panel.getByRole("alert")).toHaveText("Paste the address of an MP4 file on Vimeo.");
  await address.fill(clip(1211966340));
  await address.press("Enter");
  await expect(panel.getByText("loaded from Vimeo when the page opens")).toBeVisible();
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
  const home = await (await page.request.get(paths().preview)).text();
  expect(home).toContain(
    `<video class="slide-clip" muted playsinline preload="none" aria-hidden="true" data-src="${clip(1211966340)}">`,
  );
});

test.describe("in a browser", () => {
  const current = (page: Page) =>
    page.locator(".slideshow-dot[aria-current='true']").getAttribute("aria-label");

  test("advances every six seconds, and the controls move it", async ({ page }) => {
    storeSlideshow(3);
    await page.clock.install();
    await page.goto(paths().preview);
    await expect(page.locator(".slideshow-controls")).toBeVisible();
    expect(await current(page)).toBe("Snímek 1");
    // Slides other than the current one are inert.
    await expect(page.locator(".slide").nth(1)).toHaveAttribute("inert", "");
    await page.clock.runFor(6500);
    expect(await current(page)).toBe("Snímek 2");
    await page.getByRole("button", { name: "Předchozí snímek" }).click();
    expect(await current(page)).toBe("Snímek 1");
    await page.getByRole("button", { name: "Snímek 3" }).click();
    expect(await current(page)).toBe("Snímek 3");
    await page.getByRole("button", { name: "Pozastavit" }).click();
    await page.mouse.move(0, 0);
    await page.locator("h1").focus();
    await page.clock.runFor(13000);
    expect(await current(page)).toBe("Snímek 3");
    await expect(page.getByRole("button", { name: "Přehrát" })).toBeVisible();
  });

  test("Pause on focus", async ({ page }) => {
    storeSlideshow(3);
    await page.clock.install();
    await page.goto(paths().preview);
    await page.getByRole("button", { name: "Další snímek" }).focus();
    await page.clock.runFor(13000);
    expect(await current(page)).toBe("Snímek 1");
  });

  test("Reduced motion", async ({ page }) => {
    storeSlideshow(3);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto(paths().preview);
    await expect(page.getByRole("button", { name: "Přehrát" })).toBeVisible();
    await page.clock.runFor(13000);
    expect(await current(page)).toBe("Snímek 1");
    await page.getByRole("button", { name: "Další snímek" }).click();
    expect(await current(page)).toBe("Snímek 2");
  });

  /** Records the clips the page asks Vimeo for, answering with nothing (the test stays offline). */
  async function recordClips(page: Page): Promise<string[]> {
    const asked: string[] = [];
    await page.route(/player\.vimeo\.com/, (route) => {
      asked.push(route.request().url());
      return route.fulfill({ status: 404, body: "" });
    });
    return asked;
  }

  test("Clips load only when shown", async ({ page }) => {
    storeSlideshow(3, true);
    const asked = await recordClips(page);
    await page.goto(paths().preview);
    await expect.poll(() => asked).toEqual([clip(1)]);
    // The next slide's clip loads when that slide shows.
    await page.getByRole("button", { name: "Další snímek" }).click();
    await expect.poll(() => asked).toEqual([clip(1), clip(2)]);
  });

  test("Reduced motion: no clip is requested", async ({ page }) => {
    storeSlideshow(3, true);
    const asked = await recordClips(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(paths().preview);
    await expect(page.getByRole("button", { name: "Přehrát" })).toBeVisible();
    await page.getByRole("button", { name: "Další snímek" }).click();
    await page.waitForTimeout(500);
    expect(asked).toEqual([]);
  });
});
