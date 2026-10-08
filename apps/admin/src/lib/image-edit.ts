// An edit of a library image: a turn, then a crop of the turned picture (image-cropping design
// decision 1). Shared by the server, which applies it, and the crop dialog, which draws it.

/** Quarter turns clockwise, in degrees. */
export const TURNS = [0, 90, 180, 270] as const;
export type Turn = (typeof TURNS)[number];

/** The smallest crop, in pixels of the image, on either side. */
export const MIN_CROP = 64;

/** A rectangle in whole pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageEdit {
  turn: Turn;
  /** In pixels of the turned picture. */
  crop: Rect;
}

/** The size of a picture of `width` × `height` after `turn`. */
export function turnedSize(width: number, height: number, turn: Turn): [number, number] {
  return turn === 90 || turn === 270 ? [height, width] : [width, height];
}

/** Why an edit of a `width` × `height` picture can't be made, or undefined when it can. */
export function editProblem(
  edit: ImageEdit,
  width: number,
  height: number,
): "invalid" | "outside" | "tooSmall" | undefined {
  const { turn, crop } = edit;
  if (!TURNS.includes(turn)) return "invalid";
  const values = [crop.x, crop.y, crop.width, crop.height];
  if (!values.every((v) => Number.isInteger(v))) return "invalid";
  const [w, h] = turnedSize(width, height, turn);
  if (crop.x < 0 || crop.y < 0 || crop.x + crop.width > w || crop.y + crop.height > h) {
    return "outside";
  }
  if (crop.width < MIN_CROP || crop.height < MIN_CROP) return "tooSmall";
  return undefined;
}

/** Whether an edit leaves the picture as it is: no turn and the whole picture. */
export function isIdentity(edit: ImageEdit, width: number, height: number): boolean {
  const { turn, crop } = edit;
  return (
    turn === 0 && crop.x === 0 && crop.y === 0 && crop.width === width && crop.height === height
  );
}

/** Reads an edit from untrusted JSON, or undefined when it isn't shaped like one. */
export function parseEdit(value: unknown): ImageEdit | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { turn, crop } = value as { turn?: unknown; crop?: unknown };
  if (typeof crop !== "object" || crop === null) return undefined;
  const { x, y, width, height } = crop as Record<string, unknown>;
  if (![turn, x, y, width, height].every((v) => typeof v === "number")) return undefined;
  return { turn: turn as Turn, crop: { x, y, width, height } as Rect };
}
