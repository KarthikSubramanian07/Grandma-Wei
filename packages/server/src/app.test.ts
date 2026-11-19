import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Scene } from "@gw/schema";
import { brainFor } from "./app";
import { EyesError } from "./eyes";
import { createApp, initEngine, MemoryStore, type Envelope } from "./index";
import { SAMPLES } from "./samples";

beforeAll(() => {
  initEngine(readFileSync(join(import.meta.dir, "../../qi/qi_bg.wasm")));
});

const env = { ANTHROPIC_API_KEY: "test-key", SIGNING_SECRET: "test-secret" };
const tinyJpeg = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/";
/** A different photo each time (she remembers ones she's seen). */
const photoN = (n: number) => `${tinyJpeg}${"A".repeat(n)}`;

function app(opts: { scene?: Scene; store?: MemoryStore | null; tongueThrows?: boolean } = {}) {
  const store = opts.store === undefined ? new MemoryStore() : opts.store;
  let looked = 0;
  const a = createApp({
    store,
    eyes: async () => {
      looked++;
      return opts.scene ?? SAMPLES.traveler!.scene;
    },
    tongue: async (_cfg, _scene, _reading, draft) => {
      if (opts.tongueThrows) throw new Error("boom");
      return { ...draft, headline: "Coffin position, and the suitcase is watching. I'm worried.", from_bank: false };
    },
  });
  const req = (path: string, init?: RequestInit, e: Record<string, unknown> = env) => a.request(path, init, e);
  return { req, store, looked: () => looked };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
const json = async (r: Response): Promise<J> => r.json();

const post = (body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4", ...headers },
  body: JSON.stringify(body),
});

describe("health and samples", () => {
  test("health reports what's switched on", async () => {
    const r = await app().req("/api/health");
    expect(await json(r)).toMatchObject({ ok: true, eyes: true, fridge: true });
    const off = await app({ store: null }).req("/api/health", undefined, {});
    expect(await json(off)).toMatchObject({ eyes: false, fridge: false });
  });

  test("a sample reading is complete and signed", async () => {
    const r = await app().req("/api/sample/traveler", undefined, {});
    expect(r.status).toBe(200);
    const e = (await json(r)) as Envelope;
    expect(e.result.reading.score).toBe(49);
    expect(e.result.reading.headline).toBe("bed_door");
    expect(e.result.voice.grade).toBe("Worrying.");
    expect(e.result.suggestion).not.toBeNull();
    expect(e.sig.length).toBeGreaterThan(20);
  });

  test("unknown samples are a 404 in her voice", async () => {
    const r = await app().req("/api/sample/nope");
    expect(r.status).toBe(404);
    expect((await json(r)).message).toContain("I don't have that one");
  });
});

describe("choosing her eyes", () => {
  test("Claude when it has a key, Groq otherwise, and AI_PROVIDER can prefer Groq", () => {
    expect(brainFor({})).toBeNull();
    expect(brainFor({ ANTHROPIC_API_KEY: "a" })).toMatchObject({ provider: "anthropic", vision: "claude-opus-5-5" });
    expect(brainFor({ GROQ_API_KEY: "g" })).toMatchObject({ provider: "groq", apiKey: "g", vision: "qwen/qwen3.8-27b" });
    expect(brainFor({ ANTHROPIC_API_KEY: "a", GROQ_API_KEY: "g" })?.provider).toBe("anthropic");
    expect(brainFor({ ANTHROPIC_API_KEY: "a", GROQ_API_KEY: "g", AI_PROVIDER: "groq" })?.provider).toBe("groq");
    expect(brainFor({ ANTHROPIC_API_KEY: "a", AI_PROVIDER: "groq" })?.provider).toBe("anthropic");
    expect(brainFor({ GROQ_API_KEY: "g", GROQ_VISION_MODEL: "x/y", VISION_MODEL: "claude-z" })?.vision).toBe("x/y");
  });

  test("a Groq key alone switches photo readings on and reaches the eyes and voice", async () => {
    const seen: string[] = [];
    const a = createApp({
      store: new MemoryStore(),
      eyes: async (cfg) => {
        seen.push(`eyes:${cfg.provider}:${cfg.model}:${cfg.apiKey}`);
        return SAMPLES.traveler!.scene;
      },
      tongue: async (cfg, _s, _r, draft) => {
        seen.push(`voice:${cfg.provider}:${cfg.model}`);
        return draft;
      },
    });
    const groqEnv = { GROQ_API_KEY: "gsk_live", SIGNING_SECRET: "s" };
    expect(await json(await a.request("/api/health", undefined, groqEnv))).toMatchObject({ eyes: true });
    const r = await a.request("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }), groqEnv);
    expect(r.status).toBe(200);
    expect(((await json(r)) as Envelope).result.reading.score).toBe(49);
    // Her hand-written lines, so the free tier's per-minute budget goes to the eyes.
    expect(seen).toEqual(["eyes:groq:qwen/qwen3.8-27b:gsk_live"]);

    seen.length = 0;
    const withVoice = { ...groqEnv, GROQ_VOICE: "1" };
    expect((await a.request("/api/read", post({ image: photoN(1), media_type: "image/jpeg" }), withVoice)).status).toBe(200);
    expect(seen).toEqual(["eyes:groq:qwen/qwen3.8-27b:gsk_live", "voice:groq:qwen/qwen3.8-27b"]);
  });
});

describe("when her eyes fail", () => {
  test("each failure gets its own status and a message in her voice", async () => {
    const cases: [EyesError["code"], number, string][] = [
      ["busy", 503, "crowded"],
      ["tired", 503, "resting"],
      ["refused", 400, "refused"],
      ["unreadable", 502, "unreadable"],
      ["upstream", 502, "upstream"],
    ];
    for (const [code, status, error] of cases) {
      const a = createApp({
        store: new MemoryStore(),
        eyes: async () => {
          throw new EyesError(code, "test");
        },
      });
      const r = await a.request("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }), env);
      expect(r.status).toBe(status);
      const body = await json(r);
      expect(body.error).toBe(error);
      expect(body.message.length).toBeGreaterThan(10);
    }
  });
});

describe("reading a photo", () => {
  test("without an API key, she says she left her glasses at home", async () => {
    const r = await app().req("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }), {});
    expect(r.status).toBe(503);
    expect((await json(r)).error).toBe("no_eyes");
  });

  test("rejects non-images and odd media types before spending anything", async () => {
    const h = app();
    expect((await h.req("/api/read", post({ image: "<script>", media_type: "image/jpeg" }))).status).toBe(400);
    expect((await h.req("/api/read", post({ image: tinyJpeg, media_type: "image/gif" }))).status).toBe(400);
    expect((await h.req("/api/read", post({ image: "A".repeat(3_000_001), media_type: "image/jpeg" }))).status).toBe(413);
    expect(h.looked()).toBe(0);
  });

  test("reads, scores deterministically, and personalizes", async () => {
    const r = await app().req("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }));
    expect(r.status).toBe(200);
    const e = (await json(r)) as Envelope;
    expect(e.result.reading.score).toBe(49);
    expect(e.result.voice.headline).toContain("suitcase");
    expect(e.result.diff).toBeNull();
  });

  test("a retake diffs against the signed previous reading", async () => {
    const h = app({ scene: SAMPLES.traveler!.scene });
    const first = (await (await h.req("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }))).json()) as Envelope;
    const moved: Scene = structuredClone(SAMPLES.traveler!.scene);
    moved.facts.bed_door = "commanding";
    const h2 = app({ scene: moved });
    const second = (await (
      await h2.req("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg", prev: { signed: first.signed, sig: first.sig } }))
    ).json()) as Envelope;
    expect(second.result.diff?.delta).toBeGreaterThan(20);
    expect(second.result.diff?.magnets).toContain("out_of_the_coffin");
  });

  test("a forged previous reading is ignored, not trusted", async () => {
    const r = await app().req(
      "/api/read",
      post({ image: tinyJpeg, media_type: "image/jpeg", prev: { signed: '{"v":1}', sig: "nope" } }),
    );
    expect(((await json(r)) as Envelope).result.diff).toBeNull();
  });

  test("rate limits per visitor", async () => {
    const h = app();
    const e = { ...env, READS_PER_HOUR: "2" };
    for (let i = 0; i < 2; i++) expect((await h.req("/api/read", post({ image: photoN(i), media_type: "image/jpeg" }), e)).status).toBe(200);
    const r = await h.req("/api/read", post({ image: photoN(2), media_type: "image/jpeg" }), e);
    expect(r.status).toBe(429);
    expect((await json(r)).error).toBe("slow_down");
  });

  test("paused means napping", async () => {
    const r = await app().req("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }), { ...env, READS_PAUSED: "1" });
    expect((await json(r)).error).toBe("napping");
  });
});

describe("sharing", () => {
  async function sampleEnvelope() {
    return (await (await app().req("/api/sample/traveler")).json()) as Envelope;
  }

  test("publishes text only, fetches, and deletes with the token", async () => {
    const h = app();
    const e = await sampleEnvelope();
    const r = await h.req("/api/share", post({ signed: e.signed, sig: e.sig }));
    expect(r.status).toBe(200);
    const { id, delete_token, payload } = await json(r);
    expect(payload.score).toBe(49);
    expect(JSON.stringify(payload)).not.toContain("layout");
    expect(JSON.stringify(payload)).not.toContain("box");
    const got = await h.req(`/api/share/${id}`);
    expect((await json(got)).headline).toBe(e.result.voice.headline);
    expect((await h.req(`/api/share/${id}`, { method: "DELETE", headers: { "x-delete-token": "wrong" } })).status).toBe(403);
    expect((await h.req(`/api/share/${id}`, { method: "DELETE", headers: { "x-delete-token": delete_token } })).status).toBe(200);
    expect((await h.req(`/api/share/${id}`)).status).toBe(404);
  });

  test("refuses to share a reading she didn't give", async () => {
    const e = await sampleEnvelope();
    const tampered = e.signed.replace('"bed_door":"coffin"', '"bed_door":"commanding"');
    const r = await app().req("/api/share", post({ signed: tampered, sig: e.sig }));
    expect(r.status).toBe(403);
  });

});

describe("share page meta", () => {
  test("puts her headline in the link preview and points at the score card", async () => {
    const { shareMeta } = await import("./meta");
    const e = (await (await app().req("/api/sample/traveler")).json()) as Envelope;
    const h = app();
    const { payload } = await json(await h.req("/api/share", post({ signed: e.signed, sig: e.sig })));
    const { title, tags } = shareMeta(payload, "https://grandma-wei.pages.dev");
    expect(title).toBe("Grandma Wei gave this bedroom 49/100");
    expect(tags).toContain("https://grandma-wei.pages.dev/og/49.png");
    expect(tags).toContain(`content="${e.result.voice.headline.replace(/'/g, "'")}"`);
    expect(tags).toContain("noindex");
  });
});

describe("KV storage", () => {
  test("shares round-trip through a KV namespace", async () => {
    const { KVStore } = await import("./store");
    const mem = new Map<string, string>();
    const kv = {
      get: async (k: string, type?: string) => {
        const v = mem.get(k);
        return v === undefined ? null : type === "json" ? JSON.parse(v) : v;
      },
      put: async (k: string, v: string) => void mem.set(k, v),
      delete: async (k: string) => void mem.delete(k),
    } as unknown as KVNamespace;
    const store = new KVStore(kv);
    expect(await store.bump("v:x", 1)).toBe(1);
    expect(await store.bump("v:x", 1)).toBe(2);
    await store.putShare("abc", "hash", '{"a":1}', 1);
    expect(await store.getShare("abc")).toEqual({ payload: '{"a":1}', deleteHash: "hash" });
    await store.deleteShare("abc");
    expect(await store.getShare("abc")).toBeNull();
    await store.putMemory("m1", "sealed");
    expect(await store.getMemory("m1")).toBe("sealed");
    expect(mem.has("seen:m1")).toBe(true);
    expect(await store.getMemory("nope")).toBeNull();
  });
});

describe("same photo, same reading", () => {
  const groqEnv = { GROQ_API_KEY: "gsk", SIGNING_SECRET: "s", READS_PER_HOUR: "1" };
  const photoA = tinyJpeg;
  const photoB = tinyJpeg.replace("/9j/", "/9k/");

  test("she reads a photo once, then remembers it, even past the hourly limit", async () => {
    const store = new MemoryStore();
    let looked = 0;
    const a = createApp({
      store,
      eyes: async () => {
        // A model that never describes a room the same way twice.
        looked++;
        return looked === 1 ? SAMPLES.traveler!.scene : SAMPLES.attic!.scene;
      },
    });
    const read = (image: string) => a.request("/api/read", post({ image, media_type: "image/jpeg" }), groqEnv);

    const first = await read(photoA);
    expect(first.status).toBe(200);
    expect(first.headers.get("X-Grandma-Remembered")).toBeNull();
    const one = ((await json(first)) as Envelope).result;

    const again = await read(photoA);
    expect(again.status).toBe(200);
    expect(again.headers.get("X-Grandma-Remembered")).toBe("1");
    const two = ((await json(again)) as Envelope).result;
    expect(looked).toBe(1);
    expect(two.reading.score).toBe(one.reading.score);
    expect(two.voice.headline).toBe(one.voice.headline);
    expect(two.scene).toEqual(one.scene);
    expect(two.id).not.toBe(one.id);

    // Only what's encrypted is kept: no photo, no room details in storage.
    const stored = [...store.memories.values()].join("");
    expect(stored).not.toContain(photoA);
    expect(stored).not.toContain("coffin");

    // A new photo is a new look, and that one does count toward the limit.
    expect((await read(photoB)).status).toBe(429);
    expect(looked).toBe(1);
  });

  test("without storage she still reads every photo", async () => {
    let looked = 0;
    const a = createApp({
      store: null,
      eyes: async () => {
        looked++;
        return SAMPLES.traveler!.scene;
      },
    });
    for (let i = 0; i < 2; i++) {
      expect((await a.request("/api/read", post({ image: photoA, media_type: "image/jpeg" }), groqEnv)).status).toBe(200);
    }
    expect(looked).toBe(2);
  });
});
