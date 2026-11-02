import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Scene } from "@gw/schema";
import { createApp, initEngine, MemoryStore, type Envelope } from "./index";
import { SAMPLES } from "./samples";

beforeAll(() => {
  initEngine(readFileSync(join(import.meta.dir, "../../qi/qi_bg.wasm")));
});

const env = { ANTHROPIC_API_KEY: "test-key", SIGNING_SECRET: "test-secret" };
const tinyJpeg = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/";

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
    card: async () => new Uint8Array([137, 80, 78, 71]),
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
    for (let i = 0; i < 2; i++) expect((await h.req("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }), e)).status).toBe(200);
    const r = await h.req("/api/read", post({ image: tinyJpeg, media_type: "image/jpeg" }), e);
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

  test("card and og images come back as PNG", async () => {
    const h = app();
    const e = await sampleEnvelope();
    const card = await h.req("/api/card", post({ signed: e.signed, sig: e.sig, format: "story" }));
    expect(card.headers.get("content-type")).toBe("image/png");
    const { id } = await json(await h.req("/api/share", post({ signed: e.signed, sig: e.sig })));
    const og = await h.req(`/api/og/${id}.png`);
    expect(og.status).toBe(200);
    expect(og.headers.get("content-type")).toBe("image/png");
  });
});
