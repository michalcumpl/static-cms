import type * as CssTree from "css-tree";
// The self-contained bundle: the package's main entry reads JSON files at run time, which breaks
// once the admin's server is bundled.
import * as bundled from "css-tree/dist/csstree.esm";

const csstree = bundled as typeof CssTree;

// What the importer reads from stylesheets (site-import design decisions 2 and 6): background
// photos, colours and fonts. Parsing is tolerant: a broken rule is skipped, never fatal.

export interface CssDeclaration {
  /** The rule's selector list as written, `""` for an inline style. */
  selector: string;
  property: string;
  value: string;
  /** `url(…)` values in the declaration. */
  urls: string[];
}

function declarationsOf(ast: CssTree.CssNode, selector: string, out: CssDeclaration[]): void {
  csstree.walk(ast, {
    visit: "Declaration",
    enter(node: CssTree.Declaration) {
      const urls: string[] = [];
      csstree.walk(node.value, {
        visit: "Url",
        enter(url: CssTree.Url) {
          urls.push(url.value);
        },
      });
      out.push({
        selector,
        property: node.property.toLowerCase(),
        value: csstree.generate(node.value),
        urls,
      });
    },
  });
}

/** Every declaration of a stylesheet, with the selector of its rule; at-rules' rules included. */
export function cssDeclarations(css: string): CssDeclaration[] {
  const out: CssDeclaration[] = [];
  let ast: CssTree.CssNode;
  try {
    ast = csstree.parse(css, { parseValue: true, parseRulePrelude: false });
  } catch {
    return out;
  }
  csstree.walk(ast, {
    visit: "Rule",
    enter(rule: CssTree.Rule) {
      const selector = csstree.generate(rule.prelude).trim();
      declarationsOf(rule.block, selector, out);
    },
  });
  return out;
}

/** The declarations of a `style` attribute. */
export function inlineDeclarations(style: string): CssDeclaration[] {
  const out: CssDeclaration[] = [];
  try {
    declarationsOf(csstree.parse(style, { context: "declarationList" }), "", out);
  } catch {
    // An unreadable style attribute adds nothing.
  }
  return out;
}

/** The background images of rules: their selectors and image addresses. */
export function backgroundImages(css: string): { selector: string; url: string }[] {
  return cssDeclarations(css)
    .filter((d) => d.property === "background" || d.property === "background-image")
    .flatMap((d) => d.urls.map((url) => ({ selector: d.selector, url })));
}

/**
 * The background images of rules, with whether a rule with the same selector sizes it to cover
 * its element: a photo filling a panel rather than an icon or a pattern.
 */
export function backgroundRules(css: string): { selector: string; url: string; cover: boolean }[] {
  const declarations = cssDeclarations(css);
  const covered = new Set(
    declarations
      .filter(
        (d) =>
          (d.property === "background-size" || d.property === "background") &&
          /\bcover\b/.test(d.value),
      )
      .map((d) => d.selector),
  );
  return declarations
    .filter((d) => d.property === "background" || d.property === "background-image")
    .flatMap((d) =>
      d.urls.map((url) => ({ selector: d.selector, url, cover: covered.has(d.selector) })),
    );
}
