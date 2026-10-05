import { graphemeLength } from "@webmio/site";
import {
  AddNewLineCommand,
  BreakTextNodeCommand,
  Command,
  define_keymap,
  InsertDefaultNodeCommand,
  RedoCommand,
  SelectParentCommand,
  ToggleMarkCommand,
  UndoCommand,
} from "svedit";
import { canvasBlocksPath, collectionItemAt, selectedCollectionItem } from "./collections";
import { deleteSelectedNode, isFixedList, moveSelectedNode, selectedNode } from "./structure";

/** Moves the selected block or item up or down in its list. */
class MoveNodeCommand extends Command {
  constructor(
    private readonly direction: -1 | 1,
    // biome-ignore lint/suspicious/noExplicitAny: Svedit's command context is untyped.
    context: any,
  ) {
    super(context);
  }

  override is_enabled(): boolean {
    const { session, editable } = this.context;
    const selected = editable ? selectedNode(session) : undefined;
    if (!selected) return false;
    const length = (session.get(selected.path) as { nodes: string[] }).nodes.length;
    const target = selected.index + this.direction;
    return target >= 0 && target < length;
  }

  override execute(): void {
    moveSelectedNode(this.context.session, this.direction);
  }
}

/** Deletes the selected block or item (not in the navigation or the hero's fixed slots). */
class DeleteNodeCommand extends Command {
  override is_enabled(): boolean {
    return this.context.editable && selectedNode(this.context.session) !== undefined;
  }

  override execute(): void {
    deleteSelectedNode(this.context.session);
  }
}

/**
 * Cmd/Ctrl+A selects the text of the current field and nothing more (editor-polish design.md
 * decision 1). Svedit's own select-all grows to the paragraph and then the whole block, which
 * a Backspace would then delete. Escape still selects paragraphs and blocks. On an image or a
 * block selection it does nothing, but still takes the key, so the browser doesn't select the
 * whole page.
 */
export class SelectFieldTextCommand extends Command {
  override is_enabled(): boolean {
    return Boolean(this.context.editable && this.context.session.selection);
  }

  override execute(): void {
    const { session } = this.context;
    const selection = session.selection as { type: string; path: (string | number)[] } | null;
    if (selection?.type !== "text") return;
    const text = session.get(selection.path) as { content: string };
    session.selection = {
      type: "text",
      path: selection.path,
      anchor_offset: 0,
      focus_offset: graphemeLength(text.content),
    };
  }
}

/**
 * Svedit's "select parent", except it never selects inside a list whose structure is fixed, and
 * from a collection item selected as a whole it selects the block of the page that shows it
 * (business-collections design decision 4): the item's own parent is the site.
 */
class SafeSelectParentCommand extends SelectParentCommand {
  override is_enabled(): boolean {
    const { session, editable } = this.context;
    if (editable && selectedCollectionItem(session)) return true;
    return super.is_enabled();
  }

  override execute(): void {
    const { session } = this.context;
    const before = session.selection;
    const owned = selectedCollectionItem(session);
    const blocksPath = canvasBlocksPath(session);
    if (owned && blocksPath) {
      const index = owned.block.blockIndex;
      session.selection = {
        type: "node",
        path: blocksPath,
        anchor_offset: index,
        focus_offset: index + 1,
      };
      return;
    }
    session.select_parent();
    const after = session.selection;
    if (after?.type === "node" && isFixedList(session, after.path)) session.selection = before;
  }
}

/**
 * Backspace or Delete on a collection item selected as a whole: taken out of a block that shows
 * chosen items, deleted everywhere from one that shows all of them. Other selections keep
 * Svedit's own deletion.
 */
class DeleteCollectionItemCommand extends Command {
  override is_enabled(): boolean {
    return this.context.editable && selectedCollectionItem(this.context.session) !== undefined;
  }

  override execute(): void {
    deleteSelectedNode(this.context.session);
  }
}

/**
 * Svedit's "insert a default node" (Enter at the end of an item), except in a block that shows
 * chosen items, where a new item would land in the collection but not in the block, and in
 * another language, where items are added in the primary.
 */
class SafeInsertDefaultNodeCommand extends InsertDefaultNodeCommand {
  override is_enabled(): boolean {
    const { session } = this.context;
    const selection = session.selection as { path: (string | number)[] } | null;
    const owned = selection ? collectionItemAt(session, selection.path) : undefined;
    if (owned && (owned.block.mode === "chosen" || owned.fixed)) return false;
    return super.is_enabled();
  }
}

/** Swallows a shortcut so the browser's default (and Svedit's) handling doesn't run. */
class IgnoreCommand extends Command {
  override execute(): void {}
}

/** Removes the link mark(s) touched by the selection. */
export class UnlinkCommand extends Command {
  override is_enabled(): boolean {
    const { session, editable } = this.context;
    return (
      editable &&
      session.selected_marks.length > 0 &&
      session.selected_marks.every(
        ({ node }: { node?: { type: string } }) =>
          node?.type === "link" || node?.type === "internal_link",
      )
    );
  }

  override execute(): void {
    const { session } = this.context;
    const type = session.selected_marks[0]?.node?.type;
    if (type) session.apply(session.tr.toggle_mark(type));
  }
}

/** Document-scoped commands and keyboard shortcuts for the site editor. */
// biome-ignore lint/suspicious/noExplicitAny: Svedit's command context is untyped.
export function createCommandsAndKeymap(context: any) {
  const commands = {
    undo: new UndoCommand(context),
    redo: new RedoCommand(context),
    bold: new ToggleMarkCommand("strong", context),
    italic: new ToggleMarkCommand("emphasis", context),
    // Only used for their enabled/active state; the link dialog applies the marks with their target.
    link: new ToggleMarkCommand("link", context),
    internal_link: new ToggleMarkCommand("internal_link", context),
    unlink: new UnlinkCommand(context),
    break_text: new BreakTextNodeCommand(context),
    insert_default: new SafeInsertDefaultNodeCommand(context),
    new_line: new AddNewLineCommand(context),
    select_all: new SelectFieldTextCommand(context),
    select_parent: new SafeSelectParentCommand(context),
    move_up: new MoveNodeCommand(-1, context),
    move_down: new MoveNodeCommand(1, context),
    delete_node: new DeleteNodeCommand(context),
    delete_collection_item: new DeleteCollectionItemCommand(context),
    ignore: new IgnoreCommand(context),
  };
  const keymap = define_keymap({
    "meta+z,ctrl+z": [commands.undo],
    "meta+shift+z,ctrl+shift+z,ctrl+y": [commands.redo],
    "meta+b,ctrl+b": [commands.bold],
    "meta+i,ctrl+i": [commands.italic],
    // Svedit maps Cmd/Ctrl+U to a "highlight" mark this schema doesn't have.
    "meta+u,ctrl+u": [commands.ignore],
    enter: [commands.break_text, commands.insert_default],
    "shift+enter": [commands.new_line],
    "meta+a,ctrl+a": [commands.select_all],
    escape: [commands.select_parent],
    "backspace,delete": [commands.delete_collection_item],
    "alt+arrowup": [commands.move_up],
    "alt+arrowdown": [commands.move_down],
  });
  return { commands, keymap };
}
