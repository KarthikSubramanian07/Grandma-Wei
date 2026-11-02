/**
 * Grandma Wei's line bank.
 *
 * Voice rules (also enforced by lint.ts):
 * - Warm, dry, specific, always right. She's concerned, never cruel.
 * - Jokes are about the room. Never about the person's body, worth, or culture.
 * - No accent spelling, no fortune-cookie aphorisms, no "ancient secrets".
 * - Every roast comes with a fix you can actually do.
 */

import type { ChoreId, GradeKey, MagnetId, RuleId } from "@gw/schema";

export const GRADE: Record<GradeKey, { label: string; asides: string[] }> = {
  oh_no: {
    label: "Oh no.",
    asides: [
      "Sit down. I'll make tea. Then we start with the bed.",
      "Don't be sad. We fix one thing at a time, and the first thing is easy.",
      "I've seen rooms come back from worse. Not many. Some.",
    ],
  },
  worrying: {
    label: "Worrying.",
    asides: [
      "I've seen worse. Not many. Sit down, we're fixing this.",
      "It's not hopeless. It's just very, very busy being wrong.",
      "You have good bones in here. Let's stop hiding them.",
    ],
  },
  fine: {
    label: "Fine. Just fine.",
    asides: [
      "Fine is not a compliment. But it's a start.",
      "Halfway there. The second half is the fun part. For me.",
      "Not bad. Not good. Let's go for good.",
    ],
  },
  acceptable: {
    label: "Acceptable.",
    asides: [
      "You're close. I can almost relax.",
      "Good. A few things, and then I stop talking. Maybe.",
      "Someone has been listening. Keep going.",
    ],
  },
  lovely: {
    label: "Lovely.",
    asides: [
      "Lovely. Don't let it go to your head.",
      "Very nice. I'm only saying it once.",
      "This room is looking after you. Look after it back.",
    ],
  },
  id_sleep_here: {
    label: "I'd sleep here.",
    asides: [
      "I'd sleep here. I won't, but I would.",
      "I have nothing to say. Write that down. It won't happen again.",
      "Perfect. Now call your mother and tell her I said so.",
    ],
  },
};

/** Her headline, keyed by the rule dragging the room down most and how it went wrong. */
export const HEADLINES: Record<RuleId, Record<string, string[]>> = {
  bed_door: {
    coffin: [
      "Your bed is in the coffin position. I'm not angry. I'm worried.",
      "Feet pointing straight out the door. That's how they carry you out. Move the bed.",
      "You sleep in the coffin position. I didn't sleep at all after seeing it.",
    ],
    no_view: [
      "You can't see the door from your bed. Anyone could walk in. Even me.",
      "You sleep with your back to the door. Who taught you this? Not me.",
    ],
    in_line_head: [
      "The door opens right at your head. Every time it opens, your pillow knows.",
      "Your head is in line with the door. Sleep is not a hallway.",
    ],
  },
  headboard: {
    window: [
      "Your headboard is against a window. Your head deserves a wall. Everyone's does.",
      "You sleep with your head under a window. It's drafty, it's bright, it's wrong.",
    ],
    floating: [
      "Your bed is floating in the room like a raft. Give it a wall.",
      "Nothing behind your head but air. Air doesn't have your back.",
    ],
  },
  headboard_solid: {
    no: [
      "A headboard with gaps is not a headboard. It's a fence.",
      "No proper headboard. Your head is doing all the work.",
    ],
  },
  desk: {
    back_to_door: [
      "You work with your back to the door. Every footstep is a jump scare.",
      "Your back is to the door while you work. No wonder you check your phone so much.",
    ],
    facing_wall: [
      "Your desk faces a wall. You're not in trouble. Turn around.",
      "You stare at a wall all day. The wall is not going to give you ideas.",
    ],
  },
  door_path: {
    blocked: [
      "I couldn't get in. I'm small and I couldn't get in.",
      "The way in is blocked. Qi gave up at the door. So did I.",
    ],
    partly_blocked: [
      "Something is in the way of the door. Qi trips on it. So will you, at 3 a.m.",
      "The way in is an obstacle course. Good energy doesn't do obstacle courses.",
    ],
  },
  door_opens_fully: {
    no: [
      "The door doesn't open all the way. Whatever is behind it, it's not worth it.",
      "Your door can only open halfway. Your life deserves the whole door.",
    ],
  },
  clutter: {
    heavy: [
      "I can see the floor in three places. I counted.",
      "This isn't clutter. This is a second room inside your room.",
      "So many things. Each one wants your attention. No wonder you're tired.",
    ],
    some: [
      "It's not a mess. It's piles. Piles become messes. I've seen it happen.",
      "A little clutter here, a little there. It adds up. I'm adding it up.",
    ],
  },
  under_bed: {
    cluttered: [
      "There are things under your bed. I know. I can feel them.",
      "You're sleeping on top of storage. Your dreams are full of boxes.",
    ],
    tidy_storage: [
      "Tidy boxes under the bed. Tidy is better than messy. Empty is better than tidy.",
    ],
  },
  door_window_aligned: {
    yes: [
      "Your door and window line up, so good energy walks straight through and leaves. Like your cousin at dinner.",
      "Door, window, straight line. Everything good comes in and goes right out.",
    ],
  },
  mirror_facing_bed: {
    yes: [
      "There's a mirror watching you sleep. I'm watching the mirror.",
      "Your mirror faces the bed. Nobody needs to see themselves at 4 a.m.",
    ],
  },
  over_bed: {
    yes: [
      "Something heavy is hanging over your bed. Don't sleep under things.",
      "A beam over the bed. You'll feel it pressing on you even if you don't know why.",
    ],
  },
  electronics_near_bed: {
    lots: [
      "You sleep next to more chargers than an airport.",
      "So many screens by the pillow. Your bed is an office now. That's sad.",
    ],
    some: [
      "Your phone sleeps closer to you than anyone. Put it across the room.",
      "A screen by the pillow. It will win every argument with your sleep.",
    ],
  },
  bed_access: {
    one_side: [
      "Your bed is pushed against the wall. Only one way in. That's a narrow way to live.",
    ],
  },
  sharp_corners: {
    yes: [
      "That corner is pointing right at you. It's rude.",
      "Sharp corner aimed where you sit. It's not personal. It's still rude.",
    ],
  },
  natural_light: {
    dim: [
      "It's so dark in here. Open something. A curtain. A window. Your heart.",
      "Where's the daylight? Your plants are asking. You don't have plants. That's why.",
    ],
    some: ["Some daylight gets in. Let more in. It's free."],
  },
  artificial_light: {
    single_overhead: [
      "One light on the ceiling, like an interrogation. Get a lamp.",
      "A single overhead light. Very bright, very flat, very hospital.",
    ],
    harsh: [
      "This light is so harsh I can see my own mistakes.",
      "Cold, bright light at night. Your brain thinks it's noon. Forever.",
    ],
  },
  plants: {
    struggling: [
      "That plant is asking for help. I heard it.",
      "Your plant is not doing well. Water it, or let it go with dignity.",
    ],
    artificial: [
      "A plastic plant. It doesn't need water. It doesn't need you. Get a real one.",
    ],
    none: ["Nothing alive in here but you. And I'm checking on you."],
  },
  elements: {
    poor: [
      "Everything in here is the same. Same color, same material. Even the qi is bored.",
      "No variety. A room needs a little wood, a little metal, a little warmth. Like a soup.",
    ],
  },
};

/** When there's nothing to complain about. */
export const NO_HEADLINE = [
  "I have nothing to say. Write that down. It won't happen again.",
  "I looked everywhere. I found nothing. I'm a little disappointed, honestly.",
];

export const CHORES: Record<ChoreId, string> = {
  move_bed:
    "Move the bed: headboard against a solid wall, where you can see the door from your pillow without being in line with it.",
  solid_headboard: "Get a solid headboard, wood or upholstered. Something that has your back.",
  move_desk: "Turn the desk so you can see the door while you work. Your back goes to a wall, not to the hallway.",
  declutter: "Put the piles away. If a thing has no home, it doesn't stay.",
  clear_door_path: "Clear the path from the door. Qi should walk in without stepping over anything.",
  free_the_door: "Move whatever is behind the door so it opens all the way.",
  clear_under_bed: "Empty under the bed. If you really need storage there, closed boxes, soft things only.",
  break_the_line: "Put a plant, a rug, or a screen between the door and the window so the good energy stays a while.",
  turn_the_mirror: "Turn the mirror so it can't see the bed. Or cover it at night.",
  screens_out: "Charge your phone across the room. Your alarm clock can be an alarm clock.",
  soften_corners: "Angle the furniture so that corner points somewhere else. A plant in front of it works too.",
  let_light_in: "Open the curtains in the daytime. Clean the window. Let the light do its job.",
  warm_lamp: "Add a warm lamp at eye level. Ceiling lights are for operating rooms.",
  real_plant: "Get one real plant. Something easy, like a pothos. Water it. I'll check.",
  balance_elements: "Bring in something different: a material or color this room doesn't have yet.",
};

/** Variants that depend on the room's state. */
export const CHORE_VARIANTS = {
  declutter_heavy: "Pick one corner. Clear it. Tomorrow, the next one. By Sunday you'll see the floor.",
  move_bed_beam: "Move the bed out from under that beam, headboard to a solid wall, with a view of the door.",
  real_plant_struggling: "Save the plant: light, water, and a bigger pot. Or thank it and get a pothos.",
  elements: {
    wood: "Bring in wood: a plant, a wooden bowl, something green.",
    earth: "Bring in earth: ceramics, a clay pot, warm sand and terracotta colors.",
    water: "Bring in water: something blue or black, glass, a picture of the sea.",
    metal: "Bring in metal: a brass dish, a round metal frame, a little white or gray.",
    fire: "Bring in fire: warm light, a candle, a little red or orange.",
  },
} as const;

/** The practical reason behind each rule. Feng shui, but also just good sense. */
export const WHY: Record<RuleId, string> = {
  bed_door:
    "Seeing the entrance from bed without lying in its path is what designers call prospect and refuge: people rest more deeply when they can see who's coming.",
  headboard:
    "A wall behind your head means fewer drafts and less noise, and it feels safe. A window there is cold and bright at the wrong times.",
  headboard_solid: "A solid headboard blocks drafts and gives your back something to lean on.",
  desk: "Facing the door while you work avoids the startle of someone behind you, which breaks focus.",
  door_path: "A clear way in is safer at night and makes the room feel bigger the moment you enter.",
  door_opens_fully: "A door that can't open fully makes the room feel cramped and is easy to trip over.",
  clutter: "Every visible thing competes for attention. Clear surfaces are calmer and easier to clean.",
  under_bed: "Things under the bed collect dust right where you breathe all night.",
  door_window_aligned: "A straight line from door to window funnels drafts and pulls your eye out of the room.",
  mirror_facing_bed: "Movement in a mirror at the edge of your vision can wake a light sleeper.",
  over_bed: "Heavy things overhead make a bed feel unsafe, and shelves over beds do fall.",
  electronics_near_bed: "Screens and notification lights by the pillow are one of the most reliable ways to sleep badly.",
  bed_access: "Two ways into bed makes it easier to make, and easier to share.",
  sharp_corners: "Corners at hip or head height next to where you sit or sleep are bruises waiting to happen.",
  natural_light: "Daylight sets your internal clock. Morning light helps you sleep at night.",
  artificial_light:
    "Warm, low lamps in the evening tell your brain it's nearly bedtime. A bright overhead light says noon.",
  plants: "Living plants make a room feel calmer, and looking after something is good for you.",
  elements: "A mix of materials and colors (wood, ceramic, metal, glass, a little warmth) makes a room feel balanced.",
};

/** Short sticky notes, in her handwriting. Keyed by rule and state. */
export const NOTES: Record<string, string[]> = {
  "bed_door:coffin": ["coffin position. move it.", "feet at the door?!"],
  "bed_door:no_view": ["can't see the door"],
  "bed_door:in_line_head": ["door at your head"],
  "bed_door:commanding": ["good bed."],
  "headboard:window": ["not under the window"],
  "headboard:floating": ["give it a wall"],
  "mirror_facing_bed:yes": ["no.", "turn me around"],
  "under_bed:cluttered": ["what is under there", "I know what you did"],
  "clutter:heavy": ["this. all of this.", "where is the floor"],
  "clutter:some": ["piles."],
  "desk:back_to_door": ["back to the door?"],
  "desk:facing_wall": ["turn around"],
  "desk:commanding": ["good desk."],
  "electronics_near_bed:lots": ["so many chargers"],
  "electronics_near_bed:some": ["phone. across the room."],
  "plants:struggling": ["water me", "help"],
  "plants:artificial": ["plastic. really?"],
  "plants:healthy": ["good. water it."],
  "sharp_corners:yes": ["pointing at you"],
  "door_path:blocked": ["let me in"],
  "door_path:partly_blocked": ["mind the step"],
  "door_window_aligned:yes": ["qi leaves here"],
  "over_bed:yes": ["what's above you"],
  "artificial_light:single_overhead": ["softer"],
  "artificial_light:harsh": ["too bright"],
  "natural_light:dim": ["open this"],
};

/** When she couldn't see something important. */
export const UNSEEN: Partial<Record<RuleId, string>> = {
  bed_door: "I can't see your door. Stand in the corner and show me the door and the bed together.",
  door_path: "Where's the door? Show me the way in.",
  desk: "I see a desk but not where you sit. Show me from behind your chair.",
  mirror_facing_bed: "Is there a mirror somewhere I can't see? Turn around and show me.",
  under_bed: "Crouch down. I want to see under the bed. Don't argue.",
};

export const STATES = {
  not_a_room: [
    "That's not a room. I'm old, not blind.",
    "I read rooms. Not this. Show me where you sleep.",
    "Very nice. Now show me a room.",
  ],
  need_better_photo: [
    "I can't see enough to judge. Step back into a corner and get the whole room in.",
    "Too close. Too dark. Too something. Back up, turn on a light, and try again.",
  ],
  people_present: "Someone's in the photo. I'll pretend I didn't see them. Next time, just the room.",
  low_confidence: "The photo is hard to read, so take this with a grain of salt. A small one.",
} as const;

export const RETAKE = {
  different_room: ["That's a different room. Nice try.", "That's not the same room. I'll read it, but I noticed."],
  big: ["Look at that. I'm telling your mother.", "Is this the same room? I'm so proud I could cry. I won't."],
  medium: ["Better. I noticed. Don't stop now.", "Good. You listened. Keep listening."],
  small: ["A little better. A little is still better.", "Small steps. I'll allow it."],
  same: ["Same as before. Did you just take the photo again?", "Nothing changed. I can wait. I have time."],
  worse: ["Worse. What happened? Tell me what happened.", "Lower than before. I'm not mad. I'm going to sit down."],
} as const;

export const MAGNETS: Record<MagnetId, { name: string; blurb: string }> = {
  first_reading: { name: "First Visit", blurb: "She came, she saw, she had notes." },
  out_of_the_coffin: { name: "Out of the Coffin", blurb: "Moved the bed out of the coffin position." },
  mirror_mirror: { name: "Mirror, Mirror", blurb: "The mirror stopped watching you sleep." },
  clean_under_there: { name: "Clean Under There", blurb: "Nothing under the bed but floor." },
  commanding_officer: { name: "Commanding Officer", blurb: "Bed or desk in the commanding position." },
  plant_parent: { name: "Plant Parent", blurb: "A living plant, actually alive." },
  tidy_up: { name: "Tidy Up", blurb: "Less clutter than last time." },
  screens_down: { name: "Screens Down", blurb: "No screens by the pillow." },
  open_door_policy: { name: "Open Door Policy", blurb: "A clear way in." },
  five_elements: { name: "All Five", blurb: "Wood, fire, earth, metal and water, all present." },
  glow_up: { name: "Glow Up", blurb: "Up 20 points or more in one visit." },
  eighty_club: { name: "The Eighty Club", blurb: "Scored 80 or above." },
  id_sleep_here: { name: "I'd Sleep Here", blurb: "Scored 92 or above. She'd sleep here." },
};

export const RULE_NAME: Record<RuleId, string> = {
  bed_door: "bed position",
  headboard: "headboard wall",
  headboard_solid: "headboard",
  desk: "desk position",
  door_path: "way in",
  door_opens_fully: "door",
  clutter: "clutter",
  under_bed: "under the bed",
  door_window_aligned: "door and window",
  mirror_facing_bed: "mirror",
  over_bed: "thing over the bed",
  electronics_near_bed: "screens by the bed",
  bed_access: "bed access",
  sharp_corners: "sharp corners",
  natural_light: "daylight",
  artificial_light: "lamps",
  plants: "plants",
  elements: "balance",
};
