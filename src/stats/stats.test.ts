import { describe, expect, it } from "vitest";
import { emptyTally, recordDrawing, recordReview } from "./stats";

describe("character stats", () => {
  it("accumulates mistakes by reason and counts only mistake-free drawings as clean", () => {
    let stats = recordDrawing({}, "あ", { ...emptyTally(), shape: 2, order: 1 }, 100);
    stats = recordDrawing(stats, "あ", emptyTally(), 200);
    stats = recordReview(stats, "あ", true, 300);
    expect(stats.あ).toEqual({
      drawn: 2,
      clean: 1,
      mistakes: { order: 1, direction: 0, position: 0, shape: 2 },
      reviews: 1,
      remembered: 1,
      lastPracticed: 300,
    });
  });
});
