import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { projects, versions } from "./db/schema";
import {
  createSetup,
  finishSetup,
  readSetup,
  saveStep,
  setupPhone,
  setupUnfinished,
} from "./setup";
import { readSite } from "./site-documents";
import { useTestProject } from "./test-project";

// The guided setup's answers, kept step by step, and finishing (guided-setup spec).

const project = useTestProject();

function cafe() {
  const { db, workspaceId, owner } = project();
  const created = createSetup(db, {
    workspaceId,
    userId: owner.id,
    locale: "cs",
    type: "cafe",
    name: "Kavárna U Mostu",
    sentence: "Výběrová káva a domácí dorty u Karlova mostu.",
  });
  if (!created.ok) throw new Error("not created");
  return created.projectId;
}

const contact = (hours: Record<string, [string, string][]> = {}, phone = "777 123 456") => ({
  step: 3 as const,
  phone,
  email: "ahoj@kavarnaumostu.cz",
  street: "Mostecká 12",
  postal_code: "118 00",
  city: "Praha",
  hours,
});

describe("the guided setup", () => {
  it("The first step: the project, with the starter site, and step 2 next", () => {
    const { db } = project();
    const projectId = cafe();
    expect(db.select().from(projects).where(eq(projects.id, projectId)).get()?.name).toBe(
      "Kavárna U Mostu",
    );
    expect(readSetup(db, projectId)).toEqual({
      answers: {
        type: "cafe",
        name: "Kavárna U Mostu",
        sentence: "Výběrová káva a domácí dorty u Karlova mostu.",
      },
      step: 2,
      finished: false,
    });
    expect(setupUnfinished(db, projectId)).toBe(true);
  });

  it("refuses a first step without a type or name", () => {
    const { db, workspaceId, owner } = project();
    const created = createSetup(db, {
      workspaceId,
      userId: owner.id,
      locale: "cs",
      type: "spaceship",
      name: " ",
      sentence: "",
    });
    expect(created).toEqual({
      ok: false,
      errors: {
        type: expect.objectContaining({ key: "setup.errors.type" }),
        name: expect.objectContaining({ key: "setup.errors.name" }),
      },
    });
  });

  it("A wrong answer: closing before opening, and a bad phone, keep the step open", () => {
    const { db } = project();
    const projectId = cafe();
    const result = saveStep(db, projectId, contact({ mon: [["18:00", "09:00"]] }, "12"), "cs");
    expect(result).toEqual({
      ok: false,
      errors: {
        phone: expect.objectContaining({ key: "setup.errors.phone" }),
        "hours.mon": expect.objectContaining({ key: "setup.errors.closing" }),
      },
    });
    expect(readSetup(db, projectId)?.step).toBe(2);
  });

  it("keeps each step's answers and moves on, a Czech phone getting +420", () => {
    const { db } = project();
    const projectId = cafe();
    expect(saveStep(db, projectId, { step: 2, template: "standard" }, "cs")).toEqual({ ok: true });
    expect(
      saveStep(db, projectId, contact({ mon: [["08:00", "18:00"]], tue: [["", ""]] }), "cs").ok,
    ).toBe(true);
    // A step left empty moves on too.
    expect(
      saveStep(
        db,
        projectId,
        { step: 4, services: [{ name: "", description: "", price: "" }] },
        "cs",
      ).ok,
    ).toBe(true);
    const setup = readSetup(db, projectId);
    expect(setup?.step).toBe(5);
    expect(setup?.answers).toMatchObject({
      template: "standard",
      contact: { phone: "+420777123456", hours: { mon: [["08:00", "18:00"]] } },
      services: [],
    });
    // Going back to an earlier step doesn't move the next step back.
    expect(saveStep(db, projectId, { step: 2, template: "standard" }, "cs").ok).toBe(true);
    expect(readSetup(db, projectId)?.step).toBe(5);
    expect(setupPhone("+421 905 123 456", "cs")).toBe("+421905123456");
  });

  it("finishes with one new version, and takes nothing more", () => {
    const { db, owner } = project();
    const projectId = cafe();
    saveStep(db, projectId, contact({ mon: [["08:00", "18:00"]] }), "cs");
    saveStep(db, projectId, { step: 6, pages: ["services", "contact"] }, "cs");
    const before = db.select().from(versions).all().length;
    expect(finishSetup(db, projectId, owner.id).ok).toBe(true);
    expect(db.select().from(versions).all()).toHaveLength(before + 1);
    const doc = readSite(db, projectId)?.document as {
      document_id: string;
      nodes: Record<string, { type: string; title?: string; pages?: { nodes: string[] } }>;
    };
    const pages = doc.nodes[doc.document_id]?.pages?.nodes.map((id) => doc.nodes[id]?.title);
    expect(pages).toEqual(["Úvod", "Služby", "Kontakt"]);
    expect(setupUnfinished(db, projectId)).toBe(false);
    expect(finishSetup(db, projectId, owner.id)).toEqual({ ok: false, reason: "finished" });
    expect(saveStep(db, projectId, { step: 2, template: "standard" }, "cs").ok).toBe(false);
  });
});
