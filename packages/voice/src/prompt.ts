import type { Reading, Scene } from "@gw/schema";
import type { Voice } from "./compose";
import { WHY } from "./lines";
import { lint } from "./lint";

/**
 * Grandma's personality, for the model that personalizes her lines.
 * The model never decides the score or the advice. It only rewrites the
 * hand-written draft so it mentions the specific things in this room.
 */
export const GRANDMA_SYSTEM = `You write lines for Grandma Wei, a character in a feng shui app. People photograph their room; a rules engine has already scored it and chosen the advice. You rewrite her draft lines so they feel personal to this exact room.

Who she is:
- Everyone's sharpest, most loving grandmother. Warm, dry, specific, a little disappointed, always right.
- She's concerned, never cruel. Low scores get more tenderness, not more cruelty.
- Her humor comes from her opinions about the room: the bed, the clutter, the plant. Never about the person's body, looks, intelligence, money, or worth.
- She speaks plain, natural English, the way a sharp relative talks. Short sentences. Deadpan. She can use a real term like "qi" or "the commanding position" and explain it in a few plain words.

Never:
- Accent spellings, broken English, or "wise old" fortune-cookie phrasing. No "ancient secrets", no proverbs, no references to her ethnicity or culture as a joke.
- Insults, profanity, emoji, hashtags, or quotation marks around her own lines.
- Comments on any person or pet in the photo. If people are present, ignore them.
- Promises of luck, wealth, health, or doom. She gives practical advice.
- New advice. Every chore must keep exactly the same action as the draft; you may only make it more specific to this room.
- A score or number different from the one given.

How to personalize:
- Use the observations and item details: "the mug collection on the nightstand", "that laundry chair". One or two specific details per line at most.
- Keep the draft's meaning and the joke's shape when the draft is already good. Better to change little than to be generic.
- Headline: one or two sentences, max 130 characters, about the given headline problem. It's the line people will screenshot.
- Aside: one or two sentences, max 150 characters, warm.
- Notes: tiny handwritten sticky notes, lowercase, max 28 characters each, for the same items as the draft.
- Chores: max 190 characters each, imperative, doable this week.`;

export const VOICE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "aside", "notes", "chores"],
  properties: {
    headline: { type: "string" },
    aside: { type: "string" },
    notes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item_id", "text"],
        properties: { item_id: { type: "string" }, text: { type: "string" } },
      },
    },
    chores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text"],
        properties: { id: { type: "string" }, text: { type: "string" } },
      },
    },
  },
} as const;

export interface VoiceDraftInput {
  scene: Scene;
  reading: Reading;
  draft: Voice;
}

/** The user message for the personalization call. Contains no image: only what the engine decided. */
export function voiceUserMessage({ scene, reading, draft }: VoiceDraftInput): string {
  const payload = {
    room: scene.kind,
    score: reading.score,
    grade: draft.grade,
    headline_problem: reading.headline,
    why_it_matters: reading.headline ? WHY[reading.headline] : null,
    observations: scene.observations,
    items: scene.items.map((i) => ({ id: i.id, kind: i.kind, detail: i.detail })),
    draft: {
      headline: draft.headline,
      aside: draft.aside,
      notes: draft.notes.map((n) => ({ item_id: n.item_id, text: n.text })),
      chores: draft.chores.slice(0, 5),
    },
  };
  return `Rewrite Grandma's draft for this room. Return JSON matching the schema.\n\n${JSON.stringify(payload, null, 2)}`;
}

export interface VoiceOutput {
  headline: string;
  aside: string;
  notes: { item_id: string; text: string }[];
  chores: { id: string; text: string }[];
}

/** Numbers in a line must match the real score, if any appear. */
function numbersOk(text: string, score: number | null): boolean {
  const nums = text.match(/\b\d+\b/g) ?? [];
  return nums.every((n) => score !== null && Number(n) === score);
}

/**
 * Merge a model's rewrite into the bank draft, line by line. Any line that
 * fails the linter, invents a number, or targets something not in the draft
 * is dropped and the hand-written line stays.
 */
export function mergeVoice(draft: Voice, out: VoiceOutput, score: number | null): { voice: Voice; rejected: string[] } {
  const rejected: string[] = [];
  const ok = (label: string, text: string | undefined, max: number) => {
    if (typeof text !== "string") return false;
    const problems = lint(text, { max });
    if (!numbersOk(text, score)) problems.push("invented number");
    if (problems.length) rejected.push(`${label}: ${problems.join(", ")}`);
    return problems.length === 0;
  };
  const voice: Voice = { ...draft, notes: [...draft.notes], chores: [...draft.chores], from_bank: false };
  if (ok("headline", out.headline, 140)) voice.headline = out.headline.trim();
  if (ok("aside", out.aside, 160)) voice.aside = out.aside.trim();
  voice.notes = draft.notes.map((n) => {
    const r = out.notes?.find((x) => x.item_id === n.item_id);
    return r && ok(`note ${n.item_id}`, r.text, 32) ? { ...n, text: r.text.trim().toLowerCase() } : n;
  });
  voice.chores = draft.chores.map((c) => {
    const r = out.chores?.find((x) => x.id === c.id);
    return r && ok(`chore ${c.id}`, r.text, 200) ? { ...c, text: r.text.trim() } : c;
  });
  return { voice, rejected };
}
