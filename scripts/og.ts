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

// Brand assets: the seal as favicon and app icons.
import { SEAL_ADVANCE, SEAL_ASCENT, SEAL_PATH, SEAL_UPM } from "../packages/card/src/seal";
function sealSvg(size: number, bg: string | null): string {
  const pad = size * 0.08;
  const box = size - pad * 2;
  const scale = (box * 0.72) / SEAL_UPM;
  const gx = pad + (box - SEAL_ADVANCE * scale) / 2;
  const gy = pad + (box - SEAL_ASCENT * scale) / 2 + box * 0.02;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ""
  }<rect x="${pad}" y="${pad}" width="${box}" height="${box}" rx="${box * 0.12}" fill="#C23A22"/><rect x="${pad + box * 0.07}" y="${pad + box * 0.07}" width="${box * 0.86}" height="${box * 0.86}" rx="${box * 0.05}" fill="none" stroke="#F3EDE2" stroke-width="${box * 0.03}"/><path transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale.toFixed(5)})" d="${SEAL_PATH}" fill="#F3EDE2"/></svg>`;
}
const pub = join(root, "apps/web/public");
writeFileSync(join(pub, "favicon.svg"), sealSvg(64, null));
writeFileSync(join(pub, "apple-touch-icon.png"), await renderPng(sealSvg(180, "#171310"), fonts));
writeFileSync(join(pub, "icon-192.png"), await renderPng(sealSvg(192, "#171310"), fonts));
writeFileSync(join(pub, "icon-512.png"), await renderPng(sealSvg(512, "#171310"), fonts));

const t = performance.now();
for (const [name, data] of jobs) writeFileSync(join(out, `${name}.png`), await renderPng(cardSvg(data, "og"), fonts));
console.log(`og: ${jobs.length} cards in ${Math.round(performance.now() - t)}ms -> ${out}`);
