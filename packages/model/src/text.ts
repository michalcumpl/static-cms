// Svedit counts text offsets in grapheme clusters (Intl.Segmenter, "en"), so we do too.
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

export function graphemeLength(text: string): number {
  let n = 0;
  for (const _ of segmenter.segment(text)) n++;
  return n;
}
