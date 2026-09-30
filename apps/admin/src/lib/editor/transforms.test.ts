import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import { removeHeroImage, setHeroImage, setImageAlt, setImageDecorative } from "./transforms";

function session() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  ).session;
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

describe("hero image transforms", () => {
  const hero = (s: ReturnType<typeof session>) => s.get("hero_1") as { image: { nodes: string[] } };
  const pult = { key: "pult-3f9a2c1d", width: 4032, height: 3024 };

  it("adds an image to a hero without one, storing its key and size", () => {
    const s = session();
    removeHeroImageNow(s);
    const tr = s.tr;
    const id = setHeroImage(tr, "hero_1", pult);
    s.apply(tr);
    expect(hero(s).image.nodes).toEqual([id]);
    expect(s.get(id)).toMatchObject({
      type: "image",
      src: "pult-3f9a2c1d",
      width: 4032,
      height: 3024,
      alt: "",
      decorative: false,
    });
  });

  it("removes the hero image, and undo brings it back with its alt text", () => {
    const s = session();
    removeHeroImageNow(s);
    expect(hero(s).image.nodes).toEqual([]);
    expect(s.get("image_hero")).toBeUndefined();
    s.undo();
    expect(hero(s).image.nodes).toEqual(["image_hero"]);
    expect(image(s).alt).toBe("Bochníky kváskového chleba na dřevěném pultu");
  });

  it("replacing with a different image clears the alt text; the same image keeps it", () => {
    const s = session();
    let tr = s.tr;
    setHeroImage(tr, "hero_1", { key: "hero.png", width: 320, height: 180 });
    s.apply(tr);
    expect(image(s).alt).toBe("Bochníky kváskového chleba na dřevěném pultu");
    tr = s.tr;
    setHeroImage(tr, "hero_1", pult);
    s.apply(tr);
    expect(s.get("image_hero")).toMatchObject({ src: "pult-3f9a2c1d", alt: "", width: 4032 });
    s.undo();
    expect(s.get("image_hero")).toMatchObject({ src: "hero.png", width: 320 });
    expect(image(s).alt).toBe("Bochníky kváskového chleba na dřevěném pultu");
  });
});

function removeHeroImageNow(s: ReturnType<typeof session>) {
  const tr = s.tr;
  removeHeroImage(tr, "hero_1");
  s.apply(tr);
}
