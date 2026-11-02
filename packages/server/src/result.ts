import type { Diff, Effort, Layout, Pillar, Reading, Scene } from "@gw/schema";
import { MAGNETS, type Voice } from "@gw/voice";

/** Everything the browser needs to show a reading. */
export interface ReadingResult {
  id: string;
  rules_version: number;
  /** Sample room name, when this is a practice reading. */
  sample: string | null;
  scene: Scene;
  reading: Reading;
  voice: Voice;
  diff: Diff | null;
  /** Grandma's suggested spot for the bed on the sketch. */
  suggestion: Layout["pieces"][number] | null;
}

/** What the server signs and later trusts: the scene, her words, the change. */
export interface Signed {
  v: 1;
  id: string;
  sample: string | null;
  scene: Scene;
  voice: Voice;
  diff: Diff | null;
}

export interface Envelope {
  result: ReadingResult;
  /** Exact JSON string that was signed. Send it back verbatim. */
  signed: string;
  sig: string;
}

/** A shared scorecard. Text only: no photo, no scene sketch, nothing private. */
export interface SharePayload {
  id: string;
  created: number;
  rules_version: number;
  sample: string | null;
  kind: Scene["kind"];
  score: number | null;
  grade: string | null;
  headline: string;
  aside: string;
  pillars: Record<Pillar, number | null>;
  chores: { text: string; points: number; effort: Effort; later: boolean }[];
  potential: number | null;
  magnets: { id: string; name: string }[];
  retake: string | null;
  delta: number | null;
}

export function sharePayload(id: string, created: number, rulesVersion: number, s: Signed, reading: Reading): SharePayload {
  return {
    id,
    created,
    rules_version: rulesVersion,
    sample: s.sample,
    kind: s.scene.kind,
    score: reading.score,
    grade: s.voice.grade,
    headline: s.voice.headline,
    aside: s.voice.aside,
    pillars: reading.pillars,
    chores: reading.chores.slice(0, 3).map((c) => ({
      text: s.voice.chores.find((v) => v.id === c.id)?.text ?? "",
      points: c.points,
      effort: c.effort,
      later: c.blocked_by !== null,
    })),
    potential: reading.potential,
    magnets: [...reading.magnets, ...(s.diff?.magnets ?? [])].map((m) => ({ id: m, name: MAGNETS[m].name })),
    retake: s.voice.retake,
    delta: s.diff?.delta ?? null,
  };
}
