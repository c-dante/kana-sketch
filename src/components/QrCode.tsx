import qrcode from "qrcode-generator";
import { useMemo } from "preact/hooks";

const QUIET_ZONE = 4;

// Scalable QR code for `text`, drawn as one SVG path of dark modules.
export function QrCode({ text, label }: { text: string; label: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, "L");
    qr.addData(text, "Byte");
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++)
      for (let col = 0; col < count; col++)
        if (qr.isDark(row, col)) d += `M${col + QUIET_ZONE},${row + QUIET_ZONE}h1v1h-1z`;
    return { size: count + QUIET_ZONE * 2, path: d };
  }, [text]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} class="qr" role="img" aria-label={label} shape-rendering="crispEdges">
      <rect width={size} height={size} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}
