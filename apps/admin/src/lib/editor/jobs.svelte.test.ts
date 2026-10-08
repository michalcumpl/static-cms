import { validateSite } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { setJobContact } from "./jobs";
import { EditorState } from "./state.svelte";
import {
  canDuplicate,
  canInsertItem,
  deleteSelectedNode,
  duplicateSelectedNode,
  insertBlockAt,
  insertItem,
  itemLimit,
} from "./structure";
import { addJobDescription } from "./transforms";

// Jobs in the editor (jobs design decision 3).

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

const contactBlocks = ["site_1", "pages", 1, "blocks"];

function setup() {
  const editor = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p"),
  );
  const { session } = editor;
  const get = (id: string) => session.get(id) as AnyNode;
  insertBlockAt(session, contactBlocks, 0, "jobs");
  const blockId = get("page_contact").blocks.nodes[0] as string;
  const jobs = () => get(blockId).items.nodes as string[];
  const select = (index: number) => {
    session.selection = {
      type: "node",
      path: [...contactBlocks, 0, "items"],
      anchor_offset: index,
      focus_offset: index + 1,
    } as never;
  };
  return { session, get, blockId, jobs, select };
}

describe("jobs block", () => {
  it("Insert jobs: the heading in the site's language and one empty job, caret in its title", () => {
    const { session, get, blockId, jobs } = setup();
    expect(get(blockId)).toMatchObject({
      type: "jobs",
      heading: { content: "Volné pozice" },
      empty_note: { content: "" },
    });
    expect(jobs()).toHaveLength(1);
    const job = get(jobs()[0] as string);
    expect(job).toMatchObject({ type: "job", contact_email: "", contact_phone: "" });
    expect(job.body.nodes.map((id: string) => get(id).type)).toEqual(["paragraph"]);
    expect(session.selection).toMatchObject({ path: [...contactBlocks, 0, "items", 0, "title"] });
  });

  it("adds, duplicates and deletes jobs, one step each, down to none and up to twelve", () => {
    const { session, jobs, select } = setup();
    expect(insertItem(session)).toBe(true);
    expect(jobs()).toHaveLength(2);
    session.undo();
    expect(jobs()).toHaveLength(1);
    select(0);
    expect(itemLimit(session, jobs()[0] as string)).toBeUndefined();
    // Unlike a card, the last job can go: the note shows instead.
    expect(deleteSelectedNode(session)).toBe(true);
    expect(jobs()).toEqual([]);
    session.undo();
    select(0);
    expect(duplicateSelectedNode(session)).toBe(true);
    for (let i = 2; i < 12; i++) {
      select(0);
      insertItem(session);
    }
    expect(jobs()).toHaveLength(12);
    expect(canDuplicate(session, jobs()[0] as string)).toBe(false);
    select(0);
    expect(canInsertItem(session)).toBe(false);
  });

  it("gives a job without a description a paragraph to write in", () => {
    const { session, get, jobs } = setup();
    const id = jobs()[0] as string;
    session.apply(session.tr.set([id, "body"], { nodes: [], marks: [], annotations: [] }));
    const tr = session.tr;
    addJobDescription(tr, [...contactBlocks, 0, "items", 0]);
    session.apply(tr);
    expect(get(id).body.nodes).toHaveLength(1);
    expect(session.selection).toMatchObject({
      path: [...contactBlocks, 0, "items", 0, "body", 0, "content"],
    });
  });

  it("validates once the job has a title", () => {
    const { session, get, jobs } = setup();
    session.apply(
      session.tr.set([jobs()[0] as string, "title"], {
        content: "Svářeč",
        marks: [],
        annotations: [],
      }),
    );
    const problems = validateSite(session.doc).problems.filter((p) => p.severity === "error");
    expect(problems).toEqual([]);
    expect(get(jobs()[0] as string).title.content).toBe("Svářeč");
  });

  it("sets the contact, the phone normalised, and refuses what isn't an email or phone", () => {
    const { session, get, jobs } = setup();
    const id = jobs()[0] as string;
    expect(setJobContact(session, id, "contact_name", " Matěj Palouš ")).toEqual({
      ok: true,
      value: "Matěj Palouš",
    });
    expect(setJobContact(session, id, "contact_phone", "777 294 579")).toEqual({
      ok: true,
      value: "+420777294579",
    });
    expect(setJobContact(session, id, "contact_email", "pavel.boruvka")).toEqual({
      ok: false,
      reason: "email",
    });
    expect(setJobContact(session, id, "contact_phone", "volejte")).toEqual({
      ok: false,
      reason: "phone",
    });
    expect(get(id)).toMatchObject({
      contact_name: { content: "Matěj Palouš" },
      contact_phone: "+420777294579",
      contact_email: "",
    });
    session.undo();
    expect(get(id).contact_phone).toBe("");
  });
});
