import { LESSON_ORDER } from "../data/kana";
import { MAX_BOX, type Card } from "../srs/leitner";
import type { CharStats } from "../stats/stats";
import type { Profile } from "./profile";

const VERSION = 1;
const MINUTE = 60_000;
const IMPORT_PREFIX = "#import=";
const DAMAGED = "This transfer code is damaged or incomplete; export it again";

const NO_CARD = 0;
const NEVER = -1;

type PackedCard = [box: number, dueOffset: number];
type PackedStats = [
  drawn: number,
  clean: number,
  order: number,
  direction: number,
  position: number,
  shape: number,
  reviews: number,
  remembered: number,
  lastPracticedOffset: number,
];
type PackedEntry = [] | PackedCard | [...PackedCard, ...PackedStats];
type Packed = { v: number; base: number; kana: PackedEntry[] };

async function pipeBytes(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (code: string) =>
  Uint8Array.from(atob(code.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const toMinute = (ms: number) => Math.round(ms / MINUTE);

function checkKnown(profile: Profile) {
  for (const char of [...Object.keys(profile.deck), ...Object.keys(profile.stats)])
    if (!LESSON_ORDER.includes(char)) throw new Error(`Profile contains "${char}", which is not a supported hiragana`);
}

function pack(profile: Profile): Packed {
  checkKnown(profile);
  const times = [
    ...Object.values(profile.deck).map((c) => toMinute(c.due)),
    ...Object.values(profile.stats).flatMap((s) => (s.lastPracticed === null ? [] : [toMinute(s.lastPracticed)])),
  ];
  const base = times.length ? Math.min(...times) : 0;

  const kana = LESSON_ORDER.map((char): PackedEntry => {
    const card = profile.deck[char];
    const st = profile.stats[char];
    const packedCard: PackedCard = card ? [card.box, toMinute(card.due) - base] : [NO_CARD, 0];
    if (!st) return card ? packedCard : [];
    const { order, direction, position, shape } = st.mistakes;
    const last = st.lastPracticed === null ? NEVER : toMinute(st.lastPracticed) - base;
    return [...packedCard, st.drawn, st.clean, order, direction, position, shape, st.reviews, st.remembered, last];
  });
  return { v: VERSION, base, kana };
}

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

function unpackCard([box, dueOffset]: PackedCard, base: number): Card | undefined {
  if (box === NO_CARD) return undefined;
  if (box < 1 || box > MAX_BOX) throw new Error(DAMAGED);
  return { box, due: (base + dueOffset) * MINUTE };
}

function unpackStats(values: PackedStats, base: number): CharStats {
  const [drawn, clean, order, direction, position, shape, reviews, remembered, last] = values;
  if (![drawn, clean, order, direction, position, shape, reviews, remembered].every(isCount)) throw new Error(DAMAGED);
  if (last !== NEVER && !isCount(last)) throw new Error(DAMAGED);
  return {
    drawn,
    clean,
    mistakes: { order, direction, position, shape },
    reviews,
    remembered,
    lastPracticed: last === NEVER ? null : (base + last) * MINUTE,
  };
}

// Compress a profile into a URL-safe code for QR codes and copy/paste.
export async function encodeProfile(profile: Profile): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(pack(profile)));
  return toBase64Url(await pipeBytes(json, new CompressionStream("deflate-raw")));
}

// Reverse encodeProfile, rejecting anything that is not a valid profile.
export async function decodeProfile(code: string): Promise<Profile> {
  let packed: Packed;
  try {
    const json = await pipeBytes(fromBase64Url(code), new DecompressionStream("deflate-raw"));
    packed = JSON.parse(new TextDecoder().decode(json));
  } catch {
    throw new Error(DAMAGED);
  }
  if (packed?.v !== VERSION) throw new Error(`Unsupported transfer code version ${packed?.v}; update the app on this device`);
  if (!isCount(packed.base) || !Array.isArray(packed.kana) || packed.kana.length !== LESSON_ORDER.length)
    throw new Error(DAMAGED);

  const profile: Profile = { deck: {}, stats: {} };
  packed.kana.forEach((entry, i) => {
    const char = LESSON_ORDER[i]!;
    if (!Array.isArray(entry) || ![0, 2, 11].includes(entry.length) || !entry.every(Number.isInteger))
      throw new Error(DAMAGED);
    if (entry.length === 0) return;
    const card = unpackCard(entry.slice(0, 2) as PackedCard, packed.base);
    if (card) profile.deck[char] = card;
    if (entry.length === 11) profile.stats[char] = unpackStats(entry.slice(2) as PackedStats, packed.base);
  });
  return profile;
}

// Link that opens the app at this origin and offers to import the code.
export const importUrl = (code: string) => `${location.origin}${location.pathname}${IMPORT_PREFIX}${code}`;

// Extract a transfer code from a pasted import link or bare code.
export function importCodeFrom(text: string): string | null {
  const trimmed = text.trim();
  const at = trimmed.indexOf(IMPORT_PREFIX);
  if (at >= 0) return trimmed.slice(at + IMPORT_PREFIX.length) || null;
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}
