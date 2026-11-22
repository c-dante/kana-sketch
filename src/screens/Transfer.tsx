import { useEffect, useRef, useState } from "preact/hooks";
import { copyField } from "../clipboard";
import { QrCode } from "../components/QrCode";
import type { Profile } from "../profile/profile";
import { encodeProfile, importCodeFrom, importUrl } from "../profile/transfer";

type Props = { profile: Profile; onImport: (code: string) => void; onExit: () => void };

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

function download(text: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  link.download = `kana-sketch-progress-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Move progress between devices: show it as a scannable link, or load one back in.
export function Transfer({ profile, onImport, onExit }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const linkField = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    encodeProfile(profile).then((code) => setLink(importUrl(code)));
  }, [profile]);

  const tryImport = (text: string) => {
    const code = importCodeFrom(text);
    if (!code) return setImportError("That doesn't look like a Kana Sketch link or code.");
    onImport(code);
  };

  const loadFile = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) tryImport(await file.text());
  };

  const learnedCount = Object.keys(profile.deck).length;

  return (
    <section class="screen">
      <header class="screen-header">
        <button class="link" onClick={onExit}>
          ← Home
        </button>
        <span class="step-label">Transfer progress</span>
      </header>

      <h2 class="section-title">Send from this device</h2>
      <p class="hint">
        Scan with your other device's camera to open Kana Sketch there with these {learnedCount} kana.
      </p>
      {LOCAL_HOSTS.includes(location.hostname) && (
        <p class="hint warning">
          This link points at {location.hostname}, which other devices can't reach. Open the app by its network
          name (e.g. cachy-box.local) before exporting.
        </p>
      )}
      {link ? (
        <>
          <QrCode text={link} label="QR code linking to an import of this device's progress" />
          <textarea ref={linkField} class="code-field" readOnly value={link} rows={3} />
          <div class="actions">
            <button onClick={() => setCopied(copyField(linkField.current!))}>{copied ? "Copied" : "Copy link"}</button>
            <button onClick={() => download(link)}>Download file</button>
          </div>
        </>
      ) : (
        <p class="hint">Preparing code…</p>
      )}

      <h2 class="section-title">Load onto this device</h2>
      <textarea
        class="code-field"
        rows={3}
        placeholder="Paste a Kana Sketch link or code"
        value={pasted}
        onInput={(e) => setPasted((e.currentTarget as HTMLTextAreaElement).value)}
      />
      <div class="actions">
        <button onClick={() => tryImport(pasted)} disabled={!pasted.trim()}>
          Load pasted code
        </button>
        <label class="button">
          Load file
          <input type="file" accept=".txt,text/plain" hidden onChange={loadFile} />
        </label>
      </div>
      {importError && <p class="hint warning">{importError}</p>}
    </section>
  );
}
