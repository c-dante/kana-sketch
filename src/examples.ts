import type { MistakeReason, Point } from "./stroke/grade";

export const EXAMPLES_ENDPOINT = "/__examples";

export const ATTEMPT_REVIEWS = ["agree", "disagree"] as const;

export type AttemptReview = (typeof ATTEMPT_REVIEWS)[number];

export type StrokeAttempt = {
  expectedStroke: number;
  verdict: "ok" | MistakeReason;
  points: Point[];
  review?: AttemptReview;
};

export type SavedExample = { file: string; example: DrawingExample };

export async function listExamples(): Promise<SavedExample[]> {
  const response = await fetch(EXAMPLES_ENDPOINT);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function reviewAttempt(file: string, attempt: number, review: AttemptReview | null): Promise<DrawingExample> {
  const response = await fetch(`${EXAMPLES_ENDPOINT}/${encodeURIComponent(file)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempt, review }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export type DrawingExample = {
  char: string;
  mode: "trace" | "recall";
  note: string;
  savedAt: string;
  attempts: StrokeAttempt[];
  references: Point[][];
};

const round = (points: Point[]) => points.map(({ x, y }) => ({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }));

// Send a drawing session to the dev server, returning the saved file path.
export async function saveExample(example: Omit<DrawingExample, "savedAt">): Promise<string> {
  const body: DrawingExample = {
    ...example,
    savedAt: new Date().toISOString(),
    attempts: example.attempts.map((a) => ({ ...a, points: round(a.points) })),
    references: example.references.map(round),
  };
  const response = await fetch(EXAMPLES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  const { file } = (await response.json()) as { file: string };
  return file;
}
