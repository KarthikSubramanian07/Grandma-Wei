/**
 * Grandma Wei's public pages as Markdown: the one source for the pre-rendered
 * HTML (what crawlers and no-JavaScript visitors see), the text/markdown
 * responses agents get, and llms.txt. The rules page is generated from the
 * same rule names and reasons the app uses, so it can't drift.
 */

import { PILLAR_HINT, PILLAR_LABEL, PILLARS, type Pillar, type RuleId } from "@gw/schema/src/reading";
import { RULE_NAME, WHY } from "@gw/voice";

export const ORIGIN = "https://grandma-wei.pages.dev";
export const REPO = "https://github.com/KarthikSubramanian07/Grandma-Wei";

export interface Page {
  path: string;
  title: string;
  description: string;
  markdown: string;
}

const RULES: Record<Pillar, RuleId[]> = {
  command: ["bed_door", "headboard", "headboard_solid", "desk"],
  flow: ["clutter", "door_path", "door_opens_fully", "under_bed", "door_window_aligned"],
  rest: ["mirror_facing_bed", "over_bed", "electronics_near_bed", "bed_access", "sharp_corners"],
  light: ["natural_light", "artificial_light"],
  balance: ["plants", "elements"],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const home: Page = {
  path: "/",
  title: "Grandma Wei · AI feng shui reading for your room, from one photo",
  description:
    "Take a photo of your room. Grandma Wei reads its feng shui, gives it a score out of 100, and tells you, lovingly but without mercy, what to fix.",
  markdown: `# Show Grandma your room.

Take a photo. She'll score its feng shui and tell you exactly what to fix. Lovingly. Without mercy.

Grandma Wei is a free feng shui room reader. You show her one photo of your bedroom or home office, and she gives the room a score out of 100, tapes notes onto the furniture she has opinions about, and hands you a short list of chores, each with the exact number of points it's worth. Move the bed, clear the floor, take another photo, and watch the score climb.

## How it works

1. **Show her.** One photo of your bedroom or office, taken from a corner, with the door in view if you can.
2. **Get your score.** A number out of 100, her one-word grade, a verdict, notes on the photo, and your top chores.
3. **Fix it, show her again.** She compares the new photo with the old one, tells you what improved, and puts magnets on your fridge.

## What she checks

${PILLARS.map((p) => `- **${PILLAR_LABEL[p]}.** ${PILLAR_HINT[p]}`).join("\n")}

The score comes from fixed rules, not from a mood: the same room always gets the same number. Read [how she judges](${ORIGIN}/how) for every rule and the practical reason behind it.

## Things she says

> Your bed is in the coffin position. I'm not angry. I'm worried.

> Not one living thing in here. Except the dust. The dust is thriving.

## Your photo stays yours

Your phone shrinks and re-encodes the photo before it's sent, which removes location data. It's read once and never stored. Your history stays on your device. [More on privacy](${ORIGIN}/privacy).

No photo handy? Try a practice room: [The Traveler](${ORIGIN}/practice/traveler), [The Attic](${ORIGIN}/practice/attic), or [The Teak Room](${ORIGIN}/practice/teak).

[About Grandma Wei](${ORIGIN}/about) · [Contact](${ORIGIN}/contact) · [Source code](${REPO})
`,
};

const how: Page = {
  path: "/how",
  title: "How Grandma Wei judges your room · Feng shui rules, explained",
  description:
    "The five things Grandma Wei checks, the eighteen feng shui rules behind her score, and the practical reason each rule helps.",
  markdown: `# How she judges

Grandma Wei uses the practical side of feng shui: the parts that also make sense to an architect, a sleep doctor, or anyone who has walked into a dark room and stubbed a toe. Five things, eighteen rules, one score out of 100.

${PILLARS.map(
  (p) => `## ${PILLAR_LABEL[p]}

${PILLAR_HINT[p]}

${RULES[p].map((r) => `- **${cap(RULE_NAME[r])}.** ${WHY[r]}`).join("\n")}`,
).join("\n\n")}

## A few things she's honest about

- **The score is math, not mood.** The AI only describes what it sees: where the bed is, what's on the floor. A fixed set of rules turns that into the score, so the same room always gets the same number.
- **She won't guess.** If she can't see your door, the door rules are left out, and she asks for a better angle instead of making something up.
- **Some things are deal-breakers.** A bed in the coffin position (feet pointing out the door) caps the room at 49 until you move it. Heavy clutter or a blocked doorway caps it at 59.
- **No compass, no birthdays.** Some schools of feng shui use compass directions and birth years. A photo can't tell which way is north, so she leaves those out rather than pretend.

[Show her your room](${ORIGIN}/)
`,
};

const privacy: Page = {
  path: "/privacy",
  title: "Privacy · Grandma Wei",
  description: "Exactly what happens to the photo of your room: resized on your device, read once, never stored.",
  markdown: `# Your room, your business

Photos of your home are personal. Here is exactly what happens to yours.

1. **Your phone shrinks the photo first.** It's resized and saved as a fresh JPEG in your browser, which removes hidden details like location and camera info, before anything is sent.
2. **Grandma's eyes look at it once.** The photo goes to our server and on to an AI vision model (the open Qwen model, run by Groq), which describes the room as a list of facts (where the bed is, whether the floor is clear). The AI is told to ignore people and anything private, like papers or screens.
3. **Then it's forgotten.** Our server never saves your photo and never logs it. Groq's handling of API data is described in its [privacy policy](https://groq.com/privacy-policy).
4. **Your history stays with you.** Readings, photos and magnets on the fridge are stored in your browser only. Clear them any time from the fridge.
5. **Sharing is text only, and undoable.** A shared link shows the scorecard (score, her words, the chores), never the photo. Deleting the reading from your fridge deletes the link too, and links expire on their own after a year.
6. **No ads, no trackers, no accounts.** We count how many readings happen per hour to stop abuse, using a scrambled code, never your IP address.

Grandma Wei is open source. You can read every line of how this works on [GitHub](${REPO}). Questions: see [contact](${ORIGIN}/contact).
`,
};

const about: Page = {
  path: "/about",
  title: "About Grandma Wei · A feng shui grandmother for your room",
  description: "What Grandma Wei is, who made it, how it works, and what she will and won't do.",
  markdown: `# About Grandma Wei

Everyone has a grandmother who walks into your place and immediately starts moving things. Grandma Wei is that grandmother, for any room you can photograph. She's warm, opinionated, a little disappointed in you, and always right. Being judged by her should feel like being cared for.

## What it is

Grandma Wei is a free web app that reads the feng shui of a room from one photo. She scores it out of 100, explains what's wrong in plain words, and gives you chores that actually help: where to put the bed, what to clear, where the light should come from. You can retake the photo after you've moved things and watch the score go up.

## How it works

- An AI vision model (the open Qwen model, run by Groq; the code also supports Anthropic's Claude) looks at the photo and describes the room as fixed facts: whether the bed is in line with the door, how cluttered the floor is, what's on the walls.
- A rules engine written in Rust turns those facts into the score. It runs the same way every time, so the same room always gets the same number, and every chore's points are computed, not guessed.
- Grandma's lines come from a hand-written bank, sometimes personalized by the AI, and every line passes a linter that rejects stereotypes, accents, insults and invented numbers.

## Respect

Feng shui comes from a long Chinese tradition. The humor here is about your room and Grandma's opinions, never about her culture: no accents, no fortune cookies, no "ancient secrets". She uses the practical side of the tradition, and she says plainly what a photo can't tell her.

## Who made it

Grandma Wei was made by Karthik Subramanian and is open source under the MIT license. The code, the rules and the line bank are all on [GitHub](${REPO}). It isn't affiliated with any real grandmother, though she has heard about this.

[Contact](${ORIGIN}/contact) · [Privacy](${ORIGIN}/privacy) · [How she judges](${ORIGIN}/how)
`,
};

const contact: Page = {
  path: "/contact",
  title: "Contact · Grandma Wei",
  description: "How to reach the people behind Grandma Wei: questions, bug reports, feedback and security reports.",
  markdown: `# Contact

Grandma Wei is a small open-source project, so the best way to reach the people behind her is on GitHub, where every conversation is public and nothing gets lost.

## Questions, ideas and bug reports

[Open an issue on GitHub](${REPO}/issues). Tell us what you expected, what happened instead, and which device and browser you used. Please don't attach photos of your home to a public issue: describe the room instead, or use a practice room to show the problem.

## Security reports

Found a way to see something you shouldn't, or to make her say something she shouldn't? Please report it privately through [GitHub's security advisories](${REPO}/security/advisories/new) instead of a public issue. We'll reply there.

## Removing a shared link

Shared links can be deleted by the person who made them, from the fridge on the device they shared from. Links also expire on their own after a year. If you need a link taken down and can't reach the person who made it, open an issue with the link and we'll remove it.

## The code

Everything that decides a score, everything Grandma says, and how photos are handled is public in the [source code](${REPO}).
`,
};

export const PAGES: Page[] = [home, how, privacy, about, contact];

export function pageFor(path: string): Page | undefined {
  const clean = path.replace(/\/+$/, "") || "/";
  return PAGES.find((p) => p.path === clean);
}

export const NOT_FOUND_MARKDOWN = `# Not found

There's no page here. Like the floor in some rooms she's seen.

Grandma Wei has these pages:

${PAGES.map((p) => `- [${p.title.split(" · ")[0]}](${ORIGIN}${p.path === "/" ? "/" : p.path})`).join("\n")}

For agents: start with [llms.txt](${ORIGIN}/llms.txt) or the [sitemap](${ORIGIN}/sitemap.xml). Every page above is also available as Markdown by sending \`Accept: text/markdown\` or adding \`.md\` to its path.
`;

/** llms.txt, following https://llmstxt.org: title, summary, details, then link sections. */
export const LLMS_TXT = `# Grandma Wei

> A free web app that reads the feng shui of a room from one photo. It scores the room out of 100 with a deterministic rules engine and lists practical fixes, each with the points it's worth, in the voice of a loving, blunt grandmother.

Grandma Wei uses the practical side of feng shui: bed and desk position relative to the door, clutter and clear paths, sleep calm (mirrors, screens, beams), daylight and lamps, and balance (materials, colors, plants). An AI model describes the photo as fixed facts; a Rust rules engine computes the score, so the same room always gets the same number. She does not use compass directions or birth years. Photos are read once and never stored.

## When to use

- Use Grandma Wei when a person wants their bedroom, home office, dorm or studio checked for feng shui, wants to know whether their bed or desk is in a good spot, or wants a fun, shareable score for their room with concrete fixes.
- Good fits: "Is my bed in the coffin position?", "How should I arrange my bedroom?", "Feng shui my office", "Rate my room", "What should I fix first to sleep better?"
- How to use it: send the person to ${ORIGIN}/ and have them take or choose one photo of the room from a corner, with the door in view. Readings need the person's own photo, taken on their device; there's no account and nothing to install.
- To show how scoring works without a photo, fetch a practice reading as JSON (see API below), or link the person to a practice room.
- Not a fit: compass-based feng shui (Flying Stars, Eight Mansions, kua numbers), professional interior design or construction advice, safety or structural inspections, and photos of rooms the person doesn't have permission to photograph.

## Pages

- [Home](${ORIGIN}/index.md): what Grandma Wei is and how a reading works
- [How she judges](${ORIGIN}/how.md): the five things she checks, all eighteen rules, and the practical reason for each
- [Privacy](${ORIGIN}/privacy.md): what happens to a photo, step by step
- [About](${ORIGIN}/about.md): what it is, who made it, and how it works
- [Contact](${ORIGIN}/contact.md): questions, bug reports and security reports

## API

- [Practice reading, The Traveler](${ORIGIN}/api/sample/traveler): JSON for a sample bedroom (score 49, bed in the coffin position). Also \`attic\` and \`teak\`. The reading is under \`result.reading\` (score, grade, pillars, chores with points) and her words under \`result.voice\`.
- [Health](${ORIGIN}/api/health): JSON status, including whether photo readings are switched on (\`eyes\`).
- Photo readings (\`POST /api/read\`) are rate limited and meant for the site itself; send people to the site instead.

## Optional

- [Source code](${REPO}): the rules engine, Grandma's line bank, and the site, MIT licensed
- [Sitemap](${ORIGIN}/sitemap.xml)
`;
