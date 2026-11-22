import { describe, expect, it } from "vitest";
import { gradeStroke, type Point } from "./grade";

const line = (from: Point, to: Point, steps = 20): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => ({
    x: from.x + ((to.x - from.x) * i) / steps,
    y: from.y + ((to.y - from.y) * i) / steps,
  }));

const arc = (cx: number, cy: number, r: number, steps = 30): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const angle = Math.PI + (Math.PI * i) / steps;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

const wobble = (points: Point[], amount: number): Point[] =>
  points.map((p, i) => ({ x: p.x + Math.sin(i) * amount, y: p.y + Math.cos(i * 1.3) * amount }));

const horizontal = line({ x: 20, y: 30 }, { x: 90, y: 30 });
const vertical = line({ x: 55, y: 15 }, { x: 55, y: 95 });
const references = [horizontal, vertical];

describe("gradeStroke", () => {
  it("accepts a shaky, slightly offset copy of the expected stroke", () => {
    const drawn = wobble(horizontal, 3).map((p) => ({ x: p.x + 4, y: p.y + 5 }));
    expect(gradeStroke(drawn, references, 0)).toEqual({ ok: true });
  });

  it("accepts the right shape shifted well off the reference position", () => {
    const drawn = wobble(horizontal, 2).map((p) => ({ x: p.x + 12, y: p.y + 14 }));
    expect(gradeStroke(drawn, references, 0)).toEqual({ ok: true });
  });

  it("flags a stroke that covers only half the expected length as wrong shape", () => {
    const half = line({ x: 20, y: 30 }, { x: 55, y: 30 });
    expect(gradeStroke(half, references, 0)).toEqual({ ok: false, reason: "shape" });
  });

  it("accepts a stroke drawn with far fewer sample points than the reference", () => {
    expect(gradeStroke(line({ x: 21, y: 31 }, { x: 89, y: 29 }, 3), references, 0)).toEqual({ ok: true });
  });

  it("flags a correct stroke drawn backwards as wrong direction", () => {
    expect(gradeStroke([...horizontal].reverse(), references, 0)).toEqual({ ok: false, reason: "direction" });
  });

  it("flags a short dot-like stroke drawn backwards as wrong direction", () => {
    const dot = line({ x: 50, y: 50 }, { x: 58, y: 57 }, 5);
    expect(gradeStroke([...dot].reverse(), [dot], 0)).toEqual({ ok: false, reason: "direction" });
  });

  it("flags drawing a later stroke first as wrong order", () => {
    expect(gradeStroke(vertical, references, 0)).toEqual({ ok: false, reason: "order" });
  });

  it("flags the right shape in the wrong place as wrong position", () => {
    const drawn = horizontal.map((p) => ({ x: p.x, y: p.y + 50 }));
    expect(gradeStroke(drawn, references, 0)).toEqual({ ok: false, reason: "position" });
  });

  it("flags a curve between the right endpoints as wrong shape", () => {
    const straight = line({ x: 20, y: 60 }, { x: 90, y: 60 });
    expect(gradeStroke(arc(55, 60, 35), [straight], 0)).toEqual({ ok: false, reason: "shape" });
  });

  it("rejects an out-of-range stroke index with a clear error", () => {
    expect(() => gradeStroke(horizontal, references, 2)).toThrow(/index 2/);
  });
});
