import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { Plugin } from "vite";
import { ATTEMPT_REVIEWS, EXAMPLES_ENDPOINT, type DrawingExample } from "../src/examples";

const EXAMPLES_DIR = "examples";
const MAX_BODY_BYTES = 1_000_000;

class RequestError extends Error {}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) reject(new RequestError(`Body exceeds ${MAX_BODY_BYTES} bytes`));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function validateExample(value: unknown): DrawingExample {
  const example = value as Partial<DrawingExample> | null;
  if (typeof example?.char !== "string" || [...example.char].length !== 1)
    throw new RequestError("Example needs a single-character `char`");
  if (!Array.isArray(example.attempts) || example.attempts.length === 0)
    throw new RequestError("Example needs at least one stroke in `attempts`; draw something first");
  if (!Array.isArray(example.references)) throw new RequestError("Example needs the sampled `references`");
  return example as DrawingExample;
}

function exampleFileName(urlPath: string): string {
  const file = decodeURIComponent(urlPath.replace(/^\//, ""));
  if (!file.endsWith(".json") || file.includes("/") || file.includes("\\") || file.startsWith("."))
    throw new RequestError(`"${file}" is not an example file name; use a name from GET ${EXAMPLES_ENDPOINT}`);
  return file;
}

const sendJson = (res: ServerResponse, value: unknown) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(value));
};

// Dev-server endpoints to save, list, and review drawn stroke attempts in examples/ for grader tuning.
export function examplesPlugin(): Plugin {
  return {
    name: "kana-sketch-examples",
    apply: "serve",
    configureServer(server) {
      const dir = join(server.config.root, EXAMPLES_DIR);
      const write = (file: string, example: DrawingExample) =>
        writeFile(join(dir, file), JSON.stringify(example, null, 1) + "\n");

      const routes: Record<string, (req: IncomingMessage, res: ServerResponse) => Promise<void>> = {
        async POST(req, res) {
          const example = validateExample(JSON.parse(await readBody(req)));
          const file = `${new Date().toISOString().replace(/[:.]/g, "-")}-${example.char}.json`;
          await mkdir(dir, { recursive: true });
          await write(file, example);
          sendJson(res, { file: `${EXAMPLES_DIR}/${file}` });
        },

        async GET(_req, res) {
          const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort().reverse();
          const examples = await Promise.all(
            files.map(async (file) => ({ file, example: JSON.parse(await readFile(join(dir, file), "utf8")) })),
          );
          sendJson(res, examples);
        },

        async PUT(req, res) {
          const file = exampleFileName(req.url ?? "");
          const { attempt, review } = JSON.parse(await readBody(req)) as { attempt?: unknown; review?: unknown };
          if (review !== null && !ATTEMPT_REVIEWS.includes(review as never))
            throw new RequestError(`review must be one of ${ATTEMPT_REVIEWS.join(", ")} or null`);
          const example = validateExample(JSON.parse(await readFile(join(dir, file), "utf8")));
          const target = typeof attempt === "number" ? example.attempts[attempt] : undefined;
          if (!target) throw new RequestError(`attempt must be an index from 0 to ${example.attempts.length - 1}`);
          if (review === null) delete target.review;
          else target.review = review as NonNullable<typeof target.review>;
          await write(file, example);
          sendJson(res, example);
        },
      };

      server.middlewares.use(EXAMPLES_ENDPOINT, async (req, res) => {
        const route = routes[req.method ?? ""];
        if (!route) {
          res.statusCode = 405;
          return res.end(`Use ${Object.keys(routes).join(", ")} on ${EXAMPLES_ENDPOINT}`);
        }
        try {
          await route(req, res);
        } catch (error) {
          res.statusCode = error instanceof RequestError || error instanceof SyntaxError ? 400 : 500;
          res.end(error instanceof Error ? error.message : String(error));
        }
      });
    },
  };
}
