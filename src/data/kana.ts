import gojuon from "./gojuon.json";
import strokeData from "./strokes.json";

export type Kana = { char: string; romaji: string; strokes: string[] };

const GOJUON = gojuon as [string, string][];
const strokesByChar: Record<string, string[]> = strokeData;

export const HIRAGANA: Kana[] = GOJUON.map(([char, romaji]) => {
  const strokes = strokesByChar[char];
  if (!strokes?.length)
    throw new Error(`No stroke data for "${char}" in src/data/strokes.json; run pnpm strokes to regenerate it`);
  return { char, romaji, strokes };
});

export const LESSON_ORDER = HIRAGANA.map((k) => k.char);

// Look up a kana by character, failing loudly on unknown input.
export function kanaFor(char: string): Kana {
  const kana = HIRAGANA.find((k) => k.char === char);
  if (!kana) throw new Error(`"${char}" is not a supported hiragana`);
  return kana;
}
