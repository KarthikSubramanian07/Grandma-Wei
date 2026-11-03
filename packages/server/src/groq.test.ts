import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compose } from "@gw/voice";
import { engine, initEngine } from "./engine";
import { EyesError, look } from "./eyes";
import { GROQ_URL, GroqError, groqJson, type GroqRequest } from "./groq";
import { SAMPLES } from "./samples";
import { personalize } from "./tongue";

beforeAll(() => {
  initEngine(readFileSync(join(import.meta.dir, "../../qi/qi_bg.wasm")));
});

interface Call {
  url: string;
  init: RequestInit;
  body: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** A fake fetch that answers with the given responses in order and records each request. */
function fakeFetch(...responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    const r = responses[Math.min(calls.length - 1, responses.length - 1)]!;
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  return { f, calls };
}

const ok = (content: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content, ...extra } }] }), { status: 200 });

const base = (f: typeof fetch): GroqRequest => ({
  apiKey: "gsk_test",
  model: "qwen/qwen3.8-27b",
  effort: "medium",
  system: "Report as JSON.",
  user: "hello",
  schemaName: "thing",
  schema: { type: "object", properties: { a: { type: "number" } }, required: ["a"], additionalProperties: false },
  maxTokens: 100,
  temperature: 0.2,
  timeoutMs: 5000,
  fetch: f,
});

describe("groqJson", () => {
  test("asks for strict structured output with hidden reasoning, and parses the answer", async () => {
    const { f, calls } = fakeFetch(ok('{"a":1}'));
    expect(await groqJson(base(f))).toEqual({ a: 1 });
    expect(calls).toHaveLength(1);
    const { url, init, body } = calls[0]!;
    expect(url).toBe(GROQ_URL);
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer gsk_test");
    expect(body.model).toBe("qwen/qwen3.8-27b");
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "thing", strict: true, schema: base(f).schema },
    });
    expect(body.reasoning_format).toBe("hidden");
    expect(body.reasoning_effort).toBe("medium");
    expect(body.messages[0]).toEqual({ role: "system", content: "Report as JSON." });
  });

  test("falls back to plain JSON mode once if the model rejects the schema", async () => {
    const { f, calls } = fakeFetch(new Response("{}", { status: 400 }), ok('{"a":2}'));
    expect(await groqJson(base(f))).toEqual({ a: 2 });
    expect(calls).toHaveLength(2);
    expect(calls[1]!.body.response_format).toEqual({ type: "json_object" });
  });

  test("maps failures to codes the API can explain in her voice", async () => {
    const code = async (...r: (Response | Error)[]) =>
      groqJson(base(fakeFetch(...r).f)).then(
        () => "none",
        (e) => (e instanceof GroqError ? e.code : "other"),
      );
    expect(await code(new Response("", { status: 429 }))).toBe("busy");
    expect(await code(new Response("", { status: 500 }))).toBe("upstream");
    expect(await code(new Response("", { status: 400 }), new Response("", { status: 400 }))).toBe("upstream");
    expect(await code(new TypeError("offline"))).toBe("upstream");
    expect(await code(ok("", { refusal: "no" }))).toBe("refused");
    expect(await code(ok("not json"))).toBe("unreadable");
    expect(
      await code(new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: '{"a"' } }] }))),
    ).toBe("unreadable");
  });
});

describe("eyes and voice on Groq", () => {
  const scene = SAMPLES.traveler!.scene;
  const withFetch = async <T>(f: typeof fetch, run: () => Promise<T>): Promise<T> => {
    const real = globalThis.fetch;
    globalThis.fetch = f;
    try {
      return await run();
    } finally {
      globalThis.fetch = real;
    }
  };

  test("look sends the photo as a data URL and returns a validated scene", async () => {
    const { f, calls } = fakeFetch(ok(JSON.stringify(scene)));
    const got = await withFetch(f, () =>
      look({ provider: "groq", apiKey: "gsk_test", model: "qwen/qwen3.8-27b", effort: "medium" }, "QUJD", "image/jpeg"),
    );
    expect(got.facts.bed_door).toBe(scene.facts.bed_door);
    const content = calls[0]!.body.messages[1].content;
    expect(content[0]).toEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,QUJD" } });
    expect(calls[0]!.body.response_format.json_schema.name).toBe("scene");
  });

  test("look rejects JSON that isn't a room description", async () => {
    const { f } = fakeFetch(ok('{"is_room":"maybe"}'));
    const err = await withFetch(f, () =>
      look({ provider: "groq", apiKey: "k", model: "m", effort: "low" }, "QUJD", "image/png").catch((e) => e),
    );
    expect(err).toBeInstanceOf(EyesError);
    expect((err as EyesError).code).toBe("unreadable");
  });

  test("voice keeps lines that pass the linter and falls back to the draft on failure", async () => {
    const reading = engine.read(scene);
    const draft = compose(scene, reading, "groq-test");
    const headline = "That suitcase has been unpacked for a year. The bed still points at the door. I'm worried.";
    const out = { headline, aside: draft.aside, notes: [], chores: [] };
    const cfg = { provider: "groq" as const, apiKey: "k", model: "m", effort: "low" as const };

    const good = await withFetch(fakeFetch(ok(JSON.stringify(out))).f, () => personalize(cfg, scene, reading, draft));
    expect(good.headline).toBe(headline);

    const down = await withFetch(fakeFetch(new Response("", { status: 503 })).f, () => personalize(cfg, scene, reading, draft));
    expect(down).toEqual(draft);
  });
});
