import { useState } from "preact/hooks";
import { DrawPad } from "../components/DrawPad";
import { SpeakButton } from "../components/SpeakButton";
import { StrokeDemo } from "../components/StrokeDemo";
import { kanaFor } from "../data/kana";
import { totalMistakes, type MistakeTally } from "../stats/stats";

const PASS_MAX_MISTAKES = 1;

type Result = { remembered: boolean; mistakes: number | null };

type Props = {
  title: string;
  initialQueue: string[];
  onGrade: (char: string, remembered: boolean, mistakes: MistakeTally | null) => void;
  onExit: () => void;
};

// Flash-card review: hear the sound and see the romaji, write the kana, then see how it went.
export function Review({ title, initialQueue, onGrade, onExit }: Props) {
  const [queue, setQueue] = useState(initialQueue);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const current = queue[0];

  if (!current) {
    return (
      <section class="screen">
        <div class="big-char">✓</div>
        <p class="hint">{title} complete.</p>
        <button class="primary" onClick={onExit}>
          Home
        </button>
      </section>
    );
  }

  const kana = kanaFor(current);

  const grade = (tally: MistakeTally | null) => {
    const mistakes = tally && totalMistakes(tally);
    const remembered = mistakes !== null && mistakes <= PASS_MAX_MISTAKES;
    onGrade(current, remembered, tally);
    setResult({ remembered, mistakes });
  };

  const next = () => {
    const rest = queue.slice(1);
    setQueue(result?.remembered ? rest : [...rest, current]);
    setResult(null);
    setAttempt(attempt + 1);
  };

  return (
    <section class="screen">
      <header class="screen-header">
        <button class="link" onClick={onExit}>
          ← Home
        </button>
        <span class="step-label">
          {title} · {queue.length} left
        </span>
      </header>

      <SpeakButton kana={kana} playKey={attempt} />

      {result ? (
        <>
          <StrokeDemo kana={kana} />
          <p class={`verdict ${result.remembered ? "good" : "bad"}`}>{describe(result)}</p>
          <button class="primary" onClick={next}>
            Next
          </button>
        </>
      ) : (
        <>
          <DrawPad key={attempt} kana={kana} guide={false} onDone={grade} />
          <button class="link" onClick={() => grade(null)}>
            I don't remember. Show me
          </button>
        </>
      )}
    </section>
  );
}

function describe({ remembered, mistakes }: Result): string {
  if (mistakes === null) return "No problem. It'll come back around soon.";
  if (!remembered) return `${mistakes} mistakes. It'll come back around soon.`;
  return mistakes === 0 ? "Perfect!" : "Got it, with one slip.";
}
