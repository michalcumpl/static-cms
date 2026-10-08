import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../testing.js";
import { validateSite } from "./index.js";

// Groups of links in the menu (menu-groups, site-document delta).

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** The demo site with "Kontakt" in a group "Projekty", after "Úvod". */
function site() {
  const { doc, nodes } = editableDemoSite();
  nodes.group_projects = {
    id: "group_projects",
    type: "menu_group",
    label: text("Projekty"),
    items: list(["nav_contact"]),
  };
  nodes.nav_1.items = list(["nav_home", "group_projects"]);
  return { doc, nodes };
}

const problems = (doc: unknown) =>
  validateSite(doc).problems.map((p) => ({
    code: p.code,
    severity: p.severity,
    message: p.message,
  }));

describe("menu groups", () => {
  it("Projects grouped", () => {
    expect(problems(site().doc)).toEqual([]);
  });

  it("A page in a group and outside it", () => {
    const { doc, nodes } = site();
    nodes.nav_contact_2 = { ...nodes.nav_contact, id: "nav_contact_2" };
    nodes.nav_1.items = list(["nav_home", "group_projects", "nav_contact_2"]);
    expect(problems(doc)).toEqual([
      {
        code: "duplicate-menu-item",
        severity: "warning",
        message: '"Kontakt" is in the menu more than once.',
      },
    ]);
  });

  it("Group without a label or links", () => {
    const { doc, nodes } = site();
    nodes.group_projects.label = text(" ");
    nodes.group_empty = {
      id: "group_empty",
      type: "menu_group",
      label: text("Výroba"),
      items: list(),
    };
    nodes.nav_1.items = list(["nav_home", "group_projects", "group_empty"]);
    expect(problems(doc)).toEqual(
      expect.arrayContaining([
        { code: "empty-link-label", severity: "error", message: "A menu group needs a label." },
        {
          code: "empty-menu-group",
          severity: "warning",
          message: 'The menu group "Výroba" has no links, so it isn\'t shown.',
        },
      ]),
    );
    expect(problems(doc)).toHaveLength(2);
  });

  it("Group inside a group", () => {
    const { doc, nodes } = site();
    nodes.group_inner = {
      id: "group_inner",
      type: "menu_group",
      label: text("Uvnitř"),
      items: list(),
    };
    nodes.group_projects.items = list(["nav_contact", "group_inner"]);
    expect(validateSite(doc).valid).toBe(false);
  });
});
