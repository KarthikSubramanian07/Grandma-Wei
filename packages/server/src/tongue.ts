/**
 * Grandma's tongue: an optional second call that personalizes her lines.
 * Text only (the photo is not sent again). If anything goes wrong, or any
 * line fails the voice linter, the hand-written line stays.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Reading, Scene } from "@gw/schema";
import { GRANDMA_SYSTEM, VOICE_JSON_SCHEMA, mergeVoice, voiceUserMessage, type Voice, type VoiceOutput } from "@gw/voice";

export interface TongueConfig {
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
}

export async function personalize(cfg: TongueConfig, scene: Scene, reading: Reading, draft: Voice): Promise<Voice> {
  if (reading.state !== "ok") return draft;
  try {
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
    if (res.stop_reason !== "end_turn") return draft;
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const out = JSON.parse(text) as VoiceOutput;
    return mergeVoice(draft, out, reading.score).voice;
  } catch {
    return draft;
  }
}
