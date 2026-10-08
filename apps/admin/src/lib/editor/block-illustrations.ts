import type { BlockType } from "./transforms";

// Wireframe drawings of each block for the block picker (canvas-structure design.md decision 10).
// Grey shapes are the block's structure; buttons and accents use the site's primary colour,
// which the picker inherits from the canvas. Hand-written: a real render is unreadable at 120 × 72.

/** The drawings' shared coordinate system. */
export const ILLUSTRATION_VIEWBOX = "0 0 120 72";

const S = "var(--sketch, #c9ced6)";
const P = "var(--color-primary, #1f5a8a)";
const LIGHT = "var(--sketch-light, #eef0f3)";

const bar = (x: number, y: number, w: number, h = 3, fill = S) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;

/** A photo: a grey box with a small mountain and sun. */
const photo = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${S}"/>` +
  `<path d="M${x + w * 0.15} ${y + h * 0.82} L${x + w * 0.42} ${y + h * 0.45} L${x + w * 0.6} ${y + h * 0.68} L${x + w * 0.72} ${y + h * 0.55} L${x + w * 0.88} ${y + h * 0.82} Z" fill="#fff" opacity="0.85"/>` +
  `<circle cx="${x + w * 0.75}" cy="${y + h * 0.28}" r="${Math.min(w, h) * 0.08}" fill="#fff" opacity="0.85"/>`;

const button = (x: number, y: number, w: number, filled = true) =>
  filled
    ? `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${P}"/>`
    : `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="7" rx="3.5" fill="none" stroke="${P}"/>`;

/** The block's heading, the same in most drawings. */
const heading = (x = 8, y = 7, w = 40) => bar(x, y, w, 5, S);

const card = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="2" fill="none" stroke="${S}"/>`;

const lines = (x: number, y: number, widths: number[], gap = 5) =>
  widths.map((w, i) => bar(x, y + i * gap, w)).join("");

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ILLUSTRATION_VIEWBOX}" aria-hidden="true" focusable="false">${body}</svg>`;

export const BLOCK_ILLUSTRATIONS: Record<BlockType, string> = {
  hero: svg(
    `<rect width="120" height="72" fill="${LIGHT}"/>` +
      bar(8, 12, 50, 6) +
      bar(8, 21, 38, 6) +
      lines(8, 33, [48, 40]) +
      button(8, 48, 26) +
      photo(68, 12, 44, 46),
  ),
  rich_text: svg(
    heading() +
      lines(8, 18, [104, 100, 70]) +
      [0, 1, 2]
        .map(
          (i) =>
            `<circle cx="11" cy="${40 + i * 7}" r="1.6" fill="${P}"/>${bar(16, 38.5 + i * 7, 60 - i * 8)}`,
        )
        .join(""),
  ),
  services: svg(
    heading() +
      [0, 1, 2]
        .map((i) => {
          const x = 8 + i * 36;
          return (
            card(x, 18, 32, 46) +
            bar(x + 4, 23, 20, 4) +
            lines(x + 4, 31, [24, 20, 22]) +
            bar(x + 4, 54, 12, 4, P)
          );
        })
        .join(""),
  ),
  text_with_image: svg(photo(8, 10, 48, 52) + bar(64, 14, 40, 5) + lines(64, 25, [48, 44, 46, 30])),
  gallery: svg(
    heading() +
      [0, 1, 2, 3, 4, 5]
        .map((i) => photo(8 + (i % 3) * 36, 18 + Math.floor(i / 3) * 26, 32, 22))
        .join(""),
  ),
  team: svg(
    heading() +
      [0, 1, 2]
        .map((i) => {
          const cx = 24 + i * 36;
          return (
            `<circle cx="${cx}" cy="34" r="11" fill="${S}"/>` +
            bar(cx - 11, 50, 22, 4) +
            bar(cx - 8, 57, 16, 3, P)
          );
        })
        .join(""),
  ),
  logos: svg(
    heading(40, 10, 40) +
      [0, 1, 2, 3]
        .map((i) => {
          const x = 10 + i * 26;
          return i % 2 === 0
            ? `<rect x="${x}" y="30" width="22" height="12" rx="3" fill="${S}"/>`
            : `<circle cx="${x + 7}" cy="36" r="6" fill="${S}"/>${bar(x + 15, 34.5, 9)}`;
        })
        .join(""),
  ),
  contact: svg(
    heading() +
      [0, 1, 2]
        .map(
          (i) =>
            `<circle cx="11" cy="${22 + i * 10}" r="3" fill="${P}"/>${bar(18, 20.5 + i * 10, [52, 38, 46][i] as number)}`,
        )
        .join("") +
      bar(8, 54, 30, 3, P) +
      bar(8, 58.5, 30, 0.8, P),
  ),
  opening_hours: svg(
    heading() +
      [0, 1, 2, 3, 4]
        // Weekdays with their hours; a short "Closed" on the last line.
        .map((i) => bar(8, 19 + i * 9, 22) + bar(66, 19 + i * 9, i === 4 ? 18 : 40))
        .join("") +
      `<line x1="8" y1="15" x2="112" y2="15" stroke="${S}" stroke-width="0.6"/>`,
  ),
  call_to_action: svg(
    `<rect x="4" y="8" width="112" height="56" rx="4" fill="${LIGHT}"/>` +
      bar(30, 18, 60, 6) +
      bar(24, 30, 72) +
      button(30, 42, 28) +
      button(62, 42, 28, false),
  ),
  testimonials: svg(
    heading() +
      [0, 1]
        .map((i) => {
          const x = 8 + i * 54;
          return (
            `<rect x="${x}" y="18" width="50" height="46" rx="3" fill="${LIGHT}"/>` +
            `<text x="${x + 4}" y="32" font-size="16" font-family="Georgia, serif" fill="${P}">“</text>` +
            lines(x + 6, 33, [38, 34, 26]) +
            `<circle cx="${x + 9}" cy="55" r="4" fill="${S}"/>` +
            bar(x + 16, 53.5, 20)
          );
        })
        .join(""),
  ),
  // Questions as a column of rows, each with a disclosure triangle; the first one open.
  faq: svg(
    heading() +
      [0, 1, 2]
        .map((i) => {
          const y = 18 + i * 15 + (i > 0 ? 8 : 0);
          return (
            `<path d="M8 ${y} l4 2.5 l-4 2.5 Z" fill="${P}"${i === 0 ? ` transform="rotate(90 10 ${y + 2.5})"` : ""}/>` +
            bar(16, y + 1, [62, 54, 70][i] as number, 3) +
            (i === 0 ? lines(16, y + 8, [88, 70], 5) : "") +
            `<rect x="8" y="${y + (i === 0 ? 21 : 8)}" width="104" height="0.8" fill="${S}"/>`
          );
        })
        .join(""),
  ),
  // Three large numbers in the primary colour, each with a label under it.
  figures: svg(
    [0, 1, 2]
      .map((i) => {
        const x = 10 + i * 36;
        return bar(x, 22, 24, 10, P) + bar(x, 38, 28) + bar(x, 45, 18);
      })
      .join(""),
  ),
  // A heading, then three numbered circles, each with a title and a line of text.
  steps: svg(
    heading() +
      [0, 1, 2]
        .map((i) => {
          const y = 20 + i * 16;
          return (
            `<circle cx="13" cy="${y + 4}" r="5" fill="${P}"/>` +
            `<text x="13" y="${y + 6.5}" font-size="7" font-family="sans-serif" text-anchor="middle" fill="#fff">${i + 1}</text>` +
            bar(24, y, [40, 32, 36][i] as number, 4) +
            bar(24, y + 7, [70, 60, 66][i] as number)
          );
        })
        .join(""),
  ),
  // A heading, then a wide video frame with a play circle in the middle and a caption under it.
  videos: svg(
    heading() +
      `<rect x="8" y="16" width="104" height="44" rx="2" fill="${S}"/>` +
      `<circle cx="60" cy="38" r="9" fill="${P}"/>` +
      `<path d="M57 33 L65 38 L57 43 Z" fill="#fff"/>` +
      bar(8, 64, 48),
  ),
  // A heading, then three cards, each a photo with a title and two lines of text under it.
  cards: svg(
    heading() +
      [0, 1, 2]
        .map((i) => {
          const x = 8 + i * 36;
          return photo(x, 17, 32, 24) + bar(x, 45, 24, 4) + bar(x, 52, 32) + bar(x, 57, 22);
        })
        .join(""),
  ),
  // A heading, then two rows of photo tiles, each with its name over the bottom of the photo.
  projects: svg(
    heading() +
      [0, 1, 2, 3, 4, 5]
        .map((i) => {
          const x = 8 + (i % 3) * 36;
          const y = 18 + Math.floor(i / 3) * 26;
          return (
            photo(x, y, 32, 22) +
            bar(x + 3, y + 16, [18, 14, 20, 16, 12, 18][i] as number, 3, "#fff")
          );
        })
        .join(""),
  ),
};
