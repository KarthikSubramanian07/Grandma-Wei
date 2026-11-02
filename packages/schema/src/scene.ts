import { z } from "zod";

/**
 * The Scene is everything Grandma's eyes report about a room photo.
 *
 * It is deliberately made of discrete choices, not free numbers, so two
 * looks at the same room land on the same facts and the score stays put.
 * Every fact can be "unseen": the engine leaves unseen rules out of the
 * score instead of guessing, and Grandma asks for a better angle.
 *
 * Keep in sync with crates/qi/src/scene.rs (a shared fixture test guards it).
 */

const tri = z.enum(["yes", "no", "unseen"]);
const triNa = z.enum(["yes", "no", "unseen", "na"]);

export const RoomKind = z.enum([
  "bedroom",
  "studio",
  "living_room",
  "office",
  "kids_room",
  "dorm",
  "other",
]);

export const Facts = z.object({
  /** Where the bed sits relative to the door. */
  bed_door: z.enum([
    "commanding", // can see the door from bed, not directly in line with it
    "coffin", // feet point straight out the door
    "in_line_head", // head end toward the door, door right beside or behind
    "no_view", // door is behind the sleeper or out of sight from bed
    "unseen",
    "na",
  ]),
  /** What is behind the head of the bed. */
  headboard: z.enum(["solid_wall", "window", "floating", "unseen", "na"]),
  /** A solid headboard (not slats, not nothing). */
  headboard_solid: triNa,
  /** Heavy beam, slanted ceiling, or shelf directly over the bed. */
  over_bed: triNa,
  /** A mirror that reflects the bed. */
  mirror_facing_bed: triNa,
  /** What lives under the bed. */
  under_bed: z.enum(["clear", "tidy_storage", "cluttered", "unseen", "na"]),
  /** Can you get in from both sides. */
  bed_access: z.enum(["both_sides", "one_side", "unseen", "na"]),
  /** Phones, TVs, chargers, laptops within reach of the pillow. */
  electronics_near_bed: z.enum(["none", "some", "lots", "unseen", "na"]),
  /** Desk orientation. */
  desk: z.enum(["commanding", "back_to_door", "facing_wall", "unseen", "na"]),
  /** Path from the door into the room. */
  door_path: z.enum(["clear", "partly_blocked", "blocked", "unseen"]),
  /** Door can swing all the way open. */
  door_opens_fully: tri,
  /** Door directly opposite a window: qi rushes straight through. */
  door_window_aligned: tri,
  /** Overall visible clutter. */
  clutter: z.enum(["minimal", "some", "heavy"]),
  /** Sharp furniture corners aimed at where you sleep or sit. */
  sharp_corners: tri,
  /** Daylight. */
  natural_light: z.enum(["bright", "some", "dim", "unseen"]),
  /** Lamps and fixtures. */
  artificial_light: z.enum(["layered_warm", "single_overhead", "harsh", "unseen"]),
  /** Plants. */
  plants: z.enum(["healthy", "none", "struggling", "artificial"]),
  /** Five elements, read from colors and materials. */
  elements: z.object({
    wood: z.enum(["absent", "present", "dominant"]),
    fire: z.enum(["absent", "present", "dominant"]),
    earth: z.enum(["absent", "present", "dominant"]),
    metal: z.enum(["absent", "present", "dominant"]),
    water: z.enum(["absent", "present", "dominant"]),
  }),
});

export const ItemKind = z.enum([
  "bed",
  "desk",
  "chair",
  "sofa",
  "mirror",
  "door",
  "window",
  "plant",
  "clutter",
  "wardrobe",
  "shelf",
  "lamp",
  "tv",
  "table",
  "rug",
  "art",
  "other",
]);

/** An object pinned on the photo. Box is [x, y, w, h], each 0..1 of the image. */
export const Item = z.object({
  id: z.string(),
  kind: ItemKind,
  /** A short, specific description in plain words, e.g. "the laundry mountain on the chair". */
  detail: z.string(),
  box: z.array(z.number()),
});

export const Wall = z.enum(["near", "far", "left", "right"]);

/**
 * A rough top-down sketch of the room in 0..1 coordinates.
 * x runs left to right, y runs from the far wall (0) to the camera wall (1).
 */
export const Layout = z.object({
  door: z.object({ wall: Wall, at: z.number() }).nullable(),
  windows: z.array(z.object({ wall: Wall, at: z.number(), size: z.number() })),
  pieces: z.array(
    z.object({
      kind: ItemKind,
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      /** For beds: which wall the head of the bed is against. */
      head: Wall.nullable(),
    }),
  ),
});

export const Scene = z.object({
  /** False when the photo is not a room at all (a cat, a sandwich, a face). */
  is_room: z.boolean(),
  kind: RoomKind,
  /** People are in the photo. Grandma doesn't comment on people. */
  people_present: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]),
  facts: Facts,
  items: z.array(Item),
  layout: Layout,
  /** Specific things Grandma would notice: "a mug graveyard on the nightstand". Never about people. */
  observations: z.array(z.string()),
});

export type Scene = z.infer<typeof Scene>;
export type Facts = z.infer<typeof Facts>;
export type Item = z.infer<typeof Item>;
export type Layout = z.infer<typeof Layout>;
export type Wall = z.infer<typeof Wall>;
export type ItemKind = z.infer<typeof ItemKind>;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Tidy a scene that passed validation: clamp every coordinate to the room,
 * drop malformed boxes, cap list lengths. Never trust a model's numbers.
 */
export function sanitizeScene(scene: Scene): Scene {
  const items = scene.items
    .filter((i) => i.box.length === 4)
    .slice(0, 16)
    .map((i, n) => {
      const [x, y, w, h] = i.box.map(clamp01) as [number, number, number, number];
      return {
        ...i,
        id: i.id || `item-${n}`,
        detail: i.detail.slice(0, 120),
        box: [x, y, Math.min(w, 1 - x), Math.min(h, 1 - y)],
      };
    });
  const layout: Layout = {
    door: scene.layout.door ? { wall: scene.layout.door.wall, at: clamp01(scene.layout.door.at) } : null,
    windows: scene.layout.windows.slice(0, 6).map((w) => ({ ...w, at: clamp01(w.at), size: clamp01(w.size) })),
    pieces: scene.layout.pieces.slice(0, 16).map((p) => {
      const w = Math.max(0.02, clamp01(p.w));
      const h = Math.max(0.02, clamp01(p.h));
      return { ...p, w, h, x: Math.min(clamp01(p.x), 1 - w), y: Math.min(clamp01(p.y), 1 - h) };
    }),
  };
  return {
    ...scene,
    items,
    layout,
    observations: scene.observations.slice(0, 6).map((o) => o.slice(0, 140)),
  };
}
