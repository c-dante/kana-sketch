# Kana Sketch

Learn to write hiragana by drawing it. Each character is introduced with its sound and an animated stroke
guide, traced, then written from memory, and then folded into spaced-repetition review.

## Setup

```sh
pnpm install
pnpm strokes
```

The repository doesn't include stroke data. `pnpm strokes` downloads the 46 hiragana from a pinned
[KanjiVG](https://kanjivg.tagaini.net) release and writes `src/data/strokes.json`, which git ignores. You only
need to run it once. `dev`, `check` and `build` stop with a reminder if the file is missing.

### Using your own stroke data

| Command | Source |
| --- | --- |
| `pnpm strokes` | KanjiVG, downloaded from the pinned release |
| `pnpm strokes <dir>` | A folder of KanjiVG-style SVGs named by codepoint, e.g. `03042.svg` for あ. Stroke paths need ids ending `-s1`, `-s2`, … |
| `pnpm strokes <file.json>` | A ready-made file: `{"あ": ["<path d>", …], …}`, with strokes in drawing order, on a 109×109 grid |

Every kana in `src/data/gojuon.json` needs at least one stroke. If any are missing, the command names them and
leaves the existing file unchanged.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on all interfaces (`http://cachy-box.local:5173`) with the example-saving endpoint |
| `pnpm check` | Typecheck and run the tests |
| `pnpm build` | Production build into `dist/` (relative paths, so it works from any sub-path) |
| `pnpm preview` | Serve the production build locally |

## Tuning the stroke grader

In `pnpm dev`, the drawing pad has a **Save drawing** button that writes every stroke attempt, the grader's
verdict, and the sampled reference strokes to `examples/`. Open `/grader.html` to see each attempt drawn
against its reference with every check's measurement, and mark each verdict as the right or wrong call.
The grader lives in `src/stroke/grade.ts`; its limits are in `TOLERANCE`.

Neither the endpoint nor `grader.html` is part of the production build.

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml`: install, `pnpm strokes`, `pnpm check`, `pnpm build`, then publish
`dist/` to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions** once.

## AI disclaimer

Much of this code was written with [Claude Code](https://claude.com/claude-code), an AI coding assistant,
working under the author's direction. The author chose the design and reviewed the app as it was built, but not
every line was written by hand. Read the code before you reuse it, and report anything that looks wrong.

The stroke-matching feedback is a heuristic, not a teacher. It can accept a stroke that is wrong or reject one
that is fine. Trust a reference chart over it.

## Licence

The code is under the [Kana Sketch License](LICENSE), which is the MIT licence with conditions added. You may not
use the code to train, fine-tune or otherwise develop AI models, or put it in datasets made for that, without
written permission. Using AI coding tools to read or change the code for your own use is fine. Copies and
derived works must carry the same conditions.

Because of the training restriction, this is not an OSI-approved open source licence.

## Credits

The default stroke data is [KanjiVG](https://kanjivg.tagaini.net) by Ulrich Apel, licensed
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). This repository doesn't include it, but a
site built with it does, because the strokes are bundled into the app. That bundled data stays under
CC BY-SA 3.0, which is why the app credits KanjiVG. The Kana Sketch License doesn't apply to it.
