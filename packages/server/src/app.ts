import { Hono } from "hono";
import type { Context } from "hono";
import { Scene } from "@gw/schema";
import { compose } from "@gw/voice";
import { engine } from "./engine";
import { EYES_SYSTEM, EyesError, look, type MediaType, type Provider } from "./eyes";
import { photoMemory, recall, remember } from "./memory";
import { checkLimit } from "./limit";
import { type Envelope, type ReadingResult, type Signed, sharePayload } from "./result";
import { SAMPLES } from "./samples";
import { randomId, sha256, sign, verify } from "./sign";
import { storeFromEnv, type Store } from "./store";
import { personalize } from "./tongue";

export interface Env {
  /** Claude for her eyes and voice. */
  ANTHROPIC_API_KEY?: string;
  /** Or an open model on Groq. Used when there's no Anthropic key, or when AI_PROVIDER is "groq". */
  GROQ_API_KEY?: string;
  AI_PROVIDER?: Provider;
  SIGNING_SECRET?: string;
  VISION_MODEL?: string;
  VOICE_MODEL?: string;
  GROQ_VISION_MODEL?: string;
  GROQ_VOICE_MODEL?: string;
  /**
   * "1" also personalizes her lines on Groq. Off by default: Groq's free tier
   * allows about 1,000 output tokens a minute, and one photo reading uses most
   * of that, so a second call would make the next person's reading fail.
   */
  GROQ_VOICE?: string;
  VISION_EFFORT?: "low" | "medium" | "high";
  VOICE_EFFORT?: "low" | "medium" | "high";
  /** "1" pauses new readings (samples and shares keep working). */
  READS_PAUSED?: string;
  READS_PER_HOUR?: string;
  READS_PER_DAY?: string;
  /**
   * Test only: "1" answers photo reads with the Traveler practice room (and,
   * on a retake, the same room with its chores done), so the whole photo loop
   * can be tested end to end without an API key. Never set in production.
   */
  FAKE_EYES?: string;
  DB?: D1Database;
  KV?: KVNamespace;
}

export interface Deps {
  eyes?: typeof look;
  tongue?: typeof personalize;
  /** Override storage (tests). */
  store?: Store | null;
}

const DEFAULT_MODEL = "claude-opus-5-5";
/** Groq's vision model with strict structured output. */
const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

interface Brain {
  provider: Provider;
  apiKey: string;
  vision: string;
  voice: string;
}

/** Which model gives her eyes and voice: Claude if it has a key, otherwise Groq. */
export function brainFor(env: Env): Brain | null {
  const groq = (): Brain | null =>
    env.GROQ_API_KEY
      ? {
          provider: "groq",
          apiKey: env.GROQ_API_KEY,
          vision: env.GROQ_VISION_MODEL ?? DEFAULT_GROQ_MODEL,
          voice: env.GROQ_VOICE_MODEL ?? DEFAULT_GROQ_MODEL,
        }
      : null;
  const claude = (): Brain | null =>
    env.ANTHROPIC_API_KEY
      ? {
          provider: "anthropic",
          apiKey: env.ANTHROPIC_API_KEY,
          vision: env.VISION_MODEL ?? DEFAULT_MODEL,
          voice: env.VOICE_MODEL ?? DEFAULT_MODEL,
        }
      : null;
  return env.AI_PROVIDER === "groq" ? (groq() ?? claude()) : (claude() ?? groq());
}
const MAX_IMAGE_B64 = 3_000_000; // ~2.2 MB of image; the browser sends ~300 KB
const MEDIA_TYPES = new Set<MediaType>(["image/jpeg", "image/png", "image/webp"]);

/** Error bodies speak in her voice; the code is for the UI. */
const ERR = {
  napping: "Grandma is taking a nap. Try the sample rooms, or come back a little later.",
  no_eyes: "Grandma left her glasses at home, so she can't read photos on this site yet. The sample rooms still work.",
  too_big: "That photo is too big. Even for me.",
  bad_image: "I couldn't open that photo. Try a regular JPEG or PNG.",
  slow_down: "Slow down. I'm one grandmother. Try again in an hour.",
  busy_day: "Busy day. I've read too many rooms today. Come back tomorrow.",
  refused: "I'm not going to read that one. Show me a room.",
  unreadable: "I looked and looked and couldn't make sense of it. Try again from a corner, with the lights on.",
  upstream: "My eyes aren't working right now. Give it a minute and try again.",
  crowded: "Everyone is showing me their rooms at once. Sit down, have some tea, and try again in a minute.",
  resting: "I've read so many rooms today my eyes need a rest. Come back in a little while, or try a practice room.",
  forged: "That reading isn't one of mine.",
  no_fridge: "Sharing isn't switched on here yet.",
  not_found: "I don't have that one. Maybe it was deleted.",
} as const;

type ErrCode = keyof typeof ERR;

function fail(c: Context, status: 400 | 403 | 404 | 413 | 429 | 502 | 503, code: ErrCode) {
  return c.json({ error: code, message: ERR[code] }, status);
}

/** Names her eyes (provider, model, prompt), so changing any of them starts a fresh memory. */
let eyesPromptHash: Promise<string> | null = null;
async function eyesVersion(brain: Brain): Promise<string> {
  eyesPromptHash ??= sha256(EYES_SYSTEM);
  return `${brain.provider}:${brain.vision}:${await eyesPromptHash}`;
}

async function signingKey(env: Env): Promise<string> {
  if (env.SIGNING_SECRET) return env.SIGNING_SECRET;
  // Fall back to a key derived from the API key, so a deploy with only an API key is still safe.
  const key = env.ANTHROPIC_API_KEY ?? env.GROQ_API_KEY;
  if (key) return sha256(`grandma-wei:sign:${key}`);
  return "grandma-wei-local-development-only";
}

async function envelope(env: Env, s: Signed): Promise<Envelope> {
  const result: ReadingResult = {
    id: s.id,
    rules_version: engine.version(),
    sample: s.sample,
    scene: s.scene,
    reading: engine.read(s.scene),
    voice: s.voice,
    diff: s.diff,
    suggestion: engine.suggestBed(s.scene),
  };
  const signed = JSON.stringify(s);
  return { result, signed, sig: await sign(await signingKey(env), signed) };
}

async function openSigned(env: Env, signed: unknown, sig: unknown): Promise<Signed | null> {
  if (typeof signed !== "string" || typeof sig !== "string" || signed.length > 200_000) return null;
  if (!(await verify(await signingKey(env), signed, sig))) return null;
  try {
    const s = JSON.parse(signed) as Signed;
    return s.v === 1 && Scene.safeParse(s.scene).success ? s : null;
  } catch {
    return null;
  }
}

export function createApp(deps: Deps = {}) {
  const eyes = deps.eyes ?? look;
  const tongue = deps.tongue ?? personalize;
  const app = new Hono<{ Bindings: Env }>();
  const storeFor = (env: Env): Store | null => (deps.store !== undefined ? deps.store : storeFromEnv(env));

  app.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", c.res.headers.get("Cache-Control") ?? "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  });

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      rules_version: engine.version(),
      eyes: Boolean(brainFor(c.env ?? {})) && c.env?.READS_PAUSED !== "1",
      fridge: Boolean(storeFor(c.env ?? {})),
    }),
  );

  app.get("/api/samples", (c) =>
    c.json(Object.entries(SAMPLES).map(([id, s]) => ({ id, title: s.title, photo: s.photo }))),
  );

  app.get("/api/sample/:name", async (c) => {
    const sample = SAMPLES[c.req.param("name")];
    if (!sample) return fail(c, 404, "not_found");
    const name = c.req.param("name");
    const reading = engine.read(sample.scene);
    const voice = compose(sample.scene, reading, `sample:${name}`);
    return c.json(await envelope(c.env ?? {}, { v: 1, id: `sample-${name}`, sample: name, scene: sample.scene, voice, diff: null }));
  });

  app.post("/api/read", async (c) => {
    const env = c.env ?? {};
    if (env.READS_PAUSED === "1") return fail(c, 503, "napping");
    const brain = brainFor(env);
    const fake = env.FAKE_EYES === "1" && !brain;
    if (!brain && !fake) return fail(c, 503, "no_eyes");

    let body: { image?: unknown; media_type?: unknown; prev?: { signed?: unknown; sig?: unknown } };
    try {
      body = await c.req.json();
    } catch {
      return fail(c, 400, "bad_image");
    }
    const { image, media_type } = body;
    if (typeof image !== "string" || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 1000))) return fail(c, 400, "bad_image");
    if (image.length > MAX_IMAGE_B64) return fail(c, 413, "too_big");
    if (!MEDIA_TYPES.has(media_type as MediaType)) return fail(c, 400, "bad_image");

    // Same photo, same reading: she remembers what she saw (encrypted, never the photo).
    const store = storeFor(env);
    // (The test stand-in remembers first looks too, so memory is tested end to end
    // in the real runtime; its retakes always look fresh so they can show progress.)
    const memory = fake && body.prev ? null : await photoMemory(image, fake ? "fake" : await eyesVersion(brain!));
    let scene = memory ? await recall(store, memory) : null;
    const remembered = scene !== null;

    const skipVoice = fake || (brain!.provider === "groq" && env.GROQ_VOICE !== "1");
    // Any read that will call a paid model counts against the limit. A remembered photo
    // skips the vision call but still pays for her voice, so resending one photo must
    // not buy unlimited voice calls.
    if (!scene || !skipVoice) {
      const limit = await checkLimit(
        store,
        c.req.header("cf-connecting-ip") ?? "local",
        await signingKey(env),
        Number(env.READS_PER_HOUR ?? 12),
        Number(env.READS_PER_DAY ?? 400),
      );
      if (!limit.ok) return fail(c, 429, limit.reason === "daily" ? "busy_day" : "slow_down");
    }

    if (!scene) {
      try {
        scene = fake
          ? body.prev
            ? engine.imagine(SAMPLES.traveler!.scene, ["move_bed", "declutter", "real_plant"])
            : SAMPLES.traveler!.scene
          : await eyes(
              { provider: brain!.provider, apiKey: brain!.apiKey, model: brain!.vision, effort: env.VISION_EFFORT ?? "medium" },
              image,
              media_type as MediaType,
            );
      } catch (e) {
        const code = e instanceof EyesError ? e.code : "upstream";
        if (code === "refused") return fail(c, 400, "refused");
        if (code === "unreadable") return fail(c, 502, "unreadable");
        if (code === "busy") return fail(c, 503, "crowded");
        if (code === "tired") return fail(c, 503, "resting");
        return fail(c, 502, "upstream");
      }
      if (memory) await remember(store, memory, scene);
    }

    const prev = body.prev ? await openSigned(env, body.prev.signed, body.prev.sig) : null;
    const reading = engine.read(scene);
    const diff = prev ? engine.diff(prev.scene, scene) : null;
    const id = randomId(9);
    // Her hand-written lines are picked by the photo, so the same photo gets the same words.
    const draft = compose(scene, reading, memory?.id ?? id, diff ?? undefined);
    const voice = skipVoice
      ? draft
      : await tongue(
          { provider: brain!.provider, apiKey: brain!.apiKey, model: brain!.voice, effort: env.VOICE_EFFORT ?? "low" },
          scene,
          reading,
          draft,
        );
    if (remembered) c.header("X-Grandma-Remembered", "1");
    return c.json(await envelope(env, { v: 1, id, sample: null, scene, voice, diff }));
  });

  /** Publish a scorecard. Stores text only and returns a token that can delete it. */
  app.post("/api/share", async (c) => {
    const env = c.env ?? {};
    const store = storeFor(env);
    if (!store) return fail(c, 503, "no_fridge");
    const body = await c.req.json().catch(() => ({}));
    const s = await openSigned(env, body.signed, body.sig);
    if (!s) return fail(c, 403, "forged");
    const reading = engine.read(s.scene);
    const id = randomId(9);
    const token = randomId(18);
    const payload = sharePayload(id, Date.now(), engine.version(), s, reading);
    await store.putShare(id, await sha256(token), JSON.stringify(payload), payload.created);
    return c.json({ id, path: `/s/${id}`, delete_token: token, payload });
  });

  app.get("/api/share/:id", async (c) => {
    const store = storeFor(c.env ?? {});
    if (!store) return fail(c, 503, "no_fridge");
    const row = await store.getShare(c.req.param("id"));
    if (!row) return fail(c, 404, "not_found");
    c.header("Cache-Control", "public, max-age=60");
    return c.body(row.payload, 200, { "Content-Type": "application/json; charset=utf-8" });
  });

  app.delete("/api/share/:id", async (c) => {
    const store = storeFor(c.env ?? {});
    if (!store) return fail(c, 503, "no_fridge");
    const row = await store.getShare(c.req.param("id"));
    if (!row) return fail(c, 404, "not_found");
    const token = c.req.header("x-delete-token") ?? "";
    if ((await sha256(token)) !== row.deleteHash) return fail(c, 403, "forged");
    await store.deleteShare(c.req.param("id"));
    return c.json({ deleted: true });
  });

  app.notFound((c) => fail(c, 404, "not_found"));
  app.onError((err, c) => {
    // Log the failure, never the request: bodies can contain photos.
    console.error("grandma-wei: unhandled", err instanceof Error ? err.message : "unknown");
    return fail(c, 502, "upstream");
  });
  return app;
}
