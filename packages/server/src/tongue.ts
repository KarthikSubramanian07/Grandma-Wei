/**
 * Grandma's tongue: an optional second call (Claude or Groq) that personalizes her lines.
 * Text only (the photo is not sent again). If anything goes wrong, or any
 * line fails the voice linter, the hand-written line stays.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Reading, Scene } from "@gw/schema";
import type { Provider } from "./eyes";
import { groqJson } from "./groq";
import { GRANDMA_SYSTEM, VOICE_JSON_SCHEMA, mergeVoice, voiceUserMessage, type Voice, type VoiceOutput } from "@gw/voice";

export interface TongueConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
}

export async function personalize(cfg: TongueConfig, scene: Scene, reading: Reading, draft: Voice): Promise<Voice> {
  if (reading.state !== "ok") return draft;
  try {
    const out = cfg.provider === "groq" ? await speakGroq(cfg, scene, reading, draft) : await speakClaude(cfg, scene, reading, draft);
    return out ? mergeVoice(draft, out, reading.score).voice : draft;
  } catch {
    return draft;
  }
}

async function speakGroq(cfg: TongueConfig, scene: Scene, reading: Reading, draft: Voice): Promise<VoiceOutput | null> {
  return (await groqJson({
    apiKey: cfg.apiKey,
    model: cfg.model,
    effort: cfg.effort,
    system: GRANDMA_SYSTEM,
    user: voiceUserMessage({ scene, reading, draft }),
    schemaName: "voice",
    schema: VOICE_JSON_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 3000,
    temperature: 0.8,
    timeoutMs: 20_000,
  })) as VoiceOutput;
}

async function speakClaude(cfg: TongueConfig, scene: Scene, reading: Reading, draft: Voice): Promise<VoiceOutput | null> {
  const client = new Anthropic({ apiKey: cfg.apiKey, maxRetries: 0, timeout: 30_000 });
  const res = await client.beta.messages.create({
    model: cfg.model,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: GRANDMA_SYSTEM,
    output_config: { effort: cfg.effort, format: { type: "json_schema", schema: VOICE_JSON_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: "user", content: voiceUserMessage({ scene, reading, draft }) }],
  });
  if (res.stop_reason !== "end_turn") return null;
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return JSON.parse(text) as VoiceOutput;
}
