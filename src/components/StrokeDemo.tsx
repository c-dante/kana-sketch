import { useState } from "preact/hooks";
import type { Kana } from "../data/kana";
import { samplePath } from "../stroke/sample";

const SECONDS_PER_STROKE = 0.8;

// Animated, numbered stroke order for a character; remount with a new key to replay.
export function StrokeAnimation({ kana, class: className }: { kana: Kana; class: string }) {
  return (
    <svg viewBox="0 0 109 109" class={className} role="img" aria-label={`Stroke order for ${kana.char}`}>
      {kana.strokes.map((d) => (
        <path d={d} class="demo-ghost" />
      ))}
      {kana.strokes.map((d, i) => (
        <path d={d} pathLength={1} class="demo-stroke" style={{ animationDelay: `${i * SECONDS_PER_STROKE}s` }} />
      ))}
      {kana.strokes.map((d, i) => {
        const start = samplePath(d)[0]!;
        return (
          <text x={start.x - 5} y={start.y - 2} class="demo-number">
            {i + 1}
          </text>
        );
      })}
    </svg>
  );
}

export function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button class="link" onClick={onClick}>
      Replay strokes
    </button>
  );
}

// Standalone stroke-order demo with a replay control.
export function StrokeDemo({ kana }: { kana: Kana }) {
  const [run, setRun] = useState(0);
  return (
    <div class="demo">
      <StrokeAnimation key={run} kana={kana} class="demo-svg" />
      <ReplayButton onClick={() => setRun(run + 1)} />
    </div>
  );
}
