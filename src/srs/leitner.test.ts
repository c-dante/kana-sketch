import { describe, expect, it } from "vitest";
import { DAY, INTERVALS, MAX_BOX, dueChars, introduce, nextUnlearned, practicePick, review } from "./leitner";

const now = 1_000_000;

describe("leitner deck", () => {
  it("makes a newly introduced card due immediately in box 1", () => {
    expect(introduce({}, "あ", now)).toEqual({ あ: { box: 1, due: now } });
  });

  it("refuses to re-introduce a card, which would wipe its progress", () => {
    expect(() => introduce({ あ: { box: 3, due: now } }, "あ", now)).toThrow(/already/);
  });

  it("promotes remembered cards and schedules them by the new box", () => {
    const deck = review({ あ: { box: 1, due: now } }, "あ", true, now);
    expect(deck.あ).toEqual({ box: 2, due: now + INTERVALS[2]! });
    expect(INTERVALS[2]).toBe(DAY);
  });

  it("caps promotion at the top box", () => {
    const deck = review({ あ: { box: MAX_BOX, due: now } }, "あ", true, now);
    expect(deck.あ?.box).toBe(MAX_BOX);
  });

  it("sends forgotten cards back to box 1", () => {
    const deck = review({ あ: { box: 4, due: now } }, "あ", false, now);
    expect(deck.あ).toEqual({ box: 1, due: now + INTERVALS[1]! });
  });

  it("leaves the schedule alone when a card is remembered before it is due", () => {
    const deck = { あ: { box: 3, due: now + DAY } };
    expect(review(deck, "あ", true, now)).toEqual(deck);
  });

  it("still demotes a card that is forgotten before it is due", () => {
    const deck = review({ あ: { box: 3, due: now + DAY } }, "あ", false, now);
    expect(deck.あ?.box).toBe(1);
  });

  it("rejects reviewing a card that was never introduced", () => {
    expect(() => review({}, "あ", true, now)).toThrow(/introduce/);
  });

  it("lists only due cards, most overdue first", () => {
    const deck = {
      あ: { box: 2, due: now - 10 },
      い: { box: 1, due: now - 500 },
      う: { box: 3, due: now + 1 },
    };
    expect(dueChars(deck, now)).toEqual(["い", "あ"]);
  });

  it("picks practice cards from the lowest boxes first, whatever their due dates", () => {
    const deck = {
      あ: { box: 5, due: now + DAY },
      い: { box: 1, due: now + DAY },
      う: { box: 3, due: now - DAY },
      え: { box: 2, due: now + DAY },
    };
    expect(practicePick(deck, 3).sort()).toEqual(["い", "う", "え"].sort());
  });

  it("picks the first character in lesson order that is not in the deck", () => {
    expect(nextUnlearned(["あ", "い", "う"], { あ: { box: 1, due: now } })).toBe("い");
    expect(nextUnlearned(["あ"], { あ: { box: 1, due: now } })).toBeUndefined();
  });
});
