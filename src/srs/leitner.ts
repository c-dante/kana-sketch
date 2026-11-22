export type Card = { box: number; due: number };

export type Deck = Record<string, Card>;

const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

export const INTERVALS: Record<number, number> = {
  1: 10 * MINUTE,
  2: DAY,
  3: 3 * DAY,
  4: 7 * DAY,
  5: 21 * DAY,
};

export const MAX_BOX = 5;

// Add a freshly learned character to the deck, due for review right away.
export function introduce(deck: Deck, char: string, now: number): Deck {
  if (deck[char]) throw new Error(`"${char}" is already in the deck; use review() to update it`);
  return { ...deck, [char]: { box: 1, due: now } };
}

// Move a due card up a box when remembered; any card back to box 1 when forgotten.
export function review(deck: Deck, char: string, remembered: boolean, now: number): Deck {
  const card = deck[char];
  if (!card) throw new Error(`"${char}" is not in the deck; call introduce() first`);
  if (remembered && card.due > now) return deck;
  const box = remembered ? Math.min(card.box + 1, MAX_BOX) : 1;
  return { ...deck, [char]: { box, due: now + INTERVALS[box]! } };
}

// Characters whose review time has arrived, most overdue first.
export function dueChars(deck: Deck, now: number): string[] {
  return Object.entries(deck)
    .filter(([, card]) => card.due <= now)
    .sort(([, a], [, b]) => a.due - b.due)
    .map(([char]) => char);
}

// The next character to teach, following lesson order.
export function nextUnlearned(order: string[], deck: Deck): string | undefined {
  return order.find((char) => !deck[char]);
}

// Up to `count` learned characters for unscheduled practice, weakest boxes first, in shuffled order.
export function practicePick(deck: Deck, count: number, random = Math.random): string[] {
  const shuffle = <T>(items: T[]) =>
    items
      .map((item) => ({ item, key: random() }))
      .sort((a, b) => a.key - b.key)
      .map(({ item }) => item);
  const weakestFirst = shuffle(Object.entries(deck))
    .sort(([, a], [, b]) => a.box - b.box)
    .slice(0, count)
    .map(([char]) => char);
  return shuffle(weakestFirst);
}
