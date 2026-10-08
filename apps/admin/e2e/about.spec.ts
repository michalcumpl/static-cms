import type { Page } from "@playwright/test";
import { demoSite } from "../src/lib/server/demo";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import {
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  openLists,
  paths,
  saveSettings,
  state,
  test,
  testDb,
} from "./fixtures";

// The About you section (offer-and-about): the people and the testimonials as list forms.

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const text = (content: string) => ({ content, marks: [], annotations: [] });

const item = (page: Page, name: string | RegExp) => page.getByRole("group", { name });
const people = (page: Page) => page.getByRole("region", { name: "People" });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });

/**
 * "Kontakt" gets a team block showing all people. With `jana`, the team has Jana Nováková with a
 * portrait (the hero's photo), and the home page a team block that chose her.
 */
function storeTeam(options: { jana?: boolean } = {}): void {
  const doc = demoSite() as Doc;
  const site = doc.nodes[doc.document_id];
  doc.nodes.team_all = {
    id: "team_all",
    type: "team",
    layout: "cards",
    heading: text("Náš tým"),
    show: "all",
    chosen: list([]),
  };
  doc.nodes.page_contact.blocks.nodes.push("team_all");
  if (options.jana) {
    const heroImage = doc.nodes[doc.nodes.hero_1.image.nodes[0]];
    doc.nodes.portrait_jana = { ...heroImage, id: "portrait_jana", alt: "", decorative: true };
    doc.nodes.person_jana = {
      id: "person_jana",
      type: "person",
      name: text("Jana Nováková"),
      role: text("Pekařka"),
      text: text(""),
      image: list(["portrait_jana"]),
    };
    site.team = list(["person_jana"]);
    doc.nodes.ref_jana = { id: "ref_jana", type: "item_ref", item_id: "person_jana" };
    doc.nodes.team_pick = {
      id: "team_pick",
      type: "team",
      layout: "cards",
      heading: text("Kdo peče"),
      show: "chosen",
      chosen: list(["ref_jana"]),
    };
    doc.nodes.page_home.blocks.nodes.push("team_pick");
  }
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "");
  if (!result.ok) throw new Error("could not store the site");
}

function stored(): Doc {
  return (readSite(testDb(), state().projectId) as { document: Doc }).document;
}

test("Add a person with a portrait", async ({ page }) => {
  storeTeam();
  await openLists(page, "about");
  await people(page).getByRole("button", { name: "Add a person" }).click();
  await page.keyboard.type("Jana Nováková");
  const jana = item(page, "Person 1: Jana Nováková");
  await jana
    .getByRole("group", { name: "Portrait" })
    .getByRole("button", { name: "Choose…" })
    .click();
  await library(page).getByRole("option").first().click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await expect(jana.locator("img")).toBeVisible();
  await jana.getByLabel(/Decorative/).uncheck();
  await jana.getByLabel(/Description/).click();
  await page.keyboard.type("Jana u pecee");
  await page.keyboard.press("Backspace");
  await expect(jana.getByLabel(/Description/)).toHaveValue("Jana u pece");
  await saveSettings(page);

  const doc = stored();
  const [personId] = doc.nodes[doc.document_id].team.nodes;
  const portrait = doc.nodes[doc.nodes[personId].image.nodes[0]];
  expect(portrait).toMatchObject({ alt: "Jana u pece", decorative: false });

  await openEditor(page, paths().edit("page_contact"));
  const person = canvas(page).locator(".person", { hasText: "Jana Nováková" });
  await expect(person.locator("img")).toHaveAttribute("alt", "Jana u pece");
});

test("Duplicate a person", async ({ page }) => {
  storeTeam({ jana: true });
  await openLists(page, "about");
  await item(page, /^Person 1/)
    .getByRole("button", { name: "Duplicate" })
    .click();
  const copy = item(page, "Person 2: Jana Nováková");
  await expect(copy.getByRole("textbox", { name: "Role (optional)" })).toHaveText("Pekařka");
  await expect(copy.locator("img")).toBeVisible();
  await saveSettings(page);

  const doc = stored();
  const team = doc.nodes[doc.document_id].team.nodes;
  expect(team).toHaveLength(2);
  expect(doc.nodes[team[1]].image.nodes[0]).not.toBe("portrait_jana");
  expect(doc.nodes.team_pick.chosen.nodes).toEqual(["ref_jana"]);
});

test("remove a portrait, and undo it", async ({ page }) => {
  storeTeam({ jana: true });
  await openLists(page, "about");
  const jana = item(page, /^Person 1/);
  await jana.getByRole("button", { name: "Remove" }).click();
  await expect(jana.locator("img")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(jana.locator("img")).toBeVisible();
});

test("add a testimonial", async ({ page }) => {
  await openLists(page, "about");
  const testimonials = page.getByRole("region", { name: "Testimonials" });
  await expect(testimonials).toContainText("No page shows this list yet.");
  await testimonials.getByRole("button", { name: "Add a testimonial" }).click();
  await page.keyboard.type("Nejlepší chleba v okolí.");
  const first = item(page, /^Testimonial 1/);
  await caretAtEnd(page, first.getByRole("textbox", { name: "Name" }));
  await page.keyboard.type("Petr");
  await expect(item(page, "Testimonial 1: Petr")).toBeVisible();
  await saveSettings(page);
  const doc = stored();
  const [id] = doc.nodes[doc.document_id].testimonials.nodes;
  expect(doc.nodes[id].quote.content).toBe("Nejlepší chleba v okolí.");
});
