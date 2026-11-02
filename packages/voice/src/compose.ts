import type { ChoreId, Diff, Reading, RuleId, Scene } from "@gw/schema";
import {
  CHORES,
  CHORE_VARIANTS,
  GRADE,
  HEADLINES,
  NO_HEADLINE,
  NOTES,
  RETAKE,
  RULE_NAME,
  STATES,
  UNSEEN,
} from "./lines";
import { pick } from "./pick";

export interface Note {
  /** Which item on the photo the note is stuck to. */
  item_id: string;
  text: string;
  rule: RuleId;
  tone: "bad" | "warn" | "good";
}

export interface Voice {
  headline: string;
  /** One-word grade label, e.g. "Worrying." Null when there's no score. */
  grade: string | null;
  aside: string;
  notes: Note[];
  chores: { id: ChoreId; text: string }[];
  /** Requests for a better photo, or a word about people in it. */
  asks: string[];
  /** Only on a retake: her reaction to the change. */
  retake: string | null;
  /** True when every line came from the hand-written bank. */
  from_bank: boolean;
}

/** The value of the fact behind a rule, as the key used by the line bank. */
export function factKey(scene: Scene, rule: RuleId, quality: number | null): string {
  const f = scene.facts;
  switch (rule) {
    case "elements":
      return quality !== null && quality < 0.9 ? "poor" : "fine";
    case "bed_door":
      return f.bed_door;
    case "headboard":
      return f.headboard;
    case "headboard_solid":
      return f.headboard_solid;
    case "desk":
      return f.desk;
    case "door_path":
      return f.door_path;
    case "door_opens_fully":
      return f.door_opens_fully;
    case "clutter":
      return f.clutter;
    case "under_bed":
      return f.under_bed;
    case "door_window_aligned":
      return f.door_window_aligned;
    case "mirror_facing_bed":
      return f.mirror_facing_bed;
    case "over_bed":
      return f.over_bed;
    case "electronics_near_bed":
      return f.electronics_near_bed;
    case "bed_access":
      return f.bed_access;
    case "sharp_corners":
      return f.sharp_corners;
    case "natural_light":
      return f.natural_light;
    case "artificial_light":
      return f.artificial_light;
    case "plants":
      return f.plants;
  }
}

/** Which kinds of thing on the photo a rule's note can stick to, best first. */
const NOTE_TARGETS: Record<RuleId, string[]> = {
  bed_door: ["bed"],
  headboard: ["bed", "window"],
  headboard_solid: ["bed"],
  over_bed: ["bed"],
  under_bed: ["bed"],
  bed_access: ["bed"],
  mirror_facing_bed: ["mirror"],
  electronics_near_bed: ["tv", "lamp", "bed"],
  desk: ["desk", "chair"],
  door_path: ["door", "clutter"],
  door_opens_fully: ["door"],
  door_window_aligned: ["window", "door"],
  clutter: ["clutter", "chair", "table", "other"],
  sharp_corners: ["table", "desk", "shelf"],
  natural_light: ["window"],
  artificial_light: ["lamp"],
  plants: ["plant"],
  elements: [],
};

export function choreText(scene: Scene, reading: Reading, id: ChoreId): string {
  const chore = reading.chores.find((c) => c.id === id);
  if (id === "declutter" && scene.facts.clutter === "heavy") return CHORE_VARIANTS.declutter_heavy;
  if (id === "move_bed" && scene.facts.over_bed === "yes") return CHORE_VARIANTS.move_bed_beam;
  if (id === "real_plant" && scene.facts.plants === "struggling") return CHORE_VARIANTS.real_plant_struggling;
  if (id === "balance_elements" && chore?.element) return CHORE_VARIANTS.elements[chore.element];
  return CHORES[id];
}

function notesFor(scene: Scene, reading: Reading, seed: string): Note[] {
  const used = new Set<string>();
  const notes: Note[] = [];
  const ordered = [...reading.findings].sort((a, b) => b.drag - a.drag);
  for (const f of ordered) {
    if (notes.length >= 4) break;
    if (f.status !== "bad" && f.status !== "warn") continue;
    const lines = NOTES[`${f.rule}:${factKey(scene, f.rule, f.quality)}`];
    if (!lines) continue;
    const item = NOTE_TARGETS[f.rule]
      .map((k) => scene.items.find((i) => i.kind === k && !used.has(i.id)))
      .find(Boolean);
    if (!item) continue;
    used.add(item.id);
    notes.push({ item_id: item.id, text: pick(lines, seed, f.rule), rule: f.rule, tone: f.status === "bad" ? "bad" : "warn" });
  }
  // One kind word if she has room for it.
  if (notes.length < 3) {
    for (const f of reading.findings) {
      if (f.status !== "good") continue;
      const lines = NOTES[`${f.rule}:${factKey(scene, f.rule, f.quality)}`];
      if (!lines) continue;
      const item = NOTE_TARGETS[f.rule].map((k) => scene.items.find((i) => i.kind === k && !used.has(i.id))).find(Boolean);
      if (!item) continue;
      notes.push({ item_id: item.id, text: pick(lines, seed, f.rule), rule: f.rule, tone: "good" });
      break;
    }
  }
  return notes;
}

export function retakeLine(diff: Diff, seed: string): string {
  if (diff.different_room) return pick(RETAKE.different_room, seed, "retake");
  const d = diff.delta ?? 0;
  let line: string = pick(
    d >= 15 ? RETAKE.big : d >= 5 ? RETAKE.medium : d >= 1 ? RETAKE.small : d === 0 ? RETAKE.same : RETAKE.worse,
    seed,
    "retake",
  );
  const worse = diff.worsened[0];
  if (worse && d >= 0) line += ` But the ${RULE_NAME[worse]} got worse. I see everything.`;
  return line;
}

/** Grandma's words for a reading, entirely from the hand-written bank. Deterministic for a given seed. */
export function compose(scene: Scene, reading: Reading, seed: string, diff?: Diff): Voice {
  const asks: string[] = [];
  if (scene.people_present) asks.push(STATES.people_present);

  if (reading.state === "not_a_room") {
    return {
      headline: pick(STATES.not_a_room, seed, "state"),
      grade: null,
      aside: "Take a photo of the room you sleep or work in, from a corner, with the lights on.",
      notes: [],
      chores: [],
      asks,
      retake: null,
      from_bank: true,
    };
  }
  for (const rule of reading.unseen) {
    const ask = UNSEEN[rule];
    if (ask && asks.length < 2) asks.push(ask);
  }
  if (reading.state === "need_better_photo") {
    return {
      headline: pick(STATES.need_better_photo, seed, "state"),
      grade: null,
      aside: "Stand in a corner, hold the phone at chest height, and get the door in if you can.",
      notes: [],
      chores: [],
      asks,
      retake: null,
      from_bank: true,
    };
  }
  if (scene.confidence === "low") asks.push(STATES.low_confidence);

  let headline = pick(NO_HEADLINE, seed, "headline");
  if (reading.headline) {
    const f = reading.findings.find((x) => x.rule === reading.headline);
    const key = factKey(scene, reading.headline, f?.quality ?? null);
    const lines = HEADLINES[reading.headline][key];
    if (lines?.length) headline = pick(lines, seed, "headline");
  }
  const grade = reading.grade ? GRADE[reading.grade] : null;

  return {
    headline,
    grade: grade?.label ?? null,
    aside: grade ? pick(grade.asides, seed, "aside") : "",
    notes: notesFor(scene, reading, seed),
    chores: reading.chores.map((c) => ({ id: c.id, text: choreText(scene, reading, c.id) })),
    asks,
    retake: diff ? retakeLine(diff, seed) : null,
    from_bank: true,
  };
}
