import { HIRAGANA, type Kana } from "../data/kana";
import type { Deck } from "../srs/leitner";

type Props = {
  deck: Deck;
  next: Kana | undefined;
  dueCount: number;
  onLearn: () => void;
  onReview: () => void;
  onPractice: () => void;
  onPick: (char: string) => void;
  onStats: () => void;
  onTransfer: () => void;
  onTips: () => void;
};

// Dashboard: learn, review, practise, see progress, or pick any character.
export function Home({ deck, next, dueCount, onLearn, onReview, onPractice, onPick, onStats, onTransfer, onTips }: Props) {
  const hasLearned = Object.keys(deck).length > 0;
  return (
    <section class="screen">
      <h1 class="title">Kana Sketch</h1>
      <div class="actions">
        <button class="primary" onClick={onLearn} disabled={!next}>
          {next ? `Learn ${next.char} (${next.romaji})` : "All hiragana learned"}
        </button>
        <button onClick={onReview} disabled={dueCount === 0}>
          Review · {dueCount} due
        </button>
        <button onClick={onPractice} disabled={!hasLearned}>
          Practice
        </button>
      </div>

      <div class="grid" aria-label="Progress">
        {HIRAGANA.map((k) => {
          const box = deck[k.char]?.box;
          return (
            <button
              class={`tile ${box ? `box-${box}` : "unlearned"}`}
              onClick={() => onPick(k.char)}
              title={box ? `Review ${k.romaji} (box ${box} of 5)` : `Learn ${k.romaji}`}
            >
              <span class="tile-char">{k.char}</span>
              <span class="tile-romaji">{k.romaji}</span>
            </button>
          );
        })}
      </div>

      <nav class="pad-tools">
        <button class="link" onClick={onStats}>
          Stats
        </button>
        <button class="link" onClick={onTransfer}>
          Transfer progress
        </button>
      </nav>

      <footer class="credits">
        <p>
          Enjoying Kana Sketch?{" "}
          <button class="link" onClick={onTips}>
            Leave a tip
          </button>
        </p>
        <p>
          Stroke data from <a href="https://kanjivg.tagaini.net">KanjiVG</a> by Ulrich Apel, licensed{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>.
        </p>
      </footer>
    </section>
  );
}
