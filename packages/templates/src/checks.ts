import {
  CARDS_LAYOUTS,
  GALLERY_IMAGE_FITS,
  HERO_LAYOUTS,
  SERVICES_LAYOUTS,
  TEAM_LAYOUTS,
} from "@webmio/model";
import { SHARED_LAYOUTS } from "./layouts.js";
import { type Template, type TemplateLooks, TOKEN_NAMES } from "./types.js";

const LENGTH = /^(0|\d+(\.\d+)?(px|rem|em|%|ch|vw|vh|cqi))$/;
const NUMBER = /^\d+(\.\d+)?$/;
const FUNCTION = /^(clamp|min|max|calc)\(([^()]*)\)$/;
const TEMPLATE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Whether a token value is safe to write into the stylesheet: a CSS length, a unitless number,
 * or `clamp`, `min`, `max` or `calc` of those (one level deep). Nothing else can appear, so the
 * value can't break out of its declaration.
 */
export function isTokenValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (LENGTH.test(value) || NUMBER.test(value)) return true;
  const fn = FUNCTION.exec(value);
  if (!fn) return false;
  const terms = (fn[2] ?? "").split(/[\s,+*/-]+/).filter((t) => t !== "");
  return terms.length > 0 && terms.every((t) => LENGTH.test(t) || NUMBER.test(t));
}

const LOOKS: { [K in keyof TemplateLooks]: readonly string[] } = {
  hero: HERO_LAYOUTS,
  services: SERVICES_LAYOUTS,
  team: TEAM_LAYOUTS,
  gallery: GALLERY_IMAGE_FITS,
  cards: CARDS_LAYOUTS,
};

/**
 * What's wrong with a template's own data, each problem naming the template (templates spec,
 * "Template checks"). Making its layouts into pages and rendering it are checked in the tests.
 */
export function templateProblems(template: Template): string[] {
  const name = `Template "${template.id}"`;
  const problems: string[] = [];
  if (!TEMPLATE_ID.test(template.id)) {
    problems.push(`${name}: the ID isn't lowercase letters, digits and dashes.`);
  }
  if (!Number.isInteger(template.release) || template.release < 1) {
    problems.push(`${name}: the release ${template.release} isn't a positive whole number.`);
  }
  for (const token of TOKEN_NAMES) {
    if (!isTokenValue(template.tokens[token])) {
      problems.push(
        `${name}: the token ${token} has the value "${template.tokens[token]}", which isn't a CSS length or number.`,
      );
    }
  }
  for (const token of Object.keys(template.tokens)) {
    if (!(TOKEN_NAMES as readonly string[]).includes(token)) {
      problems.push(`${name}: the token ${token} isn't one of the design tokens.`);
    }
  }
  for (const [block, looks] of Object.entries(LOOKS) as [
    keyof TemplateLooks,
    readonly string[],
  ][]) {
    if (!looks.includes(template.looks[block])) {
      problems.push(
        `${name}: the ${block} block's default look "${template.looks[block]}" isn't one of its looks (${looks.join(", ")}).`,
      );
    }
  }
  const ids = template.layouts.map((l) => l.id);
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) {
    problems.push(`${name}: two layouts have the ID "${id}".`);
  }
  if (SHARED_LAYOUTS.some((shared, i) => template.layouts[i] !== shared)) {
    problems.push(`${name}: the layouts must start with the shared layouts, in their order.`);
  }
  for (const [release, step] of Object.entries(template.upgrades)) {
    const n = Number(release);
    if (!Number.isInteger(n) || n < 2 || n > template.release || typeof step !== "function") {
      problems.push(
        `${name}: the upgrade step for release ${release} isn't for a release from 2 to ${template.release}.`,
      );
    }
  }
  return problems;
}
