import { emptyProfile, type Profile } from "./profile";

const KEY = "kana-sketch:profile:v1";
const LEGACY_DECK_KEY = "kana-sketch:deck:v1";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw === null ? undefined : JSON.parse(raw);
}

// Read the saved profile, migrating deck-only saves and starting fresh if storage is unreadable.
export function loadProfile(): Profile {
  try {
    const saved = readJson(KEY);
    if (saved !== undefined) {
      if (!isObject(saved) || !isObject(saved.deck) || !isObject(saved.stats)) throw new Error("profile is malformed");
      return saved as Profile;
    }
    const legacyDeck = readJson(LEGACY_DECK_KEY);
    if (legacyDeck === undefined) return emptyProfile();
    if (!isObject(legacyDeck)) throw new Error("legacy deck is malformed");
    const migrated: Profile = { deck: legacyDeck as Profile["deck"], stats: {} };
    saveProfile(migrated);
    localStorage.removeItem(LEGACY_DECK_KEY);
    return migrated;
  } catch (error) {
    console.warn(`Ignoring corrupt saved progress in localStorage["${KEY}"]:`, error);
    return emptyProfile();
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}
