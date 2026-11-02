/**
 * Pre-render link-preview cards: one per score (0-100), one for "no score",
 * and one for the site itself. Shared links point at /og/<score>.png and carry
 * Grandma's headline as the link text, so no image is rendered per request.
 *
 *   bun scripts/og.ts            -> apps/web/public/og/*.png
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { CARD_FONTS, cardSvg, initRenderer, renderPng, type CardData } from "../packages/card/src/index";
import { GRADE } from "../packages/voice/src/lines";

const root = join(import.meta.dir, "..");
const out = join(root, "apps/web/public/og");
mkdirSync(out, { recursive: true });
const require = createRequire(join(root, "packages/card/package.json"));
await initRenderer(readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
const fonts = CARD_FONTS.map((f) => new Uint8Array(readFileSync(join(root, "packages/card/fonts", f))));

const grade = (n: number) =>
  GRADE[n < 30 ? "oh_no" : n < 50 ? "worrying" : n < 65 ? "fine" : n < 80 ? "acceptable" : n < 92 ? "lovely" : "id_sleep_here"].label;

const base: Omit<CardData, "score" | "grade" | "headline"> = {
  kind: "room",
  pillars: { command: null, flow: null, rest: null, light: null, balance: null },
  chores: [],
};

const jobs: [string, CardData][] = [];
for (let n = 0; n <= 100; n++) jobs.push([`${n}`, { ...base, score: n, grade: grade(n), headline: "" }]);
jobs.push(["unknown", { ...base, score: null, grade: "She has questions.", headline: "" }]);
jobs.push([
  "site",
  {
    ...base,
    score: null,
    grade: "Show her.",
    headline: "Take a photo of your room. Grandma Wei will tell you, lovingly, what's wrong with it.",
  },
]);

const t = performance.now();
for (const [name, data] of jobs) writeFileSync(join(out, `${name}.png`), await renderPng(cardSvg(data, "og"), fonts));
console.log(`og: ${jobs.length} cards in ${Math.round(performance.now() - t)}ms -> ${out}`);
