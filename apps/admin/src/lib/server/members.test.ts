import { beforeEach, describe, expect, it } from "vitest";
import { requireMember, requireOwner } from "./access";
import { useServices } from "./app";
import { type Db, openDatabase } from "./db/index";
import { users } from "./db/schema";
import { newId } from "./ids";
import {
  addMember,
  changeRole,
  createWorkspace,
  listMembers,
  listWorkspaces,
  projectAccess,
  removeMember,
} from "./members";
import { createProject } from "./site-documents";

let db: Db;

function user(email: string): string {
  const id = newId("u");
  db.insert(users).values({ id, email, createdAt: new Date() }).run();
  return id;
}

beforeEach(() => {
  db = openDatabase(":memory:");
  useServices({ db });
});

describe("workspaces and roles", () => {
  it("shows members only their own workspaces and projects", () => {
    const jana = user("jana@example.cz");
    const eva = user("eva@example.cz");
    const pekarna = createWorkspace(db, "Pekárna U Lípy", jana);
    const kadernictvi = createWorkspace(db, "Kadeřnictví Eva", eva);
    createProject(db, pekarna, "pekarna-ulipy.cz");
    createProject(db, kadernictvi, "kadernictvi-eva.cz");

    expect(listWorkspaces(db, jana)).toEqual([
      {
        id: pekarna,
        name: "Pekárna U Lípy",
        role: "owner",
        projects: [expect.objectContaining({ name: "pekarna-ulipy.cz" })],
      },
    ]);
  });

  it("lets an agency member see every workspace they belong to", () => {
    const michal = user("michal@agency.cz");
    const a = createWorkspace(db, "A", user("a@example.cz"));
    const b = createWorkspace(db, "B", user("b@example.cz"));
    addMember(db, a, michal, "editor");
    addMember(db, b, michal, "editor");
    expect(listWorkspaces(db, michal).map((w) => [w.name, w.role])).toEqual([
      ["A", "editor"],
      ["B", "editor"],
    ]);
  });

  it("refuses member changes by editors", () => {
    const owner = user("jana@example.cz");
    const editor = user("michal@agency.cz");
    const ws = createWorkspace(db, "Pekárna", owner);
    addMember(db, ws, editor, "editor");
    expect(changeRole(db, editor, ws, owner, "editor")).toEqual({ ok: false, reason: "forbidden" });
    expect(removeMember(db, editor, ws, owner)).toEqual({ ok: false, reason: "forbidden" });
  });

  it("always keeps at least one owner", () => {
    const owner = user("jana@example.cz");
    const ws = createWorkspace(db, "Pekárna", owner);
    expect(changeRole(db, owner, ws, owner, "editor")).toEqual({ ok: false, reason: "last-owner" });
    expect(removeMember(db, owner, ws, owner)).toEqual({ ok: false, reason: "last-owner" });

    const second = user("petr@example.cz");
    addMember(db, ws, second, "owner");
    expect(changeRole(db, owner, ws, owner, "editor")).toEqual({ ok: true });
    expect(listMembers(db, ws).map((m) => [m.email, m.role])).toEqual([
      ["jana@example.cz", "editor"],
      ["petr@example.cz", "owner"],
    ]);
  });

  it("lets owners change roles and remove members", () => {
    const owner = user("jana@example.cz");
    const editor = user("michal@agency.cz");
    const ws = createWorkspace(db, "Pekárna", owner);
    addMember(db, ws, editor, "editor");
    expect(changeRole(db, owner, ws, editor, "owner")).toEqual({ ok: true });
    expect(removeMember(db, owner, ws, editor)).toEqual({ ok: true });
    expect(removeMember(db, owner, ws, editor)).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("access to projects", () => {
  function setup() {
    const jana = user("jana@example.cz");
    const eva = user("eva@example.cz");
    const ws = createWorkspace(db, "Pekárna", jana);
    const projectId = createProject(db, ws, "pekarna");
    return { jana, eva, ws, projectId };
  }

  const event = (userId?: string, email = "x@example.cz") => ({
    locals: userId ? { user: { id: userId, email } } : {},
    url: new URL("https://admin.example.cz/p/p_1/edit/?x=1"),
  });

  const thrown = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return e as { status: number; location?: string };
    }
    return undefined;
  };

  it("sends people who aren't signed in to sign-in, and back afterwards", () => {
    const { projectId } = setup();
    expect(thrown(() => requireMember(event(), projectId))).toMatchObject({
      status: 303,
      location: "/signin?next=%2Fp%2Fp_1%2Fedit%2F%3Fx%3D1",
    });
    expect(thrown(() => requireMember(event(), projectId, { api: true }))).toMatchObject({
      status: 401,
    });
  });

  it("answers not found to non-members", () => {
    const { eva, projectId } = setup();
    expect(thrown(() => requireMember(event(eva), projectId))).toMatchObject({ status: 404 });
    expect(thrown(() => requireMember(event(eva), "p_nope"))).toMatchObject({ status: 404 });
    expect(projectAccess(db, eva, projectId)).toBeUndefined();
  });

  it("gives members the project, its workspace and their role", () => {
    const { jana, ws, projectId } = setup();
    expect(requireMember(event(jana), projectId)).toMatchObject({
      project: { id: projectId, name: "pekarna" },
      workspace: { id: ws, name: "Pekárna" },
      role: "owner",
      user: { id: jana },
    });
  });

  it("limits owner actions to owners", () => {
    const { jana, eva, ws } = setup();
    const editor = user("michal@agency.cz");
    addMember(db, ws, editor, "editor");
    expect(requireOwner(event(jana), ws)).toMatchObject({ id: jana });
    expect(thrown(() => requireOwner(event(editor), ws))).toMatchObject({ status: 403 });
    expect(thrown(() => requireOwner(event(eva), ws))).toMatchObject({ status: 404 });
  });
});
