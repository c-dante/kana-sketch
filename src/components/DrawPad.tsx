import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Kana } from "../data/kana";
import { saveExample, type StrokeAttempt } from "../examples";
import { emptyTally, type MistakeTally } from "../stats/stats";
import { gradeStroke, type MistakeReason, type Point } from "../stroke/grade";
import { samplePath } from "../stroke/sample";
import { ReplayButton, StrokeAnimation } from "./StrokeDemo";

const UNITS = 109;
const INK_WIDTH = 4;
const FAILS_BEFORE_HINT = 2;
const MIN_POINTS = 3;

const COLORS = {
  grid: "#e4dccd",
  hint: "#f0a35e",
  ink: "#2b2622",
  rejected: "rgba(205, 70, 70, 0.55)",
};

const MESSAGES: Record<MistakeReason, string> = {
  order: "That's a later stroke. Follow the stroke order.",
  direction: "Right shape, wrong direction.",
  position: "Right shape, but too far from where it belongs.",
  shape: "The shape doesn't match yet. Try again.",
};

type View = { inked: Point[][]; rejected: Point[] | null; showHint: boolean };

type Props = { kana: Kana; guide: boolean; onDone: (mistakes: MistakeTally) => void };

function strokePolyline(ctx: CanvasRenderingContext2D, points: Point[], color: string) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function paint(canvas: HTMLCanvasElement, kana: Kana, view: View, drawing: Point[] | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = canvas.width / UNITS;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(UNITS / 2, 0);
  ctx.lineTo(UNITS / 2, UNITS);
  ctx.moveTo(0, UNITS / 2);
  ctx.lineTo(UNITS, UNITS / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.lineWidth = INK_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const next = kana.strokes[view.inked.length];
  if (next && view.showHint) {
    ctx.strokeStyle = COLORS.hint;
    ctx.stroke(new Path2D(next));
  }
  view.inked.forEach((points) => strokePolyline(ctx, points, COLORS.ink));
  if (view.rejected) strokePolyline(ctx, view.rejected, COLORS.rejected);
  if (drawing) strokePolyline(ctx, drawing, COLORS.ink);
}

// Hollow outline of the reference strokes, drawn beneath the learner's ink for comparison.
function AnswerOutline({ kana }: { kana: Kana }) {
  return (
    <svg viewBox={`0 0 ${UNITS} ${UNITS}`} class="pad-answer" aria-hidden="true">
      {kana.strokes.map((d) => (
        <path d={d} class="answer-outer" />
      ))}
      {kana.strokes.map((d) => (
        <path d={d} class="answer-inner" />
      ))}
    </svg>
  );
}

// Canvas the learner draws on; each stroke is graded in order, with an optional animated guide underneath.
export function DrawPad({ kana, guide, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<Point[] | null>(null);
  const [inked, setInked] = useState<Point[][]>([]);
  const [mistakes, setMistakes] = useState<MistakeTally>(emptyTally);
  const [failsOnStroke, setFailsOnStroke] = useState(0);
  const [rejected, setRejected] = useState<Point[] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [demoRun, setDemoRun] = useState(0);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const attemptsRef = useRef<StrokeAttempt[]>([]);

  const references = useMemo(() => kana.strokes.map(samplePath), [kana]);
  const finished = inked.length === kana.strokes.length;
  const view: View = { inked, rejected, showHint: !finished && (guide || failsOnStroke >= FAILS_BEFORE_HINT) };
  const viewRef = useRef(view);
  viewRef.current = view;

  const repaint = () => {
    if (canvasRef.current) paint(canvasRef.current, kana, viewRef.current, drawingRef.current);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fitToLayout = () => {
      const size = Math.round(canvas.getBoundingClientRect().width * devicePixelRatio);
      canvas.width = size;
      canvas.height = size;
      repaint();
    };
    fitToLayout();
    const observer = new ResizeObserver(fitToLayout);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(repaint, [inked, rejected, view.showHint, kana]);

  const toUnits = (event: PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * UNITS,
      y: ((event.clientY - rect.top) / rect.height) * UNITS,
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    if (finished) return;
    (event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId);
    drawingRef.current = [toUnits(event)];
    setRejected(null);
    repaint();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current.push(toUnits(event));
    repaint();
  };

  const onPointerUp = () => {
    const drawn = drawingRef.current;
    drawingRef.current = null;
    if (!drawn || drawn.length < MIN_POINTS) return repaint();

    const verdict = gradeStroke(drawn, references, inked.length);
    attemptsRef.current.push({
      expectedStroke: inked.length,
      verdict: verdict.ok ? "ok" : verdict.reason,
      points: drawn,
    });
    if (verdict.ok) {
      setInked([...inked, drawn]);
      setFailsOnStroke(0);
      setFeedback(null);
      return;
    }
    setMistakes({ ...mistakes, [verdict.reason]: mistakes[verdict.reason] + 1 });
    setFailsOnStroke(failsOnStroke + 1);
    setRejected(drawn);
    setFeedback(MESSAGES[verdict.reason]);
  };

  const clear = () => {
    attemptsRef.current = [];
    setInked([]);
    setRejected(null);
    setFailsOnStroke(0);
    setFeedback(null);
    setSaveStatus(null);
  };

  const save = async () => {
    if (attemptsRef.current.length === 0) return setSaveStatus("Draw something before saving.");
    const note = prompt("What's wrong with this grading? (optional)") ?? "";
    setSaveStatus("Saving…");
    try {
      const file = await saveExample({
        char: kana.char,
        mode: guide ? "trace" : "recall",
        note,
        attempts: attemptsRef.current,
        references,
      });
      setSaveStatus(`Saved ${file}`);
    } catch (error) {
      setSaveStatus(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div class="pad">
      <div class="pad-surface">
        {guide && <StrokeAnimation key={demoRun} kana={kana} class="pad-guide" />}
        {finished && <AnswerOutline kana={kana} />}
        <canvas
          ref={canvasRef}
          class="pad-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drawingRef.current = null;
            repaint();
          }}
        />
      </div>
      <p class={`pad-feedback ${feedback ? "is-error" : ""}`} aria-live="polite">
        {feedback ?? (finished ? "Done!" : `Stroke ${inked.length + 1} of ${kana.strokes.length}`)}
      </p>
      <div class="pad-tools">
        <button class="link" onClick={clear} disabled={finished}>
          Clear
        </button>
        {guide && <ReplayButton onClick={() => setDemoRun(demoRun + 1)} />}
        {import.meta.env.DEV && (
          <button class="link" onClick={save}>
            Save drawing
          </button>
        )}
      </div>
      {saveStatus && <p class="hint small">{saveStatus}</p>}
      {finished && (
        <button class="primary" onClick={() => onDone(mistakes)}>
          Continue
        </button>
      )}
    </div>
  );
}
