// The crop dialog's frame (image-cropping design decision 5): a rectangle in whole pixels of
// the turned picture, kept inside it, at least MIN_CROP on each side, and in its shape when one
// is chosen. Plain functions, so the dialog only maps pointer and key events onto them.

import { MIN_CROP, type Rect, type Turn } from "$lib/image-edit";

/** A shape as width / height, or undefined for a free frame. */
export type Shape = number | undefined;

/** Which part of the frame is dragged: a corner, an edge, or the whole frame. */
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** The shapes the dialog offers, besides "as shown here". */
export const SHAPES = [
  { id: "free", shape: undefined },
  { id: "square", shape: 1 },
  { id: "4:3", shape: 4 / 3 },
  { id: "3:2", shape: 3 / 2 },
  { id: "16:9", shape: 16 / 9 },
] as const;

type Size = [width: number, height: number];

const round = (r: Rect): Rect => ({
  x: Math.round(r.x),
  y: Math.round(r.y),
  width: Math.round(r.width),
  height: Math.round(r.height),
});

/** The smallest frame side in this picture: MIN_CROP, unless the picture is smaller. */
function minSide([w, h]: Size): number {
  return Math.min(MIN_CROP, w, h);
}

/** The largest frame of `shape` centred in a picture of `size`; the whole picture when free. */
export function fitShape(size: Size, shape: Shape): Rect {
  const [w, h] = size;
  if (!shape) return { x: 0, y: 0, width: w, height: h };
  const width = Math.min(w, h * shape);
  const height = width / shape;
  return round({ x: (w - width) / 2, y: (h - height) / 2, width, height });
}

/**
 * The frame made valid: in its shape (keeping its centre and, as far as it can, its size),
 * at least the minimum, no larger than the picture, and moved inside it.
 */
export function clampFrame(frame: Rect, size: Size, shape: Shape): Rect {
  const [w, h] = size;
  const min = minSide(size);
  let { width, height } = frame;
  if (shape) {
    // Keep the area's longer side, then fit into the picture.
    if (width / height > shape) height = width / shape;
    else width = height * shape;
    const scale = Math.min(1, w / width, h / height);
    width *= scale;
    height *= scale;
    const grow = Math.max(1, min / width, min / height);
    width = Math.min(w, width * grow);
    height = Math.min(h, height * grow);
  } else {
    width = Math.min(w, Math.max(min, width));
    height = Math.min(h, Math.max(min, height));
  }
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const x = Math.min(w - width, Math.max(0, cx - width / 2));
  const y = Math.min(h - height, Math.max(0, cy - height / 2));
  return round({ x, y, width, height });
}

/** The frame moved by `dx`, `dy`, stopping at the picture's edges. */
export function moveFrame(frame: Rect, dx: number, dy: number, size: Size): Rect {
  const [w, h] = size;
  return round({
    ...frame,
    x: Math.min(w - frame.width, Math.max(0, frame.x + dx)),
    y: Math.min(h - frame.height, Math.max(0, frame.y + dy)),
  });
}

/**
 * The frame with one corner or edge dragged by `dx`, `dy`; the opposite side stays put. It
 * stops at the picture's edges and at the minimum size, and keeps its shape: an edge drag then
 * changes the other side around the frame's middle.
 */
export function resizeFrame(
  frame: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  size: Size,
  shape: Shape,
): Rect {
  const [w, h] = size;
  const min = minSide(size);
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");
  // The fixed point the frame grows from, and how far it may grow from it.
  const anchorX = west ? frame.x + frame.width : east ? frame.x : frame.x + frame.width / 2;
  const anchorY = north ? frame.y + frame.height : south ? frame.y : frame.y + frame.height / 2;
  const roomX = west ? anchorX : east ? w - anchorX : 2 * Math.min(anchorX, w - anchorX);
  const roomY = north ? anchorY : south ? h - anchorY : 2 * Math.min(anchorY, h - anchorY);

  let width = frame.width + (west ? -dx : east ? dx : 0);
  let height = frame.height + (north ? -dy : south ? dy : 0);
  if (shape) {
    // A corner follows the larger movement; an edge sets its own side.
    const horizontal = west || east;
    const vertical = north || south;
    const byWidth = horizontal && (!vertical || Math.abs(dx) >= Math.abs(dy) * shape);
    if (byWidth) height = width / shape;
    else width = height * shape;
    const scale = Math.min(1, roomX / width, roomY / height);
    width *= scale;
    height *= scale;
    const grow = Math.max(1, min / width, min / height);
    width *= grow;
    height *= grow;
  } else {
    width = Math.min(roomX, Math.max(min, width));
    height = Math.min(roomY, Math.max(min, height));
  }
  const x = west ? anchorX - width : east ? anchorX : anchorX - width / 2;
  const y = north ? anchorY - height : south ? anchorY : anchorY - height / 2;
  return clampFrame(round({ x, y, width, height }), size, shape);
}

/**
 * A frame after a quarter turn of the picture: `size` is the picture's size before the turn.
 * Returns the frame in the turned picture, which is `size` the other way round.
 */
export function turnFrame(frame: Rect, size: Size, clockwise: boolean): Rect {
  const [w, h] = size;
  return clockwise
    ? { x: h - frame.y - frame.height, y: frame.x, width: frame.height, height: frame.width }
    : { x: frame.y, y: w - frame.x - frame.width, width: frame.height, height: frame.width };
}

/** The turn after one more quarter turn either way. */
export function nextTurn(turn: Turn, clockwise: boolean): Turn {
  return ((turn + (clockwise ? 90 : 270)) % 360) as Turn;
}
