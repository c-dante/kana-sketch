import type { Point } from "./grade";

const POINTS_PER_PATH = 64;
const cache = new Map<string, Point[]>();
let host: SVGSVGElement | undefined;

function hostSvg(): SVGSVGElement {
  if (host) return host;
  host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  document.body.append(host);
  return host;
}

// Turn SVG path data into evenly spaced points using the browser's path geometry.
export function samplePath(d: string): Point[] {
  const cached = cache.get(d);
  if (cached) return cached;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  hostSvg().append(path);
  const length = path.getTotalLength();
  const points = Array.from({ length: POINTS_PER_PATH }, (_, i) => {
    const { x, y } = path.getPointAtLength((length * i) / (POINTS_PER_PATH - 1));
    return { x, y };
  });
  path.remove();
  cache.set(d, points);
  return points;
}
