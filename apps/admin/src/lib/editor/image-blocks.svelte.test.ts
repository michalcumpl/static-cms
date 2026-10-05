import { siteSchema } from "@webmio/site";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { imageBlocksSite } from "$lib/server/demo";
import { nodeComponents } from "./config";
import { EditorState } from "./state.svelte";
import {
  addItemsWithImages,
  logoNameFor,
  removeImage,
  setImage,
  setImageSide,
  setLogoLink,
} from "./transforms";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function session(): Session {
  return new EditorState(
    { document: imageBlocksSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  ).session;
}
const node = (s: Session, id: string) => s.get(id) as AnyNode;
function apply(s: Session, change: (tr: Session["tr"]) => unknown) {
  const tr = s.tr;
  const result = change(tr);
  s.apply(tr);
  return result;
}

describe("image side", () => {
  it("moves the image to the other side, undoably", () => {
    const s = session();
    apply(s, (tr) => setImageSide(tr, "twi_voucher", "right"));
    expect(node(s, "twi_voucher").image_side).toBe("right");
    s.undo();
    expect(node(s, "twi_voucher").image_side).toBe("left");
  });
});

describe("logo link", () => {
  it("links a logo to an address, and undo removes it again", () => {
    const s = session();
    apply(s, (tr) => setLogoLink(tr, "logo_p6", { address: " https://praha6.example " }));
    expect(node(s, "logo_p6")).toMatchObject({ page_id: "", url: "https://praha6.example" });
    s.undo();
    expect(node(s, "logo_p6")).toMatchObject({ page_id: "page_contact", url: "" });
  });

  it("links a logo to a page, or removes its link", () => {
    const s = session();
    apply(s, (tr) => setLogoLink(tr, "logo_harmonie", { page: "page_home" }));
    expect(node(s, "logo_harmonie")).toMatchObject({ page_id: "page_home", url: "" });
    apply(s, (tr) => setLogoLink(tr, "logo_harmonie", null));
    expect(node(s, "logo_harmonie")).toMatchObject({ page_id: "", url: "" });
  });

  it("refuses an unsafe address and leaves the logo alone", () => {
    const s = session();
    const before = s.doc;
    const tr = s.tr;
    const result = setLogoLink(tr, "logo_harmonie", { address: "javascript:alert(1)" });
    expect(result.ok).toBe(false);
    expect(tr.ops).toEqual([]);
    expect(s.doc).toBe(before);
  });
});

describe("images of other blocks", () => {
  const photo = { key: "dilna-1a2b3c4d", width: 1200, height: 900 };

  it("gives a text with image block an image, and takes it away", () => {
    const s = session();
    apply(s, (tr) => removeImage(tr, "twi_voucher"));
    expect(node(s, "twi_voucher").image.nodes).toEqual([]);
    const id = apply(s, (tr) => setImage(tr, "twi_voucher", photo)) as string;
    expect(node(s, id)).toMatchObject({ src: "dilna-1a2b3c4d", alt: "", decorative: false });
  });

  it("adds a person's portrait as decorative", () => {
    const s = session();
    const id = apply(s, (tr) =>
      setImage(tr, "person_martina", photo, { decorative: true }),
    ) as string;
    expect(node(s, "person_martina").image.nodes).toEqual([id]);
    expect(node(s, id)).toMatchObject({ decorative: true, alt: "" });
  });
});

describe("node components", () => {
  it("has a canvas component for every node type of the schema shown on the canvas", () => {
    // The theme is never on the canvas; it is the stylesheet. The business details are edited
    // in the business settings; the canvas shows them through the contact and hours blocks.
    // Item references and social profiles aren't drawn as nodes: blocks show the items they
    // point at, and the footer shows the profiles from the business details.
    const offCanvas = ["theme", "business", "opening_day", "time_range", "item_ref", "social_link"];
    const missing = Object.keys(siteSchema).filter(
      (type) => !offCanvas.includes(type) && !(type in nodeComponents),
    );
    expect(missing).toEqual([]);
  });
});

describe("adding several images at once", () => {
  const images = [
    { key: "a-11111111", width: 800, height: 600, originalName: "a.jpg" },
    { key: "b-22222222", width: 800, height: 600, originalName: "b.jpg" },
    { key: "c-33333333", width: 800, height: 600, originalName: "c.jpg" },
  ];

  it("adds gallery photos in order, and one undo removes them all", () => {
    const s = session();
    const before = node(s, "gallery_work").items.nodes as string[];
    const added = apply(s, (tr) => addItemsWithImages(tr, "gallery_work", images)) as string[];
    expect(node(s, "gallery_work").items.nodes).toEqual([...before, ...added]);
    expect(added.map((id) => node(s, node(s, id).image.nodes[0]).src)).toEqual([
      "a-11111111",
      "b-22222222",
      "c-33333333",
    ]);
    expect(node(s, added[0] as string).caption.content).toBe("");
    s.undo();
    expect(node(s, "gallery_work").items.nodes).toEqual(before);
    for (const id of added) expect(s.get(id)).toBeUndefined();
  });

  it("adds people with a placeholder name and a decorative portrait", () => {
    const s = session();
    const [id] = apply(s, (tr) => addItemsWithImages(tr, "team_1", images.slice(0, 1))) as string[];
    const person = node(s, id as string);
    expect(person.name.content).toBe("Jméno");
    expect(node(s, person.image.nodes[0])).toMatchObject({ decorative: true, alt: "" });
    expect(node(s, "site_1").team.nodes.at(-1)).toBe(id);
  });

  it("adds people to a team block showing chosen people, too", () => {
    const s = session();
    const tr = s.tr;
    tr.set(["team_1", "show"], "chosen");
    s.apply(tr);
    const [id] = apply(s, (tr) => addItemsWithImages(tr, "team_1", images.slice(0, 1))) as string[];
    const refs = node(s, "team_1").chosen.nodes as string[];
    expect(node(s, refs.at(-1) as string).item_id).toBe(id);
  });

  it("names logos after their files", () => {
    const s = session();
    const added = apply(s, (tr) =>
      addItemsWithImages(tr, "logos_1", [
        { key: "harmonie.webp", width: 78, height: 51, originalName: "harmonie.webp" },
        { key: "p6-44444444", width: 78, height: 89, originalName: "P6 logo.png" },
      ]),
    ) as string[];
    expect(added.map((id) => node(s, id).name.content)).toEqual(["harmonie", "P6 logo"]);
    expect(logoNameFor({ key: "x.webp", width: 1, height: 1 })).toBe("x");
  });
});
