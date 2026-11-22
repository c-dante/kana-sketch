import { useRef, useState } from "preact/hooks";
import { copyField } from "../clipboard";
import { QrCode } from "../components/QrCode";

const WALLET_ADDRESS = "0x6632e4f98b5f9acecfd264ab21479c5e2d32e431";

// Tip jar: the maintainer's Coinbase Wallet address as a QR code and copyable text.
export function Tips({ onExit }: { onExit: () => void }) {
  const [copied, setCopied] = useState(false);
  const addressField = useRef<HTMLTextAreaElement>(null);

  return (
    <section class="screen">
      <header class="screen-header">
        <button class="link" onClick={onExit}>
          ← Home
        </button>
        <span class="step-label">Tips</span>
      </header>

      <h2 class="section-title">Leave a tip</h2>
      <p class="hint">
        Kana Sketch is free, with no ads or accounts. If it's helping you learn, you can send a tip to this Coinbase
        Wallet address.
      </p>
      <QrCode text={WALLET_ADDRESS} label="QR code of the tip wallet address" />
      <textarea ref={addressField} class="code-field" readOnly value={WALLET_ADDRESS} rows={1} />
      <div class="actions">
        <button onClick={() => setCopied(copyField(addressField.current!))}>{copied ? "Copied" : "Copy address"}</button>
      </div>
      <p class="hint small">Check the address and network in your wallet before you send. Transfers can't be undone.</p>
    </section>
  );
}
