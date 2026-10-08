<script lang="ts">
import { type DocumentPath, deserialize_path, serialize_path } from "svedit";
import { getI18n } from "$lib/i18n";
import PopoverMenu, { type MenuEntry } from "$lib/ui/PopoverMenu.svelte";
import { BLOCK_ILLUSTRATIONS } from "./block-illustrations";
import {
  deleteItem,
  duplicateItem,
  moveItem,
  otherPagesShowing,
  removeFromBlock,
} from "./collections";
import {
  BLOCK_TYPES,
  type HandleTarget,
  handleTargets,
  selectionPath,
  targetName,
  unavailableReason,
} from "./handles";
import { revealNode } from "./reveal";
import type { EditorState } from "./state.svelte";
import {
  canDuplicate,
  deleteSelectedNode,
  duplicateSelectedNode,
  insertBlockAt,
  itemLimit,
  moveSelectedNode,
} from "./structure";
import type { BlockType } from "./transforms";

// Class names start with `cs-` so the site stylesheet (`.block`, `.add`…) never styles them.
// Handles and "+ Add block" points on the canvas (canvas-structure design.md decisions 1–3, 7
// and 8): one overlay, placed with CSS anchor positioning on the anchors Svedit gives every node.
let {
  editor,
  canvas,
  focusCanvas,
}: {
  editor: EditorState;
  /** The canvas element, whose pointer movements decide what the handles are for. */
  canvas: HTMLElement | undefined;
  focusCanvas: () => void;
} = $props();

const session = $derived(editor.session);
const i18n = getI18n();
const BLOCK_ORDER = BLOCK_TYPES;
const nameOf = (target: HandleTarget) => targetName(target, i18n.t);
/** How long the handles stay after the pointer leaves their node, so they can be reached. */
const HOLD_MS = 300;

// Raw state: these paths go into Svedit's selection, which clones them, so they can't be proxies.
let pointerPath = $state.raw<DocumentPath | undefined>();
let holdTimer: ReturnType<typeof setTimeout> | undefined;
let menu = $state.raw<{ kind: "block" | "item"; target: HandleTarget } | undefined>();
let picker = $state.raw<{
  blocksPath: DocumentPath;
  index: number;
  anchor: string;
  opener?: HTMLElement;
}>();

const blocksPath = $derived<DocumentPath>([editor.siteId, "pages", editor.pageIndex, "blocks"]);
const blockIds = $derived(
  editor.pageIndex < 0
    ? []
    : ((session.get(blocksPath) as { nodes: string[] } | undefined)?.nodes ?? []),
);
const blockTypes = $derived(blockIds.map((id) => session.get(id) as { type: string }));

// The selection wins over the pointer, so the handles can be reached without hovering.
const targets = $derived.by(() => {
  if (menu)
    return menu.kind === "block"
      ? { block: menu.target }
      : handleTargets(session, menu.target.path);
  const path = selectionPath(session) ?? pointerPath;
  if (!path) return {};
  const found = handleTargets(session, path);
  // Only the current page's blocks.
  return found.block && serialize_path(found.block.listPath) === serialize_path(blocksPath)
    ? found
    : {};
});

/** Places a block can go next to the block with handles, or the only place on an empty page. */
const addPoints = $derived.by(() => {
  if (editor.pageIndex < 0) return [];
  if (blockIds.length === 0) {
    return [{ index: 0, anchor: `--${serialize_path(blocksPath)}`, edge: "top" as const }];
  }
  const block = targets.block;
  if (!block) return [];
  const anchor = `--${serialize_path(block.path)}`;
  return [
    { index: block.index, anchor, edge: "top" as const },
    { index: block.index + 1, anchor, edge: "bottom" as const },
  ].filter((point) =>
    BLOCK_ORDER.some((type) => !unavailableReason(type, blockTypes, point.index)),
  );
});

function onpointermove(event: PointerEvent) {
  const element = event.target as Element | null;
  if (element?.closest(".canvas-overlay")) {
    clearTimeout(holdTimer);
    return;
  }
  const node = element?.closest<HTMLElement>('[data-type="node"][data-path]');
  const path = node?.dataset.path ? deserialize_path(node.dataset.path) : undefined;
  if (path) {
    clearTimeout(holdTimer);
    pointerPath = path;
  } else {
    scheduleClear();
  }
}

function scheduleClear() {
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (!menu && !picker) pointerPath = undefined;
  }, HOLD_MS);
}

$effect(() => {
  const element = canvas;
  if (!element) return;
  element.addEventListener("pointermove", onpointermove);
  element.addEventListener("pointerleave", scheduleClear);
  return () => {
    element.removeEventListener("pointermove", onpointermove);
    element.removeEventListener("pointerleave", scheduleClear);
    clearTimeout(holdTimer);
  };
});

/** Selects a block or item as a whole, as Escape would. */
function select(target: HandleTarget) {
  session.selection = {
    type: "node",
    path: [...target.listPath],
    anchor_offset: target.index,
    focus_offset: target.index + 1,
  };
}

function openMenu(kind: "block" | "item", target: HandleTarget) {
  picker = undefined;
  select(target);
  menu = { kind, target };
}

function closeMenu(chosen: boolean) {
  menu = undefined;
  if (!chosen) focusCanvas();
}

/** The menu of an item of a site collection (business-collections, "Items in collection blocks"). */
function collectionEntries(target: HandleTarget): MenuEntry[] {
  const owned = target.collection;
  if (!owned) return [];
  const { block, item, fixed } = owned;
  const siteId = editor.siteId;
  const run = (action: () => void) => () => {
    action();
    focusCanvas();
  };
  // In another language, which items exist and their order come from the primary.
  const fixedReason = fixed
    ? i18n.t("editor.handles.addedInPrimary", {
        collection: i18n.t(`editor.collections.${block.collection}`),
        language: editor.primaryName,
      })
    : undefined;
  const orderFixed = block.mode === "all" ? fixedReason : undefined;
  const members = (session.get([siteId, block.collection]) as { nodes: string[] }).nodes.length;
  const first = block.mode === "all" ? item.index === 0 : item.position === 0;
  const last =
    block.mode === "all" ? item.index >= members - 1 : item.position >= block.items.length - 1;
  const others = otherPagesShowing(session.doc, item.itemId, editor.currentPageId).length;
  return [
    {
      label: i18n.t("editor.handles.moveUp"),
      disabled: first,
      disabledReason: orderFixed,
      run: run(() => moveItem(session, siteId, block, item, -1)),
    },
    {
      label: i18n.t("editor.handles.moveDown"),
      disabled: last,
      disabledReason: orderFixed,
      run: run(() => moveItem(session, siteId, block, item, 1)),
    },
    {
      label: i18n.t("editor.handles.duplicate"),
      disabledReason: fixedReason,
      run: run(() => duplicateItem(session, siteId, block, item)),
    },
    block.mode === "chosen"
      ? {
          label: i18n.t("editor.handles.removeFromBlock"),
          run: run(() => removeFromBlock(session, block, item)),
        }
      : {
          label: i18n.t("editor.handles.delete"),
          detail: others > 0 ? i18n.t("editor.handles.alsoShownOn", { count: others }) : undefined,
          disabledReason: fixedReason,
          run: run(() => deleteItem(session, siteId, block.collection, item.itemId)),
        },
  ];
}

function menuEntries(kind: "block" | "item", target: HandleTarget): MenuEntry[] {
  if (kind === "item" && target.collection) return collectionEntries(target);
  const count = (session.get(target.listPath) as { nodes: string[] }).nodes.length;
  // A cards block holds one to twelve cards.
  const limit =
    target.type === "card" || target.type === "video" ? itemLimit(session, target.id) : undefined;
  const after = (action: () => void) => () => {
    select(target);
    action();
    focusCanvas();
  };
  const entries: MenuEntry[] = [
    {
      label: i18n.t("editor.handles.moveUp"),
      disabled: target.index === 0,
      run: after(() => moveSelectedNode(session, -1)),
    },
    {
      label: i18n.t("editor.handles.moveDown"),
      disabled: target.index >= count - 1,
      run: after(() => moveSelectedNode(session, 1)),
    },
    {
      label: i18n.t("editor.handles.duplicate"),
      disabled: !canDuplicate(session, target.id),
      disabledReason:
        limit === "maxCards"
          ? i18n.t(
              target.type === "video"
                ? "editor.unavailable.maxVideos"
                : "editor.unavailable.maxCards",
            )
          : undefined,
      run: after(() => duplicateSelectedNode(session)),
    },
    {
      label: i18n.t("editor.handles.delete"),
      disabled: limit === "lastCard",
      disabledReason:
        limit === "lastCard"
          ? i18n.t(
              target.type === "video"
                ? "editor.unavailable.lastVideo"
                : "editor.unavailable.lastCard",
            )
          : undefined,
      run: after(() => {
        deleteSelectedNode(session);
        session.selection = null as never;
      }),
    },
  ];
  if (kind === "block") {
    const anchor = `--handle-${kind}`;
    for (const [label, index] of [
      [i18n.t("editor.handles.addAbove"), target.index],
      [i18n.t("editor.handles.addBelow"), target.index + 1],
    ] as const) {
      const possible = BLOCK_ORDER.some((type) => !unavailableReason(type, blockTypes, index));
      entries.push({
        label,
        disabled: !possible,
        run: () => openPicker(target.listPath, index, anchor),
      });
    }
  }
  return entries;
}

function openPicker(path: DocumentPath, index: number, anchor: string, opener?: HTMLElement) {
  menu = undefined;
  picker = { blocksPath: path, index, anchor, opener };
}

function closePicker(chosen: boolean) {
  const opener = picker?.opener;
  picker = undefined;
  if (chosen) return;
  if (opener?.isConnected) opener.focus();
  else focusCanvas();
}

const reasonText = (reason: ReturnType<typeof unavailableReason>) =>
  reason ? i18n.t(`editor.unavailable.${reason}`) : undefined;

const pickerEntries = $derived.by((): MenuEntry[] => {
  if (!picker) return [];
  const { blocksPath: path, index } = picker;
  return BLOCK_ORDER.map((type) => ({
    label: i18n.t(`editor.blocks.${type}.name`),
    detail: i18n.t(`editor.blocks.${type}.description`),
    illustration: BLOCK_ILLUSTRATIONS[type],
    disabledReason: reasonText(unavailableReason(type, blockTypes, index)),
    run: () => {
      if (insertBlockAt(session, path, index, type)) {
        focusCanvas();
        revealNode([...path, index]);
      }
    },
  }));
});
</script>

<div class="canvas-overlay">
  {#each [["block", targets.block], ["item", targets.item]] as const as [kind, target] (kind)}
    {#if target}
      <button
        type="button"
        class="cs-handle cs-{kind}"
        aria-label={nameOf(target)}
        aria-haspopup="menu"
        aria-expanded={menu?.kind === kind}
        title={i18n.t("editor.handles.hint", { name: nameOf(target) })}
        style="position-anchor: --{serialize_path(target.path)}; anchor-name: --handle-{kind};"
        onmousedown={(e) => e.preventDefault()}
        onclick={() => openMenu(kind, target)}
      >
        <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
          {#each [3, 8, 13] as y (y)}
            <circle cx="2.5" cy={y} r="1.5" /><circle cx="7.5" cy={y} r="1.5" />
          {/each}
        </svg>
      </button>
    {/if}
  {/each}

  {#each addPoints as point (point.edge + point.index)}
    {@const name = `--add-${point.edge}`}
    <button
      type="button"
      class="cs-add cs-{point.edge}"
      aria-haspopup="menu"
      aria-expanded={picker?.anchor === name}
      style="position-anchor: {point.anchor}; anchor-name: {name};"
      onmousedown={(e) => e.preventDefault()}
      onclick={(e) => openPicker(blocksPath, point.index, name, e.currentTarget)}
    >
      {i18n.t("editor.handles.addBlock")}
    </button>
  {/each}

  {#if menu}
    <PopoverMenu
      label={i18n.t("editor.handles.actions", { name: nameOf(menu.target) })}
      anchor="--handle-{menu.kind}"
      entries={menuEntries(menu.kind, menu.target)}
      onclose={closeMenu}
    />
  {/if}
  {#if picker}
    <PopoverMenu
      label={i18n.t("editor.handles.picker")}
      anchor={picker.anchor}
      entries={pickerEntries}
      onclose={closePicker}
      layout="grid"
    />
  {/if}
</div>

<style>
  .cs-handle,
  .cs-add {
    position: absolute;
    z-index: 20;
    font: 600 0.8rem/1 var(--ui-font);
    color: var(--ui-button-label);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border-strong);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
    cursor: pointer;
  }

  .cs-handle {
    top: calc(anchor(top) + 0.4rem);
    left: calc(anchor(left) + 0.25rem);
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border-radius: 0.3rem;
  }

  .cs-handle svg {
    fill: currentColor;
  }

  /* An item's handle sits a little further in, so it doesn't cover its block's. */
  .cs-handle.cs-item {
    top: calc(anchor(top) + 0.25rem);
    left: calc(anchor(left) + 0.25rem);
  }

  .cs-add {
    left: anchor(center);
    translate: -50% -50%;
    padding: 0.3rem 0.6rem;
    border-radius: 1rem;
    white-space: nowrap;
  }

  .cs-add.cs-top {
    top: anchor(top);
  }

  .cs-add.cs-bottom {
    top: anchor(bottom);
  }

  .cs-handle:hover,
  .cs-handle[aria-expanded="true"],
  .cs-add:hover,
  .cs-add[aria-expanded="true"] {
    background: var(--ui-soft);
    border-color: var(--ui-focus);
  }

  .cs-handle:focus-visible,
  .cs-add:focus-visible {
    outline: 3px solid var(--ui-focus);
    outline-offset: 1px;
  }

  /* Larger targets for fingers. */
  @media (pointer: coarse) {
    .cs-handle {
      width: 2.75rem;
      height: 2.75rem;
    }

    .cs-add {
      padding: 0.7rem 1rem;
    }
  }

  /* Without anchor positioning they can't be placed; Escape and the toolbar still work. */
  @supports not (anchor-name: --a) {
    .canvas-overlay {
      display: none;
    }
  }
</style>
