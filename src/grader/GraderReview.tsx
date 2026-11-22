import { useEffect, useState } from "preact/hooks";
import { kanaFor } from "../data/kana";
import { listExamples, reviewAttempt, type SavedExample } from "../examples";
import { AttemptCard } from "./AttemptCard";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; examples: SavedExample[] };

const reviewedCount = ({ example }: SavedExample) => example.attempts.filter((a) => a.review).length;

// Dev page for judging whether each saved stroke verdict was the right call.
export function GraderReview() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    listExamples()
      .then((examples) => {
        setLoad({ status: "ready", examples });
        setSelected(examples[0]?.file ?? null);
      })
      .catch((error: unknown) => setLoad({ status: "error", message: String(error) }));
  }, []);

  if (load.status === "loading") return <p class="hint">Loading examples…</p>;
  if (load.status === "error")
    return <p class="hint warning">Couldn't load examples ({load.message}). This page only works under pnpm dev.</p>;

  const current = load.examples.find((e) => e.file === selected);

  const setReview = async (attemptIndex: number, review: Parameters<typeof reviewAttempt>[2]) => {
    if (!current) return;
    const updated = await reviewAttempt(current.file, attemptIndex, review);
    setLoad({
      status: "ready",
      examples: load.examples.map((e) => (e.file === current.file ? { ...e, example: updated } : e)),
    });
  };

  return (
    <div class="grader">
      <aside class="grader-list">
        <h1 class="title">Grader review</h1>
        {load.examples.length === 0 && <p class="hint">No examples yet. Use "Save drawing" in the app.</p>}
        {load.examples.map((saved) => (
          <button
            class={`example-item ${saved.file === selected ? "selected" : ""}`}
            onClick={() => setSelected(saved.file)}
          >
            <span class="example-char">{saved.example.char}</span>
            <span class="example-meta">
              {saved.example.mode} · {new Date(saved.example.savedAt).toLocaleString()}
              <br />
              {reviewedCount(saved)}/{saved.example.attempts.length} reviewed
              {saved.example.note && <em> · “{saved.example.note}”</em>}
            </span>
          </button>
        ))}
      </aside>

      {current && (
        <main class="grader-detail">
          <h2 class="section-title">
            {current.example.char} · {current.example.mode}
            {current.example.note && <span class="hint"> — “{current.example.note}”</span>}
          </h2>
          <p class="hint legend">
            <span class="swatch ref" /> reference <span class="swatch drawn" /> your stroke · dots mark starts, small
            dots mark centres. Hover a check for what it measures.
          </p>
          <div class="attempts">
            {current.example.attempts.map((attempt, i) => (
              <AttemptCard
                key={`${current.file}-${i}`}
                kana={kanaFor(current.example.char)}
                attempt={attempt}
                references={current.example.references}
                onReview={(review) => setReview(i, review)}
              />
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
