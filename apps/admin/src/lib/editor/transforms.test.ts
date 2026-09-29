import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import { setImageAlt, setImageDecorative } from "./transforms";

function session() {
  return new EditorState({ document: demoSite(), version: "v1", problems: [] }).session;
}

const image = (s: ReturnType<typeof session>) =>
  s.get("image_hero") as { alt: string; decorative: boolean };

describe("image transforms", () => {
  it("sets the alt text", () => {
    const s = session();
    const tr = s.tr;
    setImageAlt(tr, "image_hero", "Chléb na pultu");
    s.apply(tr);
    expect(image(s).alt).toBe("Chléb na pultu");
  });

  it("marking an image decorative clears its alt text, and undo restores both", () => {
    const s = session();
    const tr = s.tr;
    setImageDecorative(tr, "image_hero", true);
    s.apply(tr);
    expect(image(s)).toMatchObject({ decorative: true, alt: "" });
    s.undo();
    expect(image(s)).toMatchObject({
      decorative: false,
      alt: "Bochníky kváskového chleba na dřevěném pultu",
    });
  });

  it("unmarking keeps the alt text empty for the owner to fill in", () => {
    const s = session();
    let tr = s.tr;
    setImageDecorative(tr, "image_hero", true);
    s.apply(tr);
    tr = s.tr;
    setImageDecorative(tr, "image_hero", false);
    s.apply(tr);
    expect(image(s)).toMatchObject({ decorative: false, alt: "" });
  });
});
