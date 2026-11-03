/**
 * A tiny Groq client: one chat completion that must come back as JSON.
 * Plain fetch, no SDK, so it runs the same in Workers, Bun and tests.
 *
 * Asks for strict structured output (constrained decoding, so the JSON always
 * matches the schema). If a model rejects the schema with a 400, it retries
 * once in plain JSON mode; the caller validates the result either way.
 */

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type Effort = "low" | "medium" | "high";

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface GroqRequest {
  apiKey: string;
  model: string;
  effort: Effort;
  system: string;
  user: string | Part[];
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  /** On a 429 that clears within this long, wait and try once more. */
  maxWaitMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class GroqError extends Error {
  constructor(
    public code: "refused" | "unreadable" | "upstream" | "busy",
    message: string,
  ) {
    super(message);
  }
}

interface Completion {
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
}

export async function groqJson(req: GroqRequest): Promise<unknown> {
  const doFetch = req.fetch ?? fetch;
  const body = (strict: boolean) => ({
    model: req.model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    response_format: strict
      ? { type: "json_schema", json_schema: { name: req.schemaName, strict: true, schema: req.schema } }
      : { type: "json_object" },
    reasoning_effort: req.effort,
    reasoning_format: "hidden",
    temperature: req.temperature,
    max_completion_tokens: req.maxTokens,
  });

  const send = async (strict: boolean): Promise<Response> => {
    try {
      return await doFetch(GROQ_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${req.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body(strict)),
        signal: AbortSignal.timeout(req.timeoutMs),
      });
    } catch {
      throw new GroqError("upstream", "network error");
    }
  };

  let res = await send(true);
  if (res.status === 400) res = await send(false);
  if (res.status === 429) {
    const wait = retryAfterMs(res);
    if (wait !== null && wait <= (req.maxWaitMs ?? 0)) {
      await (req.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(wait);
      res = await send(true);
    }
  }
  if (res.status === 429) throw new GroqError("busy", "rate limited upstream");
  if (!res.ok) throw new GroqError("upstream", `api error ${res.status}`);

  let data: Completion;
  try {
    data = (await res.json()) as Completion;
  } catch {
    throw new GroqError("upstream", "bad response");
  }
  const choice = data.choices?.[0];
  if (choice?.message?.refusal) throw new GroqError("refused", "declined");
  if (choice?.finish_reason === "length") throw new GroqError("unreadable", "cut off");
  try {
    return JSON.parse(choice?.message?.content ?? "");
  } catch {
    throw new GroqError("unreadable", "not json");
  }
}

/** Groq says when to come back in a retry-after header (seconds). */
export function retryAfterMs(res: Response): number | null {
  const s = Number(res.headers.get("retry-after"));
  return Number.isFinite(s) && s >= 0 && res.headers.has("retry-after") ? Math.ceil(s * 1000) : null;
}
