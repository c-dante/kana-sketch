export type Point = { x: number; y: number };

export type MistakeReason = "order" | "direction" | "position" | "shape";

export type StrokeVerdict = { ok: true } | { ok: false; reason: MistakeReason };

const SAMPLE_COUNT = 32;

export const TOLERANCE = {
  meanDistance: 13,
  endpointDistance: 20,
  positionOffset: 22,
  minDirectionLength: 4,
  minLengthCheck: 12,
  lengthRatio: { min: 0.6, max: 1.6 },
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Redistribute a polyline into `count` points evenly spaced by arc length.
export function resample(points: Point[], count = SAMPLE_COUNT): Point[] {
  const first = points[0];
  if (!first) throw new Error("Cannot resample an empty stroke; pass at least one point");
  const total = points.slice(1).reduce((sum, p, i) => sum + distance(points[i]!, p), 0);
  if (total === 0) return Array.from({ length: count }, () => ({ ...first }));

  const step = total / (count - 1);
  const result: Point[] = [{ ...first }];
  let carried = 0;
  for (let i = 1; i < points.length && result.length < count; i++) {
    let from = points[i - 1]!;
    const to = points[i]!;
    let segment = distance(from, to);
    while (carried + segment >= step && result.length < count) {
      const t = (step - carried) / segment;
      from = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      result.push(from);
      segment = distance(from, to);
      carried = 0;
    }
    carried += segment;
  }
  while (result.length < count) result.push({ ...points[points.length - 1]! });
  return result;
}

const pathLength = (points: Point[]) => points.slice(1).reduce((sum, p, i) => sum + distance(points[i]!, p), 0);

export function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function centered(points: Point[]): Point[] {
  const c = centroid(points);
  return points.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

const span = (points: Point[]) => ({ x: points.at(-1)!.x - points[0]!.x, y: points.at(-1)!.y - points[0]!.y });

export type StrokeMeasurement = {
  directionCosine: number | null;
  lengthRatio: number | null;
  meanDistance: number;
  startDistance: number;
  endDistance: number;
  centroidOffset: number;
};

export type CheckName = keyof StrokeMeasurement;

// Raw numbers comparing two resampled strokes; null means the reference is too short for that check.
export function measureStroke(drawn: Point[], reference: Point[]): StrokeMeasurement {
  const refSpan = span(reference);
  const ownSpan = span(drawn);
  const refSpanLength = Math.hypot(refSpan.x, refSpan.y);
  const ownSpanLength = Math.hypot(ownSpan.x, ownSpan.y);
  const directionCosine =
    refSpanLength < TOLERANCE.minDirectionLength
      ? null
      : ownSpanLength === 0
        ? -1
        : (ownSpan.x * refSpan.x + ownSpan.y * refSpan.y) / (ownSpanLength * refSpanLength);

  const refLength = pathLength(reference);
  const own = centered(drawn);
  const ref = centered(reference);
  return {
    directionCosine,
    lengthRatio: refLength < TOLERANCE.minLengthCheck ? null : pathLength(drawn) / refLength,
    meanDistance: own.reduce((sum, p, i) => sum + distance(p, ref[i]!), 0) / own.length,
    startDistance: distance(own[0]!, ref[0]!),
    endDistance: distance(own.at(-1)!, ref.at(-1)!),
    centroidOffset: distance(centroid(drawn), centroid(reference)),
  };
}

// Pass/fail for each measurement against TOLERANCE.
export function checkStroke(m: StrokeMeasurement): Record<CheckName, boolean> {
  return {
    directionCosine: m.directionCosine === null || m.directionCosine > 0,
    lengthRatio:
      m.lengthRatio === null || (m.lengthRatio >= TOLERANCE.lengthRatio.min && m.lengthRatio <= TOLERANCE.lengthRatio.max),
    meanDistance: m.meanDistance <= TOLERANCE.meanDistance,
    startDistance: m.startDistance <= TOLERANCE.endpointDistance,
    endDistance: m.endDistance <= TOLERANCE.endpointDistance,
    centroidOffset: m.centroidOffset <= TOLERANCE.positionOffset,
  };
}

function shapeFits(drawn: Point[], reference: Point[]): boolean {
  const { centroidOffset, ...shape } = checkStroke(measureStroke(drawn, reference));
  return Object.values(shape).every(Boolean);
}

const fits = (drawn: Point[], reference: Point[]) =>
  Object.values(checkStroke(measureStroke(drawn, reference))).every(Boolean);

// Judge a drawn stroke against the stroke expected at `index`, naming the most likely mistake.
export function gradeStroke(drawn: Point[], references: Point[][], index: number): StrokeVerdict {
  const expected = references[index];
  if (!expected) throw new Error(`Stroke index ${index} is out of range; character has ${references.length} strokes`);

  const sampled = resample(drawn);
  const target = resample(expected);
  if (fits(sampled, target)) return { ok: true };
  if (fits([...sampled].reverse(), target)) return { ok: false, reason: "direction" };
  if (references.slice(index + 1).some((later) => fits(sampled, resample(later)))) return { ok: false, reason: "order" };
  if (shapeFits(sampled, target)) return { ok: false, reason: "position" };
  return { ok: false, reason: "shape" };
}
