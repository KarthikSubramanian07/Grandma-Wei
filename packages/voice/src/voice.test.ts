import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Reading, Scene } from "@gw/schema";
import { PILLARS } from "@gw/schema";
import * as lines from "./lines";
import { compose, lint, mergeVoice, retakeLine } from "./index";

const contract = join(import.meta.dir, "../../../fixtures/contract");
const load = <T>(f: string): T => JSON.parse(readFileSync(join(contract, f), "utf8"));

function messy(): { scene: Scene; reading: Reading } {
  const scene = load<Scene>("messy.scene.json");
  scene.items = [
    { id: "bed", kind: "bed", detail: "the bed with the grey duvet", box: [0.3, 0.45, 0.4, 0.3] },
    { id: "mirror", kind: "mirror", detail: "the tall mirror on the wardrobe", box: [0.8, 0.2, 0.1, 0.5] },
    { id: "chair", kind: "chair", detail: "the chair under a laundry mountain", box: [0.05, 0.5, 0.15, 0.3] },
    { id: "desk", kind: "desk", detail: "the white desk", box: [0.0, 0.4, 0.2, 0.3] },
  ];
  return { scene, reading: load<Reading>("messy.reading.json") };
}

function allStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => allStrings(x, out));
  return out;
}

describe("line bank", () => {
  test("every hand-written line passes her own linter", () => {
    const strings = allStrings([
      lines.GRADE, lines.HEADLINES, lines.NO_HEADLINE, lines.CHORES, lines.CHORE_VARIANTS, lines.WHY,
      lines.NOTES, lines.UNSEEN, lines.STATES, lines.RETAKE, lines.MAGNETS,
    ]);
    expect(strings.length).toBeGreaterThan(150);
    for (const s of strings) expect({ s, problems: lint(s) }).toEqual({ s, problems: [] });
  });

  test("every rule has a reason and a name, every magnet a name", () => {
    const rules = Object.keys(lines.HEADLINES);
    expect(rules.length).toBe(18);
    for (const r of rules) {
      expect(lines.WHY[r as keyof typeof lines.WHY]).toBeTruthy();
      expect(lines.RULE_NAME[r as keyof typeof lines.RULE_NAME]).toBeTruthy();
    }
    expect(Object.keys(lines.MAGNETS).length).toBe(13);
    expect(PILLARS.length).toBe(5);
  });

  test("sticky notes are short enough to fit on a sticky note", () => {
    for (const n of allStrings(lines.NOTES)) expect(n.length).toBeLessThanOrEqual(28);
  });
});

describe("linter", () => {
  const bad = [
    "Velly bad room, you know",
    "Confucius say move the bed",
    "Ancient Chinese secret: tidy up",
    "You lazy slob",
    "As an AI I cannot judge",
    "Nice room 🙂",
    "This will guarantee wealth",
    "You look tired",
    "Read more at https://example.com",
  ];
  for (const b of bad) test(`rejects: ${b}`, () => expect(lint(b).length).toBeGreaterThan(0));
  test("accepts her normal voice", () => {
    expect(lint("Your bed is in the coffin position. I'm not angry. I'm worried.")).toEqual([]);
    expect(lint("Hello. The glass on the shelf is fine.")).toEqual([]);
  });
});

describe("compose", () => {
  test("is deterministic for a seed and leads with the coffin", () => {
    const { scene, reading } = messy();
    const a = compose(scene, reading, "seed-1");
    expect(compose(scene, reading, "seed-1")).toEqual(a);
    expect(lines.HEADLINES.bed_door.coffin).toContain(a.headline);
    expect(a.grade).toBe("Worrying.");
    expect(a.chores[0]!.id).toBe("move_bed");
    expect(a.from_bank).toBe(true);
  });

  test("notes stick to things that are actually in the photo", () => {
    const { scene, reading } = messy();
    const v = compose(scene, reading, "s");
    const ids = new Set(scene.items.map((i) => i.id));
    expect(v.notes.length).toBeGreaterThan(0);
    for (const n of v.notes) expect(ids.has(n.item_id)).toBe(true);
    expect(v.notes.find((n) => n.item_id === "mirror")?.rule).toBe("mirror_facing_bed");
  });

  test("not a room gets no score and a gentle redirect", () => {
    const { scene } = messy();
    const v = compose(scene, { ...messy().reading, state: "not_a_room", score: null, grade: null }, "s");
    expect(lines.STATES.not_a_room).toContain(v.headline as (typeof lines.STATES.not_a_room)[number]);
    expect(v.grade).toBeNull();
  });

  test("people in the photo are acknowledged once, and ignored", () => {
    const { scene, reading } = messy();
    const v = compose({ ...scene, people_present: true }, reading, "s");
    expect(v.asks[0]).toBe(lines.STATES.people_present);
  });
});

describe("retake", () => {
  test("big improvement gets pride, regression gets noticed", () => {
    const base = { before: 40, after: 70, improved: [], worsened: [], magnets: [], different_room: false } as const;
    expect(lines.RETAKE.big).toContain(retakeLine({ ...base, delta: 30 }, "s") as never);
    expect(retakeLine({ ...base, delta: 2, worsened: ["clutter"] }, "s")).toContain("clutter got worse");
    expect(lines.RETAKE.different_room).toContain(retakeLine({ ...base, delta: 0, different_room: true }, "s") as never);
  });
});

describe("mergeVoice", () => {
  test("keeps good rewrites and rejects bad ones line by line", () => {
    const { scene, reading } = messy();
    const draft = compose(scene, reading, "s");
    const { voice, rejected } = mergeVoice(
      draft,
      {
        headline: "Coffin position, and the laundry chair is watching. I'm not angry. I'm worried.",
        aside: "Velly bad, you know.",
        notes: [{ item_id: draft.notes[0]!.item_id, text: "Move This. Today." }],
        chores: [{ id: "move_bed", text: "Score 99 if you move the bed." }],
      },
      reading.score,
    );
    expect(voice.headline).toContain("laundry chair");
    expect(voice.aside).toBe(draft.aside);
    expect(voice.notes[0]!.text).toBe("move this. today.");
    expect(voice.chores[0]!.text).toBe(draft.chores[0]!.text);
    expect(rejected.some((r) => r.startsWith("aside"))).toBe(true);
    expect(rejected.some((r) => r.includes("invented number"))).toBe(true);
    expect(voice.from_bank).toBe(false);
  });
});
