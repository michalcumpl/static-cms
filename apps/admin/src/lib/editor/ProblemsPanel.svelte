<script lang="ts">
import { type Problem, validateSite } from "@webmio/model";
import { TEMPLATE_RELEASES } from "@webmio/templates";
import { onMount, tick, untrack } from "svelte";
import { goto } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import {
  locateMark,
  locateNode,
  pageFieldElementId,
  selectionFor,
  settingsFieldId,
  settingsTarget,
  themeFieldElementId,
} from "./locate";
import { openSettings } from "./screen.svelte";
import type { EditorState } from "./state.svelte";

let { editor, focusCanvas }: { editor: EditorState; focusCanvas: () => void } = $props();
const i18n = getI18n();

type Doc = Parameters<typeof locateNode>[0];

// Starts with what the server reported, then follows the document as it is edited.
let problems = $state.raw<Problem[]>(untrack(() => editor.savedProblems));

$effect(() => {
  const doc = editor.session.doc;
  const timer = setTimeout(() => {
    problems = validateSite(doc, { templates: TEMPLATE_RELEASES }).problems;
  }, 300);
  return () => clearTimeout(timer);
});

const errors = $derived(problems.filter((p) => p.severity === "error").length);

/**
 * Clickable when it leads somewhere: a page or site settings field, a node the editor can
 * select, or at least its page.
 */
function canShow(problem: Problem): boolean {
  const doc = editor.session.doc as unknown as Doc;
  if (settingsTarget(doc, problem.nodeId, problem.property)) return true;
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

// Opened from a link to a problem (the panel's dashboard): show it once the editor is there.
onMount(() => {
  const params = new URL(window.location.href).searchParams;
  const nodeId = params.get("problem");
  if (!nodeId) return;
  const property = params.get("property") ?? undefined;
  const problem = editor.savedProblems.find(
    (p) => p.nodeId === nodeId && (property === undefined || p.property === property),
  );
  if (problem) void show(problem);
});

async function show(problem: Problem) {
  const doc = editor.session.doc as unknown as Doc;
  const target = settingsTarget(doc, problem.nodeId, problem.property);
  const settingsField = settingsFieldId(target);
  if (settingsField) {
    await openSettings(editor, i18n.t, settingsField);
    return;
  }
  if (target?.tab === "theme") {
    editor.settingsTab = "design";
    await tick();
    document.getElementById(themeFieldElementId(target.field))?.focus();
    return;
  }
  if (target?.tab === "page") {
    editor.settingsTab = "page";
    await showPage(target.pageId);
    await tick();
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
    {i18n.t("editor.problems.title")}
    {#if problems.length > 0}<span class="count">{problems.length}</span>{/if}
  </h2>
  {#if problems.length === 0}
    <p class="none">{i18n.t("editor.problems.none")}</p>
  {:else}
    {#if errors > 0}
      <p class="summary">{i18n.t("editor.problems.blocking")}</p>
    {/if}
    <ul>
      {#each problems as problem, index (index)}
        <li class={problem.severity}>
          {#if canShow(problem)}
            <button type="button" onclick={() => show(problem)}>
              <span class="severity">{i18n.t(`project.severity.${problem.severity}`)}</span>
              {problem.message}
            </button>
          {:else}
            <span class="severity">{i18n.t(`project.severity.${problem.severity}`)}</span>
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
    color: var(--ui-muted);
  }

  .count {
    display: inline-block;
    min-width: 1.4em;
    padding: 0 0.3em;
    border-radius: 1em;
    background: var(--ui-problem);
    color: var(--ui-surface);
    text-align: center;
  }

  .none,
  .summary {
    font-size: 0.9rem;
    color: var(--ui-muted);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--ui-border);
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
    outline: 2px solid var(--ui-focus);
  }

  .severity {
    font-weight: 700;
  }

  .error .severity {
    color: var(--ui-problem);
  }

  .warning .severity {
    color: var(--ui-attention);
  }
</style>
