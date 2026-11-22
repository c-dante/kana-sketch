import { useEffect, useState } from "preact/hooks";
import type { Profile } from "../profile/profile";
import { decodeProfile } from "../profile/transfer";

type Props = { code: string; onConfirm: (profile: Profile) => void; onCancel: () => void };

type State = { status: "decoding" } | { status: "ready"; profile: Profile } | { status: "error"; message: string };

// Decode an incoming transfer code and ask before it replaces this device's progress.
export function ImportConfirm({ code, onConfirm, onCancel }: Props) {
  const [state, setState] = useState<State>({ status: "decoding" });

  useEffect(() => {
    decodeProfile(code)
      .then((profile) => setState({ status: "ready", profile }))
      .catch((error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : String(error) }),
      );
  }, [code]);

  return (
    <section class="screen">
      <h1 class="title">Import progress</h1>
      {state.status === "decoding" && <p class="hint">Reading code…</p>}
      {state.status === "error" && (
        <>
          <p class="hint warning">{state.message}.</p>
          <button onClick={onCancel}>Home</button>
        </>
      )}
      {state.status === "ready" && (
        <>
          <p class="hint">
            Import progress for {Object.keys(state.profile.deck).length} kana? This replaces this device's data.
          </p>
          <div class="actions">
            <button class="primary" onClick={() => onConfirm(state.profile)}>
              Import
            </button>
            <button onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </section>
  );
}
