import { useEffect } from "preact/hooks";
import type { Kana } from "../data/kana";
import { speak, useJapaneseVoice } from "../speech";

type Props = { kana: Kana; playKey?: number };

// Romaji prompt that pronounces the kana, auto-playing whenever the kana or playKey changes.
export function SpeakButton({ kana, playKey = 0 }: Props) {
  const voice = useJapaneseVoice();

  useEffect(() => {
    if (voice) speak(kana.char);
  }, [kana.char, voice, playKey]);

  const muted = voice === false;
  return (
    <div class="prompt">
      <button
        class="romaji"
        onClick={() => speak(kana.char)}
        disabled={muted}
        title={muted ? "No Japanese voice is installed for this browser" : `Hear ${kana.romaji}`}
        aria-label={muted ? `${kana.romaji} (no Japanese voice available)` : `Hear ${kana.romaji}`}
      >
        {kana.romaji} <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
      </button>
      {muted && <p class="hint small">No Japanese voice found in this browser, so audio is off.</p>}
    </div>
  );
}
