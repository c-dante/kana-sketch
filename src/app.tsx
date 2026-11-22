import { useState } from "preact/hooks";
import { LESSON_ORDER, kanaFor } from "./data/kana";
import type { Profile } from "./profile/profile";
import { loadProfile, saveProfile } from "./profile/storage";
import { importCodeFrom } from "./profile/transfer";
import { Home } from "./screens/Home";
import { ImportConfirm } from "./screens/ImportConfirm";
import { Lesson } from "./screens/Lesson";
import { Review } from "./screens/Review";
import { Stats } from "./screens/Stats";
import { Tips } from "./screens/Tips";
import { Transfer } from "./screens/Transfer";
import { dueChars, introduce, nextUnlearned, practicePick, review } from "./srs/leitner";
import { recordDrawing, recordReview } from "./stats/stats";

const PRACTICE_SIZE = 10;

type Screen =
  | { name: "home" }
  | { name: "lesson"; char: string }
  | { name: "review"; title: string; queue: string[] }
  | { name: "stats" }
  | { name: "transfer" }
  | { name: "tips" }
  | { name: "import"; code: string };

const HOME: Screen = { name: "home" };

function initialScreen(): Screen {
  const code = location.hash ? importCodeFrom(location.hash) : null;
  return code ? { name: "import", code } : HOME;
}

const clearImportHash = () => history.replaceState(null, "", location.pathname + location.search);

export function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [screen, setScreen] = useState<Screen>(initialScreen);

  const commit = (update: (profile: Profile) => Profile) =>
    setProfile((current) => {
      const updated = update(current);
      saveProfile(updated);
      return updated;
    });

  const { deck } = profile;
  const due = dueChars(deck, Date.now());
  const nextChar = nextUnlearned(LESSON_ORDER, deck);
  const goHome = () => setScreen(HOME);
  const startReview = () => setScreen({ name: "review", title: "Review", queue: dueChars(deck, Date.now()) });

  switch (screen.name) {
    case "home":
      return (
        <Home
          deck={deck}
          next={nextChar ? kanaFor(nextChar) : undefined}
          dueCount={due.length}
          onLearn={() => nextChar && setScreen({ name: "lesson", char: nextChar })}
          onReview={startReview}
          onPractice={() => setScreen({ name: "review", title: "Practice", queue: practicePick(deck, PRACTICE_SIZE) })}
          onPick={(char) =>
            setScreen(deck[char] ? { name: "review", title: "Practice", queue: [char] } : { name: "lesson", char })
          }
          onStats={() => setScreen({ name: "stats" })}
          onTransfer={() => setScreen({ name: "transfer" })}
          onTips={() => setScreen({ name: "tips" })}
        />
      );
    case "lesson":
      return (
        <Lesson
          kana={kanaFor(screen.char)}
          dueCount={due.length}
          onLearned={(char, mistakes) =>
            commit((p) => {
              const now = Date.now();
              return { deck: introduce(p.deck, char, now), stats: recordDrawing(p.stats, char, mistakes, now) };
            })
          }
          onReview={startReview}
          onExit={goHome}
        />
      );
    case "review":
      return (
        <Review
          title={screen.title}
          initialQueue={screen.queue}
          onGrade={(char, remembered, mistakes) =>
            commit((p) => {
              const now = Date.now();
              const drawn = mistakes ? recordDrawing(p.stats, char, mistakes, now) : p.stats;
              return { deck: review(p.deck, char, remembered, now), stats: recordReview(drawn, char, remembered, now) };
            })
          }
          onExit={goHome}
        />
      );
    case "stats":
      return <Stats profile={profile} onExit={goHome} />;
    case "tips":
      return <Tips onExit={goHome} />;
    case "transfer":
      return <Transfer profile={profile} onImport={(code) => setScreen({ name: "import", code })} onExit={goHome} />;
    case "import":
      return (
        <ImportConfirm
          code={screen.code}
          onConfirm={(imported) => {
            commit(() => imported);
            clearImportHash();
            goHome();
          }}
          onCancel={() => {
            clearImportHash();
            goHome();
          }}
        />
      );
  }
}
