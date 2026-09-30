<script lang="ts">
import { type Problem, validateSite } from "@static-cms/site";
import { tick, untrack } from "svelte";
import { goto } from "$app/navigation";
import {
  locateMark,
  locateNode,
  pageFieldElementId,
  pageSettingsTarget,
  selectionFor,
} from "./locate";
import type { EditorState } from "./state.svelte";

let { editor, focusCanvas }: { editor: EditorState; focusCanvas: () => void } = $props();

type Doc = Parameters<typeof locateNode>[0];

// Starts with what the server reported, then follows the document as it is edited.
let problems = $state.raw<Problem[]>(untrack(() => editor.savedProblems));

$effect(() => {
  const doc = editor.session.doc;
  const timer = setTimeout(() => {
    problems = validateSite(doc).problems;
  }, 300);
  return () => clearTimeout(timer);
});

const errors = $derived(problems.filter((p) => p.severity === "error").length);

/**
 * Clickable when it leads somewhere: a page settings field, a node the editor can select,
 * or at least its page.
 */
function canShow(problem: Problem): boolean {
  const doc = editor.session.doc as unknown as Doc;
  if (pageSettingsTarget(doc, problem.nodeId, problem.property)) return true;
  if (locateMark(doc, problem.nodeId)) return true;
  const location = locateNode(doc, problem.nodeId);
  if (!location) return false;
  return location.pageId !== undefined || selectionFor(doc, problem.nodeId, location) !== undefined;
}

async function showPage(pageId: string | undefined) {
  const page = editor.pages.find((p) => p.id === pageId);
  if (page && page.id !== editor.currentPageId) {
    await goto(page.href);
    await tick();
  }
}

async function show(problem: Problem) {
  const doc = editor.session.doc as unknown as Doc;
  const target = pageSettingsTarget(doc, problem.nodeId, problem.property);
  if (target) {
    await showPage(target.pageId);
    document.getElementById(pageFieldElementId(target.field))?.focus();
    return;
  }
  const mark = locateMark(doc, problem.nodeId);
  if (mark) {
    // A link inside text: select exactly the linked words.
    await showPage(mark.pageId);
    const at = locateMark(editor.session.doc as unknown as Doc, problem.nodeId);
    if (!at) return;
    editor.session.selection = {
      type: "text",
      path: at.path,
      anchor_offset: at.start,
      focus_offset: at.end,
    };
    focusCanvas();
    return;
  }
  const location = locateNode(doc, problem.nodeId);
  if (!location) return;
  await showPage(location.pageId);
  const selection = selectionFor(doc, problem.nodeId, location);
  if (!selection) return;
  editor.session.selection = selection;
  focusCanvas();
}
</script>

<section class="panel" aria-labelledby="problems-title">
  <h2 id="problems-title">
    Problems
    {#if problems.length > 0}<span class="count">{problems.length}</span>{/if}
  </h2>
  {#if problems.length === 0}
    <p class="none">No problems. The site can be published.</p>
  {:else}
    {#if errors > 0}
      <p class="summary">Preview and download wait until the errors are fixed. You can still save.</p>
    {/if}
    <ul>
      {#each problems as problem, index (index)}
        <li class={problem.severity}>
          {#if canShow(problem)}
            <button type="button" onclick={() => show(problem)}>
              <span class="severity">{problem.severity === "error" ? "Error" : "Warning"}</span>
              {problem.message}
            </button>
          {:else}
            <span class="severity">{problem.severity === "error" ? "Error" : "Warning"}</span>
            {problem.message}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .panel {
    padding: 1rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
  }

  .count {
    display: inline-block;
    min-width: 1.4em;
    padding: 0 0.3em;
    border-radius: 1em;
    background: #a3161a;
    color: #fff;
    text-align: center;
  }

  .none,
  .summary {
    font-size: 0.9rem;
    color: #555;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    padding: 0.4rem 0;
    border-bottom: 1px solid #eee;
    font-size: 0.9rem;
  }

  button {
    all: unset;
    display: block;
    cursor: pointer;
  }

  button:hover,
  button:focus-visible {
    text-decoration: underline;
  }

  button:focus-visible {
    outline: 2px solid #1f5a8a;
  }

  .severity {
    font-weight: 700;
  }

  .error .severity {
    color: #a3161a;
  }

  .warning .severity {
    color: #8a5a00;
  }
</style>
