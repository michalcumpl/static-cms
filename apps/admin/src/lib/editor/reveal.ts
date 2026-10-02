import { type DocumentPath, serialize_path } from "svedit";

// After a block is inserted (canvas-structure design.md decision 9): bring it into view and mark
// it briefly, so the owner sees where it went.

const HIGHLIGHT_MS = 1000;

/** Scrolls the node at `path` into view, once rendered, and highlights it for a second. */
export function revealNode(path: DocumentPath): void {
  requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(
      `[data-type="node"][data-path="${serialize_path(path)}"]`,
    );
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    element.setAttribute("data-just-added", "");
    setTimeout(() => element.removeAttribute("data-just-added"), HIGHLIGHT_MS);
  });
}
