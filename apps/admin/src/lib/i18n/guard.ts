import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "svelte/compiler";

// Finds interface text written outside the catalogues (admin-foundation design.md decision 8).

/** Attributes whose static values people read or hear. */
const WATCHED_ATTRIBUTES = new Set(["aria-label", "title", "placeholder", "alt", "label"]);

/** Text that is the same in every language. */
const ALLOWED = new Set(["Static CMS", "CS", "EN", "B", "I", "Aa"]);

const WORDS = /\p{L}{2,}/u;

export interface Finding {
  file: string;
  text: string;
}

type Node = { type?: string; name?: string; data?: string; [key: string]: unknown };

function hasIgnore(node: Node): boolean {
  const attributes = (node.attributes as Node[] | undefined) ?? [];
  return attributes.some((a) => a.type === "Attribute" && a.name === "data-i18n-ignore");
}

function check(text: string, file: string, findings: Finding[]) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed && WORDS.test(trimmed) && !ALLOWED.has(trimmed))
    findings.push({ file, text: trimmed });
}

/** Static text in a Svelte component's markup and watched attributes. */
export function findMarkupText(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const ast = parse(source, { modern: true });
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    const node = value as Node;
    if (node.type === "Attribute") {
      if (WATCHED_ATTRIBUTES.has(node.name ?? "") && Array.isArray(node.value)) {
        for (const part of node.value as Node[])
          if (part.type === "Text") check(part.data ?? "", file, findings);
      }
      return;
    }
    if (node.type === "Text") {
      check(node.data ?? "", file, findings);
      return;
    }
    if ((node.type === "RegularElement" || node.type === "Component") && hasIgnore(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (key === "loc" || key === "name_loc") continue;
      visit(child);
    }
  };
  visit(ast.fragment);
  return findings;
}

/** User-facing `message: "…"` literals in server code. */
export function findServerMessages(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  for (const match of source.matchAll(/\bmessage:\s*(["'`])((?:(?!\1).)+)\1/g)) {
    // Interpolations aren't text; a literal made only of them says nothing itself.
    const text = match[2] ?? "";
    if (WORDS.test(text.replace(/\$\{[^}]*\}/g, ""))) check(text, file, findings);
  }
  return findings;
}

function walk(dir: string, accept: (path: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, accept);
    return accept(path) ? [path] : [];
  });
}

/** Every finding in the app's components and server code, by file relative to `root`. */
export function findUntranslatedText(root: string): Finding[] {
  const src = join(root, "src");
  const components = walk(src, (p) => p.endsWith(".svelte"));
  const server = walk(src, (p) => p.endsWith(".ts") && !p.endsWith(".test.ts")).filter(
    // The fake Netlify API only answers tests; nobody reads its messages.
    (p) =>
      (p.includes("/lib/server/") || p.endsWith("+server.ts")) && !p.endsWith("fake-netlify.ts"),
  );
  return [
    ...components.flatMap((p) => findMarkupText(readFileSync(p, "utf8"), relative(root, p))),
    ...server.flatMap((p) => findServerMessages(readFileSync(p, "utf8"), relative(root, p))),
  ];
}
