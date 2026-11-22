import type { MistakeReason } from "../stroke/grade";

export type MistakeTally = Record<MistakeReason, number>;

export type CharStats = {
  drawn: number;
  clean: number;
  mistakes: MistakeTally;
  reviews: number;
  remembered: number;
  lastPracticed: number | null;
};

export type Stats = Record<string, CharStats>;

export const MISTAKE_REASONS: MistakeReason[] = ["order", "direction", "position", "shape"];

export const emptyTally = (): MistakeTally => ({ order: 0, direction: 0, position: 0, shape: 0 });

export const totalMistakes = (tally: MistakeTally) => MISTAKE_REASONS.reduce((sum, r) => sum + tally[r], 0);

const emptyCharStats = (): CharStats => ({
  drawn: 0,
  clean: 0,
  mistakes: emptyTally(),
  reviews: 0,
  remembered: 0,
  lastPracticed: null,
});

// Count one from-memory drawing of a character and the mistakes made along the way.
export function recordDrawing(stats: Stats, char: string, tally: MistakeTally, now: number): Stats {
  const current = stats[char] ?? emptyCharStats();
  const mistakes = { ...current.mistakes };
  MISTAKE_REASONS.forEach((r) => (mistakes[r] += tally[r]));
  return {
    ...stats,
    [char]: {
      ...current,
      drawn: current.drawn + 1,
      clean: current.clean + (totalMistakes(tally) === 0 ? 1 : 0),
      mistakes,
      lastPracticed: now,
    },
  };
}

// Count one graded review of a character.
export function recordReview(stats: Stats, char: string, remembered: boolean, now: number): Stats {
  const current = stats[char] ?? emptyCharStats();
  return {
    ...stats,
    [char]: {
      ...current,
      reviews: current.reviews + 1,
      remembered: current.remembered + (remembered ? 1 : 0),
      lastPracticed: now,
    },
  };
}
