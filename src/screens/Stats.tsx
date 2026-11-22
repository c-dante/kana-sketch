import { HIRAGANA } from "../data/kana";
import type { Profile } from "../profile/profile";
import { MISTAKE_REASONS, type CharStats } from "../stats/stats";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const percent = (part: number, whole: number) => (whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`);

function ago(timestamp: number | null, now: number): string {
  if (timestamp === null) return "never";
  const elapsed = now - timestamp;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.round(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.round(elapsed / HOUR)}h ago`;
  return `${Math.round(elapsed / DAY)}d ago`;
}

function commonestMistake(stats: CharStats): string {
  const [reason, count] = MISTAKE_REASONS.map((r) => [r, stats.mistakes[r]] as const).sort((a, b) => b[1] - a[1])[0]!;
  return count === 0 ? "–" : `${reason} ×${count}`;
}

// Per-character table of practice history, in lesson order.
export function Stats({ profile, onExit }: { profile: Profile; onExit: () => void }) {
  const now = Date.now();
  const rows = HIRAGANA.filter((k) => profile.deck[k.char] || profile.stats[k.char]);

  return (
    <section class="screen">
      <header class="screen-header">
        <button class="link" onClick={onExit}>
          ← Home
        </button>
        <span class="step-label">Stats</span>
      </header>

      {rows.length === 0 ? (
        <p class="hint">Learn a character to start collecting stats.</p>
      ) : (
        <table class="stats">
          <thead>
            <tr>
              <th>Kana</th>
              <th title="Leitner box, 1–5">Box</th>
              <th title="Drawings from memory, and the share with no mistakes">Clean</th>
              <th title="Graded reviews, and the share remembered">Recall</th>
              <th>Main slip</th>
              <th>Last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => {
              const st = profile.stats[k.char];
              return (
                <tr>
                  <td class="stats-char">
                    {k.char} <span class="tile-romaji">{k.romaji}</span>
                  </td>
                  <td>{profile.deck[k.char]?.box ?? "–"}</td>
                  <td>{st ? `${percent(st.clean, st.drawn)} of ${st.drawn}` : "–"}</td>
                  <td>{st ? `${percent(st.remembered, st.reviews)} of ${st.reviews}` : "–"}</td>
                  <td>{st ? commonestMistake(st) : "–"}</td>
                  <td>{ago(st?.lastPracticed ?? null, now)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
