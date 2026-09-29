import {
  AddNewLineCommand,
  BreakTextNodeCommand,
  Command,
  define_keymap,
  InsertDefaultNodeCommand,
  RedoCommand,
  SelectAllCommand,
  SelectParentCommand,
  ToggleMarkCommand,
  UndoCommand,
} from "svedit";
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

/** Svedit's "select parent", except it never selects inside a list whose structure is fixed. */
class SafeSelectParentCommand extends SelectParentCommand {
  override execute(): void {
    const { session } = this.context;
    const before = session.selection;
    session.select_parent();
    const after = session.selection;
    if (after?.type === "node" && isFixedList(session, after.path)) session.selection = before;
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
    insert_default: new InsertDefaultNodeCommand(context),
    new_line: new AddNewLineCommand(context),
    select_all: new SelectAllCommand(context),
    select_parent: new SafeSelectParentCommand(context),
    move_up: new MoveNodeCommand(-1, context),
    move_down: new MoveNodeCommand(1, context),
    delete_node: new DeleteNodeCommand(context),
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
    "alt+arrowup": [commands.move_up],
    "alt+arrowdown": [commands.move_down],
  });
  return { commands, keymap };
}
