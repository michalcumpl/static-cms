import { validateSite } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { addItem, collectionView, pageCollections } from "./collections";
import {
  addCategory,
  addFact,
  addressFromName,
  categoryUse,
  collectionsListedOn,
  deleteCategory,
  listingPageChoices,
  setListingPage,
  setProjectCategory,
  setProjectsCategory,
  setProjectsLimit,
  setString,
} from "./item-pages";
import { deletePage } from "./pages";
import { EditorState } from "./state.svelte";
import { duplicateSelectedNode, insertBlockAt } from "./structure";

// Item pages, projects and categories in the editor (collection-pages design decision 6).

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** The demo site with categories "Výstavy" and "Eventy" and projects named `names`. */
function setup(names: string[] = ["Designblok", "PETROF 160", "Designblok"]) {
  const document = demoSite() as { nodes: AnyNode };
  const { nodes } = document;
  nodes.category_vystavy = {
    id: "category_vystavy",
    type: "project_category",
    name: text("Výstavy"),
  };
  nodes.category_eventy = { id: "category_eventy", type: "project_category", name: text("Eventy") };
  nodes.site_1.project_categories = list(["category_vystavy", "category_eventy"]);
  const ids = names.map((name, i) => {
    const id = `project_${i + 1}`;
    nodes[`cover_${i + 1}`] = { ...nodes.image_hero, id: `cover_${i + 1}` };
    nodes[id] = {
      id,
      type: "project",
      name: text(name),
      category_id: i === 1 ? "category_eventy" : "category_vystavy",
      summary: text(""),
      body: list(),
      facts: list(),
      cover: list([`cover_${i + 1}`]),
      photos: list(),
      video_url: "",
      slug: "",
    };
    return id;
  });
  nodes.site_1.projects = list(ids);
  const editor = new EditorState({ document, version: "v1", problems: [] }, projectPaths("p"));
  const { session } = editor;
  const get = (id: string) => session.get(id) as AnyNode;
  const errors = () => validateSite(session.doc).problems.filter((p) => p.severity === "error");
  return { editor, session, get, errors };
}

describe("item pages", () => {
  it("gives every item an address from its name when pages are turned on, as one step", () => {
    const { session, get, errors } = setup();
    setListingPage(session, "site_1", "projects", "page_contact");
    expect(get("site_1").projects_page_id).toBe("page_contact");
    expect(["project_1", "project_2", "project_3"].map((id) => get(id).slug)).toEqual([
      "designblok",
      "petrof-160",
      "designblok-2",
    ]);
    expect(errors()).toEqual([]);
    session.undo();
    expect(get("site_1").projects_page_id).toBe("");
    expect(get("project_1").slug).toBe("");
  });

  it("Address already taken", () => {
    const { session, get } = setup(["Designblok", "Designblok"]);
    setListingPage(session, "site_1", "projects", "page_contact");
    expect([get("project_1").slug, get("project_2").slug]).toEqual(["designblok", "designblok-2"]);
  });

  it("keeps addresses when pages are turned off, and doesn't touch given ones", () => {
    const { session, get } = setup();
    setString(session, "project_2", "slug", "petrof");
    setListingPage(session, "site_1", "projects", "page_contact");
    setListingPage(session, "site_1", "projects", "");
    expect(get("project_2").slug).toBe("petrof");
    expect(get("project_1").slug).toBe("designblok");
  });

  it("Home page not offered", () => {
    const { session, get } = setup();
    const home = get("site_1").home_page_id;
    expect(listingPageChoices(session.doc as never)).not.toContain(home);
    expect(listingPageChoices(session.doc as never)).toContain("page_contact");
  });

  it("makes a new item's address from its name, following it until changed", () => {
    const { session, get } = setup();
    setListingPage(session, "site_1", "projects", "page_contact");
    const view = collectionView(session.doc as never, "projects");
    addItem(session, "site_1", view);
    const id = get("site_1").projects.nodes.at(-1);
    expect(get(id).slug).toBe("");
    const tr = session.tr;
    tr.set([id, "name"], text("Kia E-Salon"));
    session.apply(tr);
    const made = addressFromName(session, "site_1", "projects", id);
    expect(get(id).slug).toBe("kia-e-salon");
    // It follows the name while it is the one made from it…
    const more = session.tr;
    more.set([id, "name"], text("Kia E-Salon 2024"));
    session.apply(more);
    expect(addressFromName(session, "site_1", "projects", id, made)).toBe("kia-e-salon-2024");
    // …and stops once the owner changes it.
    setString(session, id, "slug", "kia");
    expect(addressFromName(session, "site_1", "projects", id, "kia-e-salon-2024")).toBeUndefined();
    expect(get(id).slug).toBe("kia");
  });

  it("deleting the listing page turns item pages off in the same step", () => {
    const { session, get } = setup();
    setListingPage(session, "site_1", "projects", "page_contact");
    expect(collectionsListedOn(session.doc as never, "page_contact")).toEqual(["projects"]);
    deletePage(session, "page_contact");
    expect(get("site_1").projects_page_id).toBe("");
    session.undo();
    expect(get("site_1").projects_page_id).toBe("page_contact");
    expect(get("site_1").pages.nodes).toContain("page_contact");
  });
});

describe("categories", () => {
  it("Delete a category: its projects and blocks show none, in one step", () => {
    const { session, get, errors } = setup();
    insertBlockAt(session, ["site_1", "pages", 1, "blocks"], 0, "projects");
    const blockId = get("page_contact").blocks.nodes[0];
    setProjectsCategory(session, blockId, "category_vystavy");
    expect(categoryUse(session.doc as never, "category_vystavy")).toEqual({
      projects: 2,
      blocks: 1,
    });
    deleteCategory(session, "site_1", "category_vystavy");
    expect(get("site_1").project_categories.nodes).toEqual(["category_eventy"]);
    expect(get("project_1").category_id).toBe("");
    expect(get(blockId).category_id).toBe("");
    expect(errors()).toEqual([]);
    session.undo();
    expect(get("project_1").category_id).toBe("category_vystavy");
    expect(get(blockId).category_id).toBe("category_vystavy");
  });

  it("adds a category and puts a project in it", () => {
    const { session, get } = setup();
    const id = addCategory(session, "site_1");
    expect(get("site_1").project_categories.nodes.at(-1)).toBe(id);
    setProjectCategory(session, "project_1", id);
    expect(get("project_1").category_id).toBe(id);
  });

  it("adds an empty fact", () => {
    const { session, get } = setup();
    const id = addFact(session, "project_1");
    expect(get("project_1").facts.nodes).toEqual([id]);
    expect(get(id)).toMatchObject({ type: "fact", label: { content: "" }, value: { content: "" } });
  });
});

describe("projects block", () => {
  it("starts showing every project of every category", () => {
    const { session, get, errors } = setup();
    insertBlockAt(session, ["site_1", "pages", 1, "blocks"], 0, "projects");
    const block = get(get("page_contact").blocks.nodes[0]);
    expect(block).toMatchObject({ type: "projects", show: "all", category_id: "", limit: 0 });
    expect(errors()).toEqual([]);
  });

  it("Category page: the canvas shows one category, and one undo shows all again", () => {
    const { session, get } = setup();
    insertBlockAt(session, ["site_1", "pages", 1, "blocks"], 0, "projects");
    const blockId = get("page_contact").blocks.nodes[0];
    const shown = () =>
      pageCollections(session.doc as never, get("page_contact").blocks.nodes)[0]?.items.map(
        (i) => i.itemId,
      );
    setProjectsCategory(session, blockId, "category_vystavy");
    expect(shown()).toEqual(["project_1", "project_3"]);
    session.undo();
    expect(shown()).toEqual(["project_1", "project_2", "project_3"]);
  });

  it("Latest work: limits the tiles, as one step, and keeps the setting when duplicated", () => {
    const { session, get } = setup();
    insertBlockAt(session, ["site_1", "pages", 1, "blocks"], 0, "projects");
    const blockId = get("page_contact").blocks.nodes[0];
    setProjectsLimit(session, blockId, 2);
    const views = pageCollections(session.doc as never, get("page_contact").blocks.nodes);
    expect(views[0]?.items.map((i) => i.itemId)).toEqual(["project_1", "project_2"]);
    expect(views[0]?.wholeList).toBe(false);
    session.selection = {
      type: "node",
      path: ["site_1", "pages", 1, "blocks"],
      anchor_offset: 0,
      focus_offset: 1,
    } as never;
    expect(duplicateSelectedNode(session)).toBe(true);
    expect(get(get("page_contact").blocks.nodes[1])).toMatchObject({ type: "projects", limit: 2 });
    session.undo();
    session.undo();
    expect(get(blockId).limit).toBe(0);
  });
});
