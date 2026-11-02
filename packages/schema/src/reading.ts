/**
 * What the qi engine returns. Mirrors crates/qi (reading.rs, chores.rs, magnets.rs).
 * These are engine outputs, so they're plain types rather than validators.
 */

export type Pillar = "command" | "flow" | "rest" | "light" | "balance";
export const PILLARS: Pillar[] = ["command", "flow", "rest", "light", "balance"];

export type Status = "good" | "warn" | "bad" | "unseen";
export type Effort = "two_minutes" | "twenty_minutes" | "an_hour" | "an_afternoon" | "a_weekend";
export type GradeKey = "oh_no" | "worrying" | "fine" | "acceptable" | "lovely" | "id_sleep_here";
export type ReadingState = "ok" | "not_a_room" | "need_better_photo";

export type RuleId =
  | "bed_door"
  | "headboard"
  | "headboard_solid"
  | "desk"
  | "door_path"
  | "door_opens_fully"
  | "clutter"
  | "under_bed"
  | "door_window_aligned"
  | "mirror_facing_bed"
  | "over_bed"
  | "electronics_near_bed"
  | "bed_access"
  | "sharp_corners"
  | "natural_light"
  | "artificial_light"
  | "plants"
  | "elements";

export type ChoreId =
  | "move_bed"
  | "solid_headboard"
  | "move_desk"
  | "declutter"
  | "clear_door_path"
  | "free_the_door"
  | "clear_under_bed"
  | "break_the_line"
  | "turn_the_mirror"
  | "screens_out"
  | "soften_corners"
  | "let_light_in"
  | "warm_lamp"
  | "real_plant"
  | "balance_elements";

export type MagnetId =
  | "first_reading"
  | "out_of_the_coffin"
  | "mirror_mirror"
  | "clean_under_there"
  | "commanding_officer"
  | "plant_parent"
  | "tidy_up"
  | "screens_down"
  | "open_door_policy"
  | "five_elements"
  | "glow_up"
  | "eighty_club"
  | "id_sleep_here";

export interface Finding {
  rule: RuleId;
  pillar: Pillar;
  status: Status;
  quality: number | null;
  drag: number;
}

export interface Chore {
  id: ChoreId;
  because: RuleId[];
  effort: Effort;
  points: number;
  element: "wood" | "fire" | "earth" | "metal" | "water" | null;
  /** Set when a deal-breaker holds the score down: the points count once that chore is done. */
  blocked_by: ChoreId | null;
}

export interface Reading {
  state: ReadingState;
  score: number | null;
  grade: GradeKey | null;
  pillars: Record<Pillar, number | null>;
  findings: Finding[];
  chores: Chore[];
  headline: RuleId | null;
  unseen: RuleId[];
  magnets: MagnetId[];
  potential: number | null;
}

export interface Diff {
  before: number | null;
  after: number | null;
  delta: number | null;
  improved: RuleId[];
  worsened: RuleId[];
  magnets: MagnetId[];
  different_room: boolean;
}

export const EFFORT_LABEL: Record<Effort, string> = {
  two_minutes: "2 minutes",
  twenty_minutes: "20 minutes",
  an_hour: "An hour",
  an_afternoon: "An afternoon",
  a_weekend: "A weekend",
};

export const PILLAR_LABEL: Record<Pillar, string> = {
  command: "Command",
  flow: "Flow",
  rest: "Rest",
  light: "Light",
  balance: "Balance",
};
