import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KANJIVG_TAG = "r20260714";
const KANJIVG_URL = `https://raw.githubusercontent.com/KanjiVG/kanjivg/${KANJIVG_TAG}/kanji`;
const OUT_FILE = "src/data/strokes.json";
const CHARS = JSON.parse(readFileSync("src/data/gojuon.json", "utf8")).map(([char]) => char);

const USAGE = `Usage:
  pnpm strokes               download KanjiVG ${KANJIVG_TAG} and build ${OUT_FILE}
  pnpm strokes <dir>         build from your own KanjiVG-style SVGs named by codepoint (03042.svg for あ)
  pnpm strokes <file.json>   use your own stroke file ({"あ": ["<path d>", ...], ...} in a 109×109 box)
  pnpm strokes --check       verify ${OUT_FILE} exists and covers every kana`;

const svgName = (char) => `${char.codePointAt(0).toString(16).padStart(5, "0")}.svg`;

// Pull ordered stroke path data out of one KanjiVG SVG.
function extractStrokes(svg, name) {
  const strokes = [...svg.matchAll(/<path id="kvg:[0-9a-f]+-s(\d+)"[^>]*\sd="([^"]+)"/g)]
    .map(([, order, d]) => ({ order: Number(order), d }))
    .sort((a, b) => a.order - b.order);
  if (strokes.length === 0) throw new Error(`${name}: no stroke paths found; is this a KanjiVG-style SVG?`);
  strokes.forEach((stroke, i) => {
    if (stroke.order !== i + 1) throw new Error(`${name}: stroke ${i + 1} is missing`);
  });
  return strokes.map((s) => s.d);
}

// Check that stroke data has a non-empty list of path strings for every kana.
function validate(data, source) {
  const missing = CHARS.filter(
    (char) => !Array.isArray(data[char]) || data[char].length === 0 || data[char].some((d) => typeof d !== "string"),
  );
  if (missing.length > 0) throw new Error(`${source} has no usable strokes for: ${missing.join(" ")}`);
  return data;
}

async function download() {
  const entries = await Promise.all(
    CHARS.map(async (char) => {
      const url = `${KANJIVG_URL}/${svgName(char)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}; check your connection`);
      return [char, extractStrokes(await response.text(), url)];
    }),
  );
  return Object.fromEntries(entries);
}

function fromDirectory(dir) {
  const entries = CHARS.filter((char) => existsSync(join(dir, svgName(char)))).map((char) => [
    char,
    extractStrokes(readFileSync(join(dir, svgName(char)), "utf8"), svgName(char)),
  ]);
  return Object.fromEntries(entries);
}

function check() {
  if (!existsSync(OUT_FILE)) throw new Error(`${OUT_FILE} is missing; run pnpm strokes once to set it up`);
  validate(JSON.parse(readFileSync(OUT_FILE, "utf8")), OUT_FILE);
}

async function build(source) {
  if (!source) return { data: await download(), from: `KanjiVG ${KANJIVG_TAG}` };
  if (!existsSync(source)) throw new Error(`${source} does not exist\n\n${USAGE}`);
  if (statSync(source).isDirectory()) return { data: fromDirectory(source), from: source };
  return { data: JSON.parse(readFileSync(source, "utf8")), from: source };
}

const [arg] = process.argv.slice(2);
try {
  if (arg === "--help" || arg === "-h") console.log(USAGE);
  else if (arg === "--check") check();
  else {
    const { data, from } = await build(arg);
    const valid = validate(data, from);
    const strokes = Object.fromEntries(CHARS.map((char) => [char, valid[char]]));
    writeFileSync(OUT_FILE, JSON.stringify(strokes, null, 1) + "\n");
    console.log(`Wrote ${CHARS.length} kana from ${from} to ${OUT_FILE}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
