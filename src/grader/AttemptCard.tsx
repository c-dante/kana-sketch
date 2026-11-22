import type { Kana } from "../data/kana";
import type { AttemptReview, StrokeAttempt } from "../examples";
import {
  TOLERANCE,
  centered,
  centroid,
  checkStroke,
  gradeStroke,
  measureStroke,
  resample,
  type CheckName,
  type Point,
  type StrokeMeasurement,
} from "../stroke/grade";

const UNITS = 109;
const MIDDLE = UNITS / 2;

const polyline = (points: Point[]) => points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");

const fixed = (n: number | null, digits = 1) => (n === null ? "skipped" : n.toFixed(digits));

const CHECKS: { name: CheckName; label: string; limit: string; format: (m: StrokeMeasurement) => string; about: string }[] = [
  {
    name: "directionCosine",
    label: "Direction",
    limit: "> 0",
    format: (m) => fixed(m.directionCosine, 2),
    about: "Cosine between your start→end arrow and the reference's. 1 = same way, −1 = backwards.",
  },
  {
    name: "lengthRatio",
    label: "Length",
    limit: `${TOLERANCE.lengthRatio.min}–${TOLERANCE.lengthRatio.max}×`,
    format: (m) => fixed(m.lengthRatio, 2),
    about: "Your stroke's length divided by the reference's. Skipped for strokes shorter than 12 units.",
  },
  {
    name: "meanDistance",
    label: "Shape gap",
    limit: `≤ ${TOLERANCE.meanDistance}`,
    format: (m) => fixed(m.meanDistance),
    about: "Average length of the grey lines in the centred view: how far apart matching points are.",
  },
  {
    name: "startDistance",
    label: "Start gap",
    limit: `≤ ${TOLERANCE.endpointDistance}`,
    format: (m) => fixed(m.startDistance),
    about: "Distance between the two start points in the centred view.",
  },
  {
    name: "endDistance",
    label: "End gap",
    limit: `≤ ${TOLERANCE.endpointDistance}`,
    format: (m) => fixed(m.endDistance),
    about: "Distance between the two end points in the centred view.",
  },
  {
    name: "centroidOffset",
    label: "Position",
    limit: `≤ ${TOLERANCE.positionOffset}`,
    format: (m) => fixed(m.centroidOffset),
    about: "Distance between the two strokes' centres on the real grid (the dashed line).",
  },
];

type Props = {
  kana: Kana;
  attempt: StrokeAttempt;
  references: Point[][];
  onReview: (review: AttemptReview | null) => void;
};

// One graded stroke attempt: where it was drawn, how its shape compares, and every check's numbers.
export function AttemptCard({ kana, attempt, references, onReview }: Props) {
  const expected = references[attempt.expectedStroke]!;
  const drawn = resample(attempt.points);
  const target = resample(expected);
  const measurement = measureStroke(drawn, target);
  const passed = checkStroke(measurement);
  const now = gradeStroke(attempt.points, references, attempt.expectedStroke);
  const currentVerdict = now.ok ? "ok" : now.reason;
  const ownCentre = centroid(drawn);
  const refCentre = centroid(target);
  const shiftToMiddle = (points: Point[]) => centered(points).map((p) => ({ x: p.x + MIDDLE, y: p.y + MIDDLE }));
  const ownShape = shiftToMiddle(drawn);
  const refShape = shiftToMiddle(target);

  const toggle = (review: AttemptReview) => onReview(attempt.review === review ? null : review);

  return (
    <article class={`attempt ${attempt.review ?? ""}`}>
      <header class="attempt-header">
        <strong>Stroke {attempt.expectedStroke + 1}</strong>
        <span class={`verdict-chip ${attempt.verdict === "ok" ? "good" : "bad"}`}>said: {attempt.verdict}</span>
        {currentVerdict !== attempt.verdict && (
          <span class={`verdict-chip changed`}>grader now: {currentVerdict}</span>
        )}
      </header>

      <div class="attempt-views">
        <figure>
          <svg viewBox={`0 0 ${UNITS} ${UNITS}`} class="attempt-svg">
            {kana.strokes.map((d) => (
              <path d={d} class="g-ref-other" />
            ))}
            <path d={kana.strokes[attempt.expectedStroke]} class="g-ref" />
            <path d={polyline(attempt.points)} class="g-drawn" />
            <circle cx={target[0]!.x} cy={target[0]!.y} r="2.2" class="g-ref-start" />
            <circle cx={drawn[0]!.x} cy={drawn[0]!.y} r="2.2" class="g-drawn-start" />
            <line x1={refCentre.x} y1={refCentre.y} x2={ownCentre.x} y2={ownCentre.y} class="g-offset" />
            <circle cx={refCentre.x} cy={refCentre.y} r="1.3" class="g-ref-centre" />
            <circle cx={ownCentre.x} cy={ownCentre.y} r="1.3" class="g-drawn-centre" />
          </svg>
          <figcaption>On the grid</figcaption>
        </figure>
        <figure>
          <svg viewBox={`0 0 ${UNITS} ${UNITS}`} class="attempt-svg">
            {ownShape.map((p, i) => (
              <line x1={p.x} y1={p.y} x2={refShape[i]!.x} y2={refShape[i]!.y} class="g-pair" />
            ))}
            <path d={polyline(refShape)} class="g-ref" />
            <path d={polyline(ownShape)} class="g-drawn" />
            <circle cx={refShape[0]!.x} cy={refShape[0]!.y} r="2.2" class="g-ref-start" />
            <circle cx={ownShape[0]!.x} cy={ownShape[0]!.y} r="2.2" class="g-drawn-start" />
          </svg>
          <figcaption>Shape, centred</figcaption>
        </figure>
      </div>

      <table class="checks">
        <tbody>
          {CHECKS.map((c) => (
            <tr class={passed[c.name] ? "pass" : "fail"} title={c.about}>
              <td>{passed[c.name] ? "✓" : "✗"}</td>
              <td>{c.label}</td>
              <td class="num">{c.format(measurement)}</td>
              <td class="limit">{c.limit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div class="actions">
        <button class={attempt.review === "agree" ? "primary" : ""} onClick={() => toggle("agree")}>
          Right call
        </button>
        <button class={attempt.review === "disagree" ? "primary" : ""} onClick={() => toggle("disagree")}>
          Wrong call
        </button>
      </div>
    </article>
  );
}
