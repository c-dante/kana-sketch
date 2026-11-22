import { useEffect, useState } from "preact/hooks";

const VOICE_WAIT_MS = 1500;

const supported = () => "speechSynthesis" in window;

const japaneseVoice = () => speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith("ja"));

// Pronounce Japanese text with the browser's speech engine, if it has a Japanese voice.
export function speak(text: string): void {
  if (!supported()) return;
  const voice = japaneseVoice();
  if (!voice) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = 0.8;
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(utterance), 0);
}

// Whether a Japanese voice exists: null while browsers are still loading their voice list.
export function useJapaneseVoice(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(() => (supported() && japaneseVoice() ? true : null));

  useEffect(() => {
    if (!supported()) return setAvailable(false);
    const check = () => {
      if (japaneseVoice()) setAvailable(true);
    };
    speechSynthesis.addEventListener("voiceschanged", check);
    const timer = setTimeout(() => setAvailable(Boolean(japaneseVoice())), VOICE_WAIT_MS);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", check);
      clearTimeout(timer);
    };
  }, []);

  return available;
}
