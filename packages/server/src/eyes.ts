/**
 * Grandma's eyes: one call to a vision model (Claude, or an open model on
 * Groq) that turns a room photo into a Scene.
 *
 * The model only observes. It fills in discrete facts and a rough sketch;
 * it never sees a score and never gives advice. The photo exists in memory
 * for the length of this request and is not stored or logged anywhere.
 */

import Anthropic from "@anthropic-ai/sdk";
import { Scene, sanitizeScene, sceneJsonSchema } from "@gw/schema";
import { GroqError, groqJson } from "./groq";

export const EYES_SYSTEM = `You are the eyes of a feng shui reader. You look at one photo of a room and report exactly what you see as JSON. You never give advice and never judge; another system does that.

Privacy rules, always:
- If people or pets are in the photo, set people_present (for people) and otherwise ignore them completely. Never describe anyone.
- Never transcribe or mention text, documents, screens' contents, photos on walls, names, addresses, or anything identifying. Describe objects generically ("a framed print", "a laptop").

If the photo is not of a room's interior (a person, a pet, food, outdoors, a screenshot), set is_room to false and fill the rest with your best neutral values ("unseen", "na", empty lists).

How to fill facts. Use "unseen" whenever you cannot actually tell from the photo. Use "na" when the thing does not exist in this room (e.g. no bed). Do not guess.
- bed_door: where the bed is relative to the room's door. "commanding": someone lying in bed could see the door, and the bed is not directly in line with it (typically diagonal). "coffin": the foot of the bed points straight at the door, roughly in line with it. "in_line_head": the head of the bed is right next to or in line with the door. "no_view": the door is behind the sleeper's head or blocked from view. If the door isn't visible and you can't infer it, "unseen".
- headboard: what is directly behind the head of the bed. "solid_wall", "window" (a window above or behind the headboard), "floating" (nothing behind it, bed in the middle of the room).
- headboard_solid: "yes" if there is a solid headboard (upholstered panel, solid wood), "no" if slatted, metal bars, or none.
- over_bed: a heavy beam, steep slanted ceiling, or shelf/cabinet directly above the bed.
- mirror_facing_bed: a mirror that would reflect the bed or the person in it.
- under_bed: "clear", "tidy_storage" (closed boxes or drawers), "cluttered" (visible loose stuff), or "unseen" (bed skirt, too dark, bed base hides it).
- bed_access: "both_sides" if there's walking room on both long sides, "one_side" if pushed against a wall.
- electronics_near_bed: phones, laptops, TVs, chargers, bright clocks within reach of the pillow.
- desk: "commanding" if someone sitting at it would face the room/door with the door in view, "back_to_door" if the door would be behind them, "facing_wall" if they'd face a wall with the door to their side. "na" if no desk.
- door_path: the path from the door into the room. "clear", "partly_blocked" (you'd step around something), "blocked".
- door_opens_fully: "no" if something behind or near the door stops it opening all the way.
- door_window_aligned: the door is directly opposite a window, in a straight line across the room.
- clutter: overall visible loose stuff on floors and surfaces. "minimal", "some", "heavy".
- sharp_corners: a sharp furniture corner points at the bed or at where someone sits at a desk or sofa, at close range.
- natural_light: daylight visible in the photo. "bright", "some", "dim". If it's night and you can't tell, "unseen".
- artificial_light: "layered_warm" (several warm lamps at different heights), "single_overhead" (one ceiling light doing everything), "harsh" (cold, glaring light), or "unseen".
- plants: "healthy", "struggling" (yellowing, drooping, dead), "artificial", or "none".
- elements, read from colors and materials. wood: wood, plants, greens. fire: warm light, candles, reds, oranges, pinks. earth: ceramics, stone, terracotta, beige, yellow. metal: metal objects, white, gray, round shapes. water: glass, mirrors, blue, black, wavy shapes. "dominant" only when one element clearly overwhelms the room.

items: up to 12 things worth pinning a note on, especially the bed, door, windows, mirrors, desk, plants, lamps, TVs, and any clutter piles. Each has a short id (like "bed", "mirror-1"), a kind, a short plain detail that mentions something specific and visible ("the tall mirror leaning on the wardrobe", "the chair buried in laundry"), and a box [x, y, w, h] as fractions of the image width and height (0 to 1, from the top-left).

layout: a rough top-down sketch of the room in 0..1 coordinates. x goes from the left wall (0) to the right wall (1) as seen from the camera. y goes from the far wall (0) to the wall the camera stands at (1), which is "near". Place the door and windows on walls ("at" is the position along that wall, 0..1, left-to-right for far/near and far-to-near for left/right; "size" is the window's width as a fraction of the wall). Place pieces of furniture as rectangles (x, y, w, h). For the bed, set head to the wall the headboard is against; for everything else head is null. If the door isn't visible, set door to null unless you can clearly infer it (for example, the photo is taken from the doorway, in which case it's on the near wall). Make the sketch consistent with the facts.

observations: up to 5 specific, slightly funny-in-their-honesty things a sharp grandmother would notice about the room's objects, in plain words, e.g. "a mug collection on the nightstand", "a guitar nobody has touched in a while". Objects only. Never people, bodies, or anything private.

confidence: "high" if the room is clear and well lit, "medium" if parts are hidden, "low" if the photo is blurry, dark, or a tight close-up.`;

export type Provider = "anthropic" | "groq";

export interface EyesConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
}

export type MediaType = "image/jpeg" | "image/png" | "image/webp";

export class EyesError extends Error {
  constructor(
    public code: "refused" | "unreadable" | "upstream" | "busy" | "tired",
    message: string,
  ) {
    super(message);
  }
}

export async function look(cfg: EyesConfig, image: string, mediaType: MediaType): Promise<Scene> {
  const json = cfg.provider === "groq" ? await lookGroq(cfg, image, mediaType) : await lookClaude(cfg, image, mediaType);
  const parsed = Scene.safeParse(json);
  if (!parsed.success) throw new EyesError("unreadable", "schema mismatch");
  return sanitizeScene(parsed.data);
}

async function lookGroq(cfg: EyesConfig, image: string, mediaType: MediaType): Promise<unknown> {
  try {
    return await groqJson({
      apiKey: cfg.apiKey,
      model: cfg.model,
      effort: cfg.effort,
      system: EYES_SYSTEM,
      user: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
        { type: "text", text: "Report this room as JSON." },
      ],
      schemaName: "scene",
      schema: sceneJsonSchema() as Record<string, unknown>,
      maxTokens: 8000,
      // She should see the same room the same way every time.
      temperature: 0,
      seed: 1,
      timeoutMs: 60_000,
      // Free-tier limits reset every minute; a short wait beats an error.
      maxWaitMs: 25_000,
    });
  } catch (e) {
    if (e instanceof GroqError) throw new EyesError(e.code, e.message);
    throw new EyesError("upstream", "network error");
  }
}

async function lookClaude(cfg: EyesConfig, image: string, mediaType: MediaType): Promise<unknown> {
  const client = new Anthropic({ apiKey: cfg.apiKey, maxRetries: 1, timeout: 90_000 });
  let res;
  try {
    res = await client.beta.messages.create({
      model: cfg.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: EYES_SYSTEM,
      output_config: { effort: cfg.effort, format: { type: "json_schema", schema: sceneJsonSchema() } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: "Report this room as JSON." },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new EyesError("busy", "rate limited upstream");
    if (e instanceof Anthropic.APIError) throw new EyesError("upstream", `api error ${e.status ?? ""}`);
    throw new EyesError("upstream", "network error");
  }
  if (res.stop_reason === "refusal") throw new EyesError("refused", "declined");
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new EyesError("unreadable", "not json");
  }
}
