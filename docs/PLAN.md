# Grandma Wei: the plan

> Take a photo of your room. Grandma Wei reads its feng shui, scores it, and tells you,
> lovingly but without mercy, what's wrong and how to fix it.

This is the proposal to approve before building. It covers what I learned from prior art,
the product and personality calls I'm making, the architecture, and the order of work.

---

## 1. What prior art taught us

I read through the open-source room and feng shui analyzers worth learning from:

| Project | Approach | What to take | What to avoid |
| --- | --- | --- | --- |
| `muhammad-wei/fengshui-ai` | YOLO-World detection, then 10 rules in **deterministic Python geometry**, then an LLM only *narrates* the verdicts | **Rules decide, the model narrates.** Hallucinated geometry never reaches the score. | Pixel-geometry heuristics (bbox IoU as "facing") are noisy on real phone photos. |
| `RomanSlack/fengshui.ai` | YOLOv11 + Gemini, score 1–10, hover tooltips on objects | Pinning advice onto the object it's about is the best UX idea in the space. | The score is whatever the LLM says, so it jitters between identical photos. |
| `ohistudio/fengshui-master` (Snap Specs lens) | Chi score /100, "Chi Plan" checklist, chi-flow particles that congest at blockages, best-score history | **Particles that pool at clutter and clear when you fix it** is the mesmerizing mechanic. The retake-and-climb loop is the right loop. | AR-only. |
| `arif124713/MIndspace` | Vision model returns a structured manifest, a second model plans, re-analysis on change | Split "observe" from "judge". Environmental-psychology grounding makes advice credible. | Five questionnaires before a result kills the joke. |
| Devpost "FSFS" | "is your room lowk evil?" | Tone proves the audience wants a verdict, not a consultation. | |

**The big lesson:** every one of them lets a model invent the score. That breaks the core loop:
if you move nothing and retake the photo, the score must not change, and if you move the bed out
of the coffin position, it must go up for that reason, visibly. So the score has to come from a
deterministic rules engine over a structured description of the room.

---

## 2. Product decisions

### She is the product
There is no "AI feng shui analyzer" chrome. You walk into Grandma Wei's kitchen. She reads your
room. Every string on screen is either her talking or a quiet label. No "Upload image" button:
the button says **"Show Grandma"**.

### Her personality (the voice bible)
- **Warm, dry, specific, always right.** She has seen a thousand bedrooms. She's not angry, she's
  *concerned*. "I'm not upset. I'm just going to sit here until you move the bed."
- **Her humor is about your room, never about her culture.** No accent writing, no fortune-cookie
  aphorisms, no "ancient Chinese secret", no chopstick fonts, no gongs. She speaks the way your
  sharpest relative speaks. She'll use a real term (*qi*, *sha qi*, the commanding position) and
  explain it in one plain clause, the way an expert does.
- **She's on your side.** Every roast ends in a fix you can do. Low scores get more tenderness,
  not more cruelty. If a photo shows a kid's room, a hospital bed, or a small rented space, she
  softens and works with what you have ("You rent. Fine. We don't move walls, we move you.").
- **Verdict lines are the screenshot.** Each reading produces one headline line built for sharing:
  *"Your bed is in the coffin position. I'm not angry. I'm worried."*

The voice is enforced by a system prompt plus a tested list of banned patterns (accent spellings,
stereotype tropes, insults about the person rather than the room). A unit-test corpus of
generated lines is linted against it in CI.

### The advice is real
Rules come from form-school feng shui that also has a practical reason behind it, so every fix
is doable and defensible. Each rule carries both "what Grandma says" and "why it actually helps".

| Rule | Feng shui | Why it actually helps |
| --- | --- | --- |
| Commanding position (bed, desk) | Facing the door, diagonally, not in line with it | Prospect-refuge: you rest better when you can see the entry without being exposed to it |
| Coffin position | Feet pointing straight out the door | Same, plus light and noise from the hall |
| Solid headboard, solid wall | Support behind you | Stability, fewer drafts than a window wall |
| Bed under a window | Qi escapes | Drafts, light, noise |
| Mirror facing the bed | Restless energy bounces back | Movement in peripheral vision at night |
| Clutter, especially under the bed | Stagnant qi | Dust, visual load, harder cleaning |
| Clear path from the door, door opens fully | Qi enters freely | Circulation, safety at night |
| Sharp corners aimed at the bed or desk ("poison arrows") | Cutting qi | Literally bumping into them |
| Back to the door at a desk | No support | Startle response, focus |
| Light and air | Yang energy | Daylight regulates sleep |
| Living plants (not dead ones) | Wood element, growth | Mood, and she will notice the dead one |
| Five elements balance | Wood, fire, earth, metal, water via color and material | Rooms feel calmer with material variety |
| Electronics at the bed | Overactive energy | Sleep hygiene |

**What we deliberately don't do:** compass-direction schools (Flying Stars, Eight Mansions) and
birth-year *kua* numbers. A photo can't tell where north is, and pretending it can would make the
advice fake. Grandma says so herself if asked.

**Honest uncertainty is a mechanic.** If the door isn't visible, the door rules are marked
*unseen* and left out of the score rather than guessed. Grandma asks for the angle she needs:
*"I can't see your door. Stand in the corner and show me again."*

### The scorecard
- **One big number, 0–100**, stamped in a vermilion seal, with a one-word grade from Grandma
  (*Hopeless, Worrying, Fine, Acceptable, Lovely, I'd sleep here*).
- **Five strokes**, one per pillar, drawn as ink-brush bars: **Command, Flow, Rest, Light, Balance**.
- **The headline verdict** in her hand.
- **Three chores**, each with effort (*2 min, 20 min, a weekend*) and the points it's worth.
- Built to be screenshot-legible at phone size, and exported as a 1080×1350 post and a
  1080×1920 story image.

### The before/after loop (the game)
1. **The Reading.** Your photo lands on her table. A loupe drifts over it; she pins handwritten
   notes onto the actual objects. Then **qi flows**: ink particles enter at the door, drift
   through the room, pool at clutter, scatter off sharp corners, and rush out a window across
   from the door. The seal stamps down with the score.
2. **Chores.** The fixes become a checklist, ordered by points per effort.
3. **Show her again.** Retake from the same spot. The engine diffs the two scenes ("you moved the
   bed"), the score rolls up like an odometer, the qi now flows clean through the spot that used
   to pool, and Grandma's face changes.
4. **The fridge.** Achievements are magnets on her fridge: *Out of the Coffin*, *Mirror Mirror
   Not On The Bed*, *Plant Parent*, *Clean Under There*, *Commanding Officer*. Your before/after
   wipe slider lives here too, on your device only.

### Privacy
- The photo is resized and **re-encoded in the browser**, which strips EXIF (including GPS), before
  it leaves the device.
- The server analyzes it in memory and **never writes it anywhere**: no storage, no logs of request
  bodies. The model is told to ignore people and personal items like documents and screens.
- **Share links contain only the scorecard** (score, strokes, verdict, chores), never the photo,
  behind a random unguessable ID, deletable with a token only your browser holds.
- Before/after photos stay in your browser's local storage. Clear them any time from the fridge.
- A plain-language privacy page states exactly where the photo goes (our server, then the model
  provider's API) and nothing more.

---

## 3. Visual direction

Warm, editorial, hand-made. Think Anthropic's ivory-and-ink calm and T3's plain-spoken confidence,
set in Grandma's kitchen at night.

- **Palette:** rice paper `#F3EDE2`, ink `#1E1A16`, seal vermilion `#C23A22`, jade `#2E6A58`,
  tea brass `#B4873A`, and a night-kitchen dark mode in lacquer `#14110F`.
- **Type:** *Newsreader* for display and her printed words, *Geist Mono* for quiet labels and
  numbers (the dev-tool honesty), and a hand-lettered face for her sticky notes.
- **Texture, not gradients:** paper grain, ink bleed on the seal, real brush-stroke SVG bars.
  No glassmorphism, no purple gradients, no stock component-library look.
- **Grandma herself:** original ink-line illustration. Reading glasses on a beaded chain,
  cardigan, a mug of tea. Six expressions (unimpressed, concerned, thinking, surprised, proud,
  delighted). No costume, no caricature.
- **Motion with weight:** paper slides, the stamp lands with a little ink splash, numbers roll.
  Everything respects `prefers-reduced-motion`.

A clickable concept of the scorecard is in `docs/design/scorecard-concept.html`.

---

## 4. Architecture

Rust where it earns its place; nothing exotic for its own sake.

```
 browser (Vite + React 19 + TypeScript, built with Bun)
 ├─ capture: resize to 1568px, re-encode JPEG (EXIF gone)
 ├─ qi.wasm  ← Rust rules engine + qi flow field (same code as the server)
 ├─ WebGL2 shader: ink particles advected along the flow field
 └─ IndexedDB: your photos and history, local only
        │  POST /api/read (image)            ▲ stream: notes, verdict
        ▼                                    │
 Cloudflare Pages Functions (TypeScript, Hono)
 ├─ 1. Claude vision → Scene JSON (strict schema: objects, rough floor
 │     placement, door/window relations, clutter, confidence per fact)
 ├─ 2. qi.wasm scores the scene → verdicts + score (deterministic)
 ├─ 3. Claude (fast model) writes Grandma's lines FROM the verdicts,
 │     streamed while the reading animation plays
 ├─ /api/share → D1 row: scorecard only, never the photo
 └─ /og/:id   → share image rendered at the edge (Satori + resvg)
```

**Why Rust for `qi`:** it's the one piece that must be deterministic, identical on client and server,
heavily unit-tested, and fast enough to recompute a flow field every frame while you drag
furniture in the floor-plan view. Rust compiled to WebAssembly does all four.

**Why not Zig, Gleam, Elixir, Haskell here:** nothing in this app needs a BEAM cluster or a
C-replacement, and adding a language with no job would make the repo worse.

**Why two model calls:** observing and judging are different jobs. Scene extraction uses
discrete enums (e.g. bed-to-door relation: `in_line | diagonal | side | unseen`) rather than
coordinates, so perception noise doesn't jitter the score. The voice call never sees the photo
and can't change the score.

**Monorepo (Bun workspaces):**
```
apps/web          the site
functions/        Pages Functions (API, share, OG)
crates/qi         Rust rules engine + flow field → wasm
packages/schema   Scene schema (Zod) → JSON Schema for the model
packages/voice    system prompt, line bank, banned-pattern linter
fixtures/         sample rooms with expected scene + score (no API key needed)
```

**Demo mode:** with no API key, the site reads from `fixtures/` so anyone can play the full loop,
and CI tests the real pipeline end to end with zero cost.

---

## 5. Testing and delivery

- `cargo test` for every rule, the scorer, the diff, and flow-field invariants (property tests:
  removing clutter never lowers Flow; moving out of the coffin position always raises Command).
- `bun test` for schema, prompt assembly, voice linter, API handlers.
- Playwright (Chromium only, to stay light) drives the whole loop in demo mode and takes
  screenshots of every screen for visual review.
- GitHub Actions: test on every PR, deploy to `grandma-wei.pages.dev` on merge to `main`.
- Full SEO: semantic HTML, OpenGraph and Twitter cards per share link, `robots.txt`, `sitemap.xml`.

## 6. Order of work (one PR each)

1. Plan and design concept (this PR).
2. Monorepo scaffold, CI, scene schema, fixtures.
3. `qi` rules engine in Rust with tests, wasm build.
4. API: vision extraction, scoring, streamed voice, privacy hardening, demo mode.
5. The Reading: capture flow, loupe, pinned notes, qi particles, the stamp.
6. Scorecard, share links, OG and story images.
7. Retake loop, scene diff, fridge, local history, before/after slider.
8. Grandma's illustration set, sound (optional, off by default), polish, accessibility.
9. SEO, README, deploy.

## 7. What I need from you

- **An Anthropic API key** (set as a Cloudflare secret) and **a Cloudflare API token** (as a GitHub
  Actions secret) for the live site. Everything before deploy works without them in demo mode.
- **A go-ahead on this plan.** Anything you'd change about her voice, the five pillars, or the
  look is cheapest to change now.
