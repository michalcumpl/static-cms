import { isNodeType, type PropertyDef, siteSchema } from "../schema/index.js";
import { graphemeLength } from "../text.js";
import type { Problems } from "./problems.js";

type RawNode = Record<string, unknown>;

export interface GenericCheck {
  nodes: Record<string, RawNode>;
  /** Nodes whose shape matches the schema; only these are safe to read as typed nodes. */
  wellFormed: Set<string>;
}

const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function isValidId(id: unknown): id is string {
  return typeof id === "string" && ID_PATTERN.test(id) && !id.includes("__");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Schema-driven structural checks: identifiers, types, value shapes, references, marks,
 * cycles and reachability. Returns undefined when the input is not a document at all.
 */
export function checkStructure(input: unknown, problems: Problems): GenericCheck | undefined {
  if (!isObject(input) || typeof input.document_id !== "string" || !isObject(input.nodes)) {
    problems.error(
      "invalid-document",
      "",
      "A site document must be an object with a document_id and a nodes object.",
    );
    return undefined;
  }
  const docId = input.document_id;
  const nodes = input.nodes as Record<string, RawNode>;
  const wellFormed = new Set<string>();
  const edges = new Map<string, string[]>();

  for (const [key, node] of Object.entries(nodes)) {
    if (!isValidId(key)) {
      problems.error("invalid-id", key, `"${key}" is not a valid node ID.`);
    }
    if (!isObject(node)) {
      problems.error("invalid-value", key, `Node ${key} is not an object.`);
      continue;
    }
    if (node.id !== key) {
      problems.error(
        "id-mismatch",
        key,
        `Node stored under "${key}" has id "${String(node.id)}"; they must match.`,
      );
    }
    if (!isNodeType(node.type)) {
      problems.error("unknown-type", key, `Node ${key} has unknown type "${String(node.type)}".`);
      continue;
    }
    const properties: Record<string, PropertyDef> = siteSchema[node.type].properties;
    const refs: string[] = [];
    let ok = true;
    for (const [name, def] of Object.entries(properties)) {
      ok = checkProperty(key, name, def, node[name], nodes, refs, problems) && ok;
    }
    edges.set(key, refs);
    if (ok) wellFormed.add(key);
  }

  if (!Object.hasOwn(nodes, docId)) {
    problems.error("missing-reference", docId, `The root node "${docId}" does not exist.`);
    return { nodes, wellFormed };
  }

  reportCycles(docId, edges, problems);

  const reachable = new Set<string>([docId]);
  const queue = [docId];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    for (const next of edges.get(id) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  for (const key of Object.keys(nodes)) {
    if (!reachable.has(key)) {
      problems.warning(
        "unreachable-node",
        key,
        `Node ${key} is not reachable from the site and will not be rendered.`,
      );
    }
  }

  return { nodes, wellFormed };
}

interface PropertyContext {
  nodeId: string;
  name: string;
  nodes: Record<string, RawNode>;
  /** Outgoing references of the node, for the cycle and reachability walks. */
  refs: string[];
  problems: Problems;
}

/** Checks one property value and collects its references. Returns false on a shape error. */
function checkProperty(
  nodeId: string,
  name: string,
  def: PropertyDef,
  value: unknown,
  nodes: Record<string, RawNode>,
  refs: string[],
  problems: Problems,
): boolean {
  const ctx: PropertyContext = { nodeId, name, nodes, refs, problems };
  const invalid = (expected: string) => {
    problems.error("invalid-value", nodeId, `${nodeId}.${name} must be ${expected}.`, name);
    return false;
  };

  switch (def.type) {
    case "string":
      if (typeof value !== "string") return invalid("a string");
      if (def.values && !def.values.includes(value)) {
        return invalid(`one of ${def.values.join(", ")}`);
      }
      return true;
    case "boolean":
      return typeof value === "boolean" || invalid("true or false");
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) return invalid("an integer");
      if (
        (def.min !== undefined && value < def.min) ||
        (def.max !== undefined && value > def.max)
      ) {
        return invalid(`between ${def.min ?? "-∞"} and ${def.max ?? "∞"}`);
      }
      return true;
    case "node":
      if (!isValidId(value)) return invalid("a node ID");
      addReference(ctx, value, def.node_types);
      return true;
    case "text": {
      if (!isRangeContainer(value) || typeof value.content !== "string") {
        return invalid("a text value { content, marks, annotations }");
      }
      const length = graphemeLength(value.content);
      checkRanges(ctx, "mark", value.marks, length, def.mark_types ?? []);
      checkRanges(ctx, "annotation", value.annotations, length, def.annotation_types);
      return true;
    }
    case "node_array": {
      if (!isRangeContainer(value) || !Array.isArray(value.nodes)) {
        return invalid("a node list { nodes, marks, annotations }");
      }
      if (!value.nodes.every(isValidId)) return invalid("a list of node IDs");
      for (const ref of value.nodes as string[]) addReference(ctx, ref, def.node_types);
      const length = value.nodes.length;
      checkRanges(ctx, "mark", value.marks, length, def.mark_types ?? []);
      checkRanges(ctx, "annotation", value.annotations, length, def.annotation_types);
      return true;
    }
  }
}

function isRangeContainer(
  value: unknown,
): value is Record<string, unknown> & { marks: unknown[]; annotations: unknown[] } {
  return isObject(value) && Array.isArray(value.marks) && Array.isArray(value.annotations);
}

/** Records a reference and checks that it exists and, when `allowed` is given, its type. */
function addReference(ctx: PropertyContext, ref: string, allowed: readonly string[] | undefined) {
  const { nodeId, name, problems } = ctx;
  ctx.refs.push(ref);
  const target = ctx.nodes[ref];
  if (!isObject(target)) {
    problems.error(
      "missing-reference",
      nodeId,
      `${nodeId}.${name} references ${ref}, which does not exist.`,
      name,
    );
  } else if (allowed && !allowed.includes(target.type as string)) {
    problems.error(
      "disallowed-type",
      nodeId,
      `${nodeId}.${name} cannot contain ${ref} of type ${String(target.type)}; allowed: ${allowed.join(", ") || "none"}.`,
      name,
    );
  }
}

/**
 * Checks mark or annotation ranges: shape, bounds, referenced node and, for marks,
 * that they don't overlap. `allowed` undefined means any node type, like Svedit does
 * for undeclared annotation types.
 */
function checkRanges(
  ctx: PropertyContext,
  kind: "mark" | "annotation",
  ranges: unknown[],
  length: number,
  allowed: readonly string[] | undefined,
): void {
  const { nodeId, name, problems } = ctx;
  const inBounds: { start: number; end: number }[] = [];
  for (const range of ranges) {
    if (
      !isObject(range) ||
      !Number.isInteger(range.start_offset) ||
      !Number.isInteger(range.end_offset) ||
      !isValidId(range.node_id)
    ) {
      problems.error(
        "invalid-range",
        nodeId,
        `${nodeId}.${name} has a malformed ${kind}; expected { start_offset, end_offset, node_id }.`,
        name,
      );
      continue;
    }
    const start = range.start_offset as number;
    const end = range.end_offset as number;
    if (start < 0 || end > length || start >= end) {
      problems.error(
        "invalid-range",
        nodeId,
        `${nodeId}.${name} has ${kind} ${range.node_id} at ${start}–${end}, outside its length ${length} or empty.`,
        name,
      );
    } else {
      inBounds.push({ start, end });
    }
    addReference(ctx, range.node_id, allowed);
  }
  if (kind !== "mark") return;
  inBounds.sort((a, b) => a.start - b.start);
  for (let i = 1; i < inBounds.length; i++) {
    const prev = inBounds[i - 1];
    const cur = inBounds[i];
    if (prev && cur && cur.start < prev.end) {
      problems.error(
        "overlapping-marks",
        nodeId,
        `${nodeId}.${name} has overlapping marks; marks must not overlap.`,
        name,
      );
      return;
    }
  }
}

function reportCycles(root: string, edges: Map<string, string[]>, problems: Problems): void {
  const state = new Map<string, "visiting" | "done">();
  const reported = new Set<string>();
  const visit = (id: string): void => {
    state.set(id, "visiting");
    for (const next of edges.get(id) ?? []) {
      const s = state.get(next);
      if (s === "visiting" && !reported.has(next)) {
        reported.add(next);
        problems.error("cycle", next, `References starting at ${next} form a cycle via ${id}.`);
      } else if (s === undefined && edges.has(next)) {
        visit(next);
      }
    }
    state.set(id, "done");
  };
  visit(root);
  for (const id of edges.keys()) if (!state.has(id)) visit(id);
}
