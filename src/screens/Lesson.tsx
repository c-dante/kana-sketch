import { useState } from "preact/hooks";
import { DrawPad } from "../components/DrawPad";
import { SpeakButton } from "../components/SpeakButton";
import type { Kana } from "../data/kana";
import type { MistakeTally } from "../stats/stats";

type Step = "trace" | "recall" | "done";

type Props = {
  kana: Kana;
  dueCount: number;
  onLearned: (char: string, mistakes: MistakeTally) => void;
  onReview: () => void;
  onExit: () => void;
};

// Introduce one character: trace it over an animated stroke guide, then write it from memory.
export function Lesson({ kana, dueCount, onLearned, onReview, onExit }: Props) {
  const [step, setStep] = useState<Step>("trace");

  const finishRecall = (mistakes: MistakeTally) => {
    onLearned(kana.char, mistakes);
    setStep("done");
  };

  return (
    <section class="screen">
      <header class="screen-header">
        <button class="link" onClick={onExit}>
          ← Home
        </button>
        <span class="step-label">{STEP_LABELS[step]}</span>
      </header>

      <SpeakButton kana={kana} />

      {step === "trace" && <DrawPad key="trace" kana={kana} guide onDone={() => setStep("recall")} />}

      {step === "recall" && <DrawPad key="recall" kana={kana} guide={false} onDone={finishRecall} />}

      {step === "done" && (
        <>
          <div class="big-char">{kana.char}</div>
          <p class="hint">Learned! {kana.char} is now in your review deck.</p>
          <div class="actions">
            <button class="primary" onClick={onReview}>
              Review · {dueCount} due
            </button>
            <button onClick={onExit}>Home</button>
          </div>
        </>
      )}
    </section>
  );
}

const STEP_LABELS: Record<Step, string> = {
  trace: "Watch, then trace",
  recall: "Now from memory",
  done: "Done",
};
