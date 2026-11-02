/**
 * The scorecard, as an SVG string. One template, three formats:
 *   post  1080×1350  (feeds)
 *   story 1080×1920  (stories, phone wallpaper energy)
 *   og    1200×630   (link previews)
 *
 * Text is wrapped with real font metrics (metrics.ts), so what we measure
 * is what the renderer draws. Fonts are referenced by plain family names
 * (GW Serif, GW Mono, GW Hand) that only exist in our card font files.
 */

import { METRICS } from "./metrics";
import { SEAL_ADVANCE, SEAL_ASCENT, SEAL_PATH, SEAL_UPM } from "./seal";

export type CardFormat = "post" | "story" | "og";

export interface CardData {
  score: number | null;
  grade: string | null;
  headline: string;
  kind: string;
  pillars: Record<"command" | "flow" | "rest" | "light" | "balance", number | null>;
  chores: { text: string; points: number; later: boolean }[];
  magnets?: { name: string }[];
  delta?: number | null;
  sample?: string | null;
}

export const SIZES: Record<CardFormat, { w: number; h: number }> = {
  post: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
  og: { w: 1200, h: 630 },
};

const C = {
  paper: "#F4F2ED",
  paper2: "#EAE8E2",
  ink: "#1C1B19",
  soft: "#57554F",
  muted: "#8A8780",
  seal: "#B3272D",
  jade: "#2E6A58",
  brass: "#4F6B8A",
  line: "#D7D4CC",
};

const PILLARS = [
  ["command", "Position", C.seal],
  ["flow", "Space", C.ink],
  ["rest", "Sleep", C.ink],
  ["light", "Light", C.jade],
  ["balance", "Balance", C.brass],
] as const;

type Face = keyof typeof METRICS;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function measure(text: string, face: Face, size: number, tracking = 0): number {
  const m = METRICS[face]!;
  let w = 0;
  for (const ch of text) w += m.w[ch] ?? m.fallback;
  return w * size + tracking * Math.max(0, [...text].length - 1);
}

/** Greedy word wrap with real metrics. Adds an ellipsis if it runs out of lines. */
export function wrap(text: string, face: Face, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (measure(next, face, size) <= maxWidth || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1]!;
  while (last.length > 1 && measure(`${last}…`, face, size) > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = `${last.replace(/[,.;:]$/, "")}…`;
  return kept;
}

const FONT: Record<Face, string> = {
  "Newsreader-Light": `font-family="GW Serif" font-weight="300"`,
  "Newsreader-Regular": `font-family="GW Serif" font-weight="400"`,
  "Newsreader-Medium": `font-family="GW Serif" font-weight="500"`,
  "Newsreader-Italic": `font-family="GW Serif" font-weight="400" font-style="italic"`,
  "GeistMono-Regular": `font-family="GW Mono" font-weight="400"`,
  "GeistMono-Medium": `font-family="GW Mono" font-weight="500"`,
  "Kalam-Bold": `font-family="GW Hand" font-weight="700"`,
};

function text(x: number, y: number, s: string, face: Face, size: number, fill: string, extra = ""): string {
  return `<text x="${x}" y="${y}" ${FONT[face]} font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;
}

function mono(x: number, y: number, s: string, size: number, fill = C.muted, anchor = "start"): string {
  return text(x, y, s, "GeistMono-Regular", size * 1.1, fill, `text-anchor="${anchor}"`);
}

function seal(x: number, y: number, size: number, rotate = 8): string {
  const inner = size * 0.74;
  const scale = (inner / SEAL_UPM) * 0.86;
  const gx = x + (size - SEAL_ADVANCE * scale) / 2;
  const gy = y + (size - SEAL_ASCENT * scale) / 2 + size * 0.02;
  return `<g transform="rotate(${rotate} ${x + size / 2} ${y + size / 2})" filter="url(#bleed)">
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.07}" fill="${C.seal}"/>
    <rect x="${x + size * 0.07}" y="${y + size * 0.07}" width="${size * 0.86}" height="${size * 0.86}" rx="${size * 0.03}" fill="none" stroke="${C.paper}" stroke-width="${size * 0.025}"/>
    <path transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${scale.toFixed(5)})" d="${SEAL_PATH}" fill="${C.paper}"/>
  </g>`;
}

const BRUSH =
  "M2 9 C 20 4, 60 12, 100 7 S 180 4, 240 8 S 330 12, 398 6 L 398 12 C 340 16, 280 13, 220 15 S 90 17, 40 14 S 6 15, 2 13 Z";

function pillarRows(d: CardData, x: number, y: number, width: number, rowH: number, labelSize: number): string {
  const labelW = labelSize * 8.2;
  const barX = x + labelW;
  const barW = width - labelW - labelSize * 3.4;
  return PILLARS.map(([key, label, color], i) => {
    const v = d.pillars[key];
    const ry = y + i * rowH;
    const frac = v === null ? 0 : Math.max(0.02, v / 100);
    const id = `clip-${key}`;
    return `${mono(x, ry + labelSize * 0.35, label, labelSize, C.soft)}
      <line x1="${barX}" y1="${ry}" x2="${barX + barW}" y2="${ry}" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 6"/>
      <clipPath id="${id}"><rect x="${barX}" y="${ry - rowH}" width="${(barW * frac).toFixed(1)}" height="${rowH * 2}"/></clipPath>
      <g clip-path="url(#${id})"><path transform="translate(${barX} ${ry - rowH * 0.17}) scale(${(barW / 400).toFixed(4)} ${(rowH * 0.034).toFixed(4)})" d="${BRUSH}" fill="${color}" filter="url(#bleed)"/></g>
      ${text(x + width, ry + labelSize * 0.38, v === null ? "?" : String(v), "GeistMono-Medium", labelSize * 1.08, C.ink, `text-anchor="end"`)}`;
  }).join("\n");
}

function defs(w: number, h: number): string {
  return `<defs>
    <filter id="bleed" x="-5%" y="-20%" width="110%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="3"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.42  0 0 0 0 0.42  0 0 0 0.10 0"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.paper}"/>
  ${grainOn ? `<rect width="${w}" height="${h}" filter="url(#grain)"/>` : paperEdges(w, h)}`;
}

let grainOn = false;

/** A cheap stand-in for grain: a faint vignette of warmer paper at the edges. */
function paperEdges(w: number, h: number): string {
  return `<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="70%" stop-color="${C.paper}" stop-opacity="0"/><stop offset="100%" stop-color="#DEDBD3" stop-opacity="0.9"/></radialGradient>
  <rect width="${w}" height="${h}" fill="url(#vig)"/>`;
}

function roomLabel(kind: string): string {
  return kind.replace(/_/g, " ");
}

function scoreBlock(d: CardData, x: number, baseline: number, size: number): { svg: string; width: number } {
  const s = d.score === null ? "?" : String(d.score);
  const tracking = -size * 0.04;
  const w = measure(s, "Newsreader-Light", size, tracking);
  const svg = `${text(x, baseline, s, "Newsreader-Light", size, C.ink, `letter-spacing="${tracking.toFixed(1)}"`)}
    ${text(x + w + size * 0.04, baseline, "/100", "GeistMono-Regular", size * 0.1, C.muted)}`;
  return { svg, width: w + size * 0.32 };
}

function choreRows(d: CardData, x: number, y: number, width: number, size: number, max: number, maxLines = 2): { svg: string; height: number } {
  let cy = y;
  const parts: string[] = [];
  const pts = (c: CardData["chores"][number]) => (c.later ? `+${c.points} later` : `+${c.points}`);
  for (const c of d.chores.slice(0, max)) {
    const ptsW = measure(pts(c), "GeistMono-Medium", size * 0.82) + size;
    const lines = wrap(c.text, "Newsreader-Regular", size, width - size * 1.6 - ptsW, maxLines);
    parts.push(`<line x1="${x}" y1="${cy}" x2="${x + width}" y2="${cy}" stroke="${C.line}" stroke-width="1.5"/>`);
    const top = cy + size * 1.25;
    parts.push(`<rect x="${x}" y="${top - size * 0.78}" width="${size * 0.7}" height="${size * 0.7}" rx="3" fill="none" stroke="${C.ink}" stroke-width="2.2"/>`);
    lines.forEach((l, i) => parts.push(text(x + size * 1.3, top + i * size * 1.22, l, "Newsreader-Regular", size, C.ink)));
    parts.push(text(x + width, top, pts(c), "GeistMono-Medium", size * 0.82, c.later ? C.muted : C.jade, `text-anchor="end"`));
    cy = top + (lines.length - 1) * size * 1.22 + size * 0.75;
  }
  if (parts.length) parts.push(`<line x1="${x}" y1="${cy}" x2="${x + width}" y2="${cy}" stroke="${C.line}" stroke-width="1.5"/>`);
  return { svg: parts.join("\n"), height: cy - y };
}

function tall(d: CardData, format: "post" | "story", host: string): string {
  const { w, h } = SIZES[format];
  const story = format === "story";
  const pad = 84;
  const top = story ? 210 : 104;
  const inner = w - pad * 2;
  const out: string[] = [defs(w, h)];

  // Header.
  out.push(text(pad, top, "Grandma", "Newsreader-Medium", 46, C.ink));
  out.push(text(pad + measure("Grandma ", "Newsreader-Medium", 46), top, "Wei", "Newsreader-Italic", 46, C.ink));
  out.push(mono(w - pad, top, d.sample ? `Practice room · ${roomLabel(d.kind)}` : `Her reading · ${roomLabel(d.kind)}`, 20, C.muted, "end"));
  out.push(`<line x1="${pad}" y1="${top + 30}" x2="${w - pad}" y2="${top + 30}" stroke="${C.line}" stroke-width="2"/>`);

  // Score, grade, seal.
  const scoreSize = story ? 330 : 290;
  const base = top + 30 + scoreSize * 0.86;
  const sb = scoreBlock(d, pad - 10, base, scoreSize);
  out.push(sb.svg);
  const gx = pad + sb.width + 6;
  out.push(mono(gx, base - scoreSize * 0.38, "Her grade", 20));
  // The grade sits between the number and the seal; shrink it rather than collide.
  const gradeText = d.grade ?? "No grade.";
  const room = w - pad - 200 - gx;
  const gs = Math.min(60, (60 * room) / Math.max(1, measure(gradeText, "Newsreader-Italic", 60)));
  const gradeLines = gs >= 40 ? [gradeText] : wrap(gradeText, "Newsreader-Italic", 44, room, 2);
  const gsz = gs >= 40 ? gs : 44;
  gradeLines.forEach((l, i) => out.push(text(gx, base - scoreSize * 0.18 + i * gsz * 1.1, l, "Newsreader-Italic", gsz, C.ink)));
  out.push(seal(w - pad - 176, top + 70, 168));
  if (d.delta) {
    out.push(mono(gx, base + 6, `${d.delta > 0 ? "up" : "down"} ${Math.abs(d.delta)} since last time`, 20, d.delta > 0 ? C.jade : C.seal));
  }

  // Headline.
  let y = base + (story ? 110 : 84);
  const hs = story ? 58 : 50;
  const lines = wrap(d.headline, "Newsreader-Regular", hs, inner - 34, story ? 5 : 4);
  lines.forEach((l, i) => out.push(text(pad + 34, y + i * hs * 1.2, l, "Newsreader-Regular", hs, C.ink)));
  const blockH = (lines.length - 1) * hs * 1.2 + hs * 0.35;
  out.push(`<rect x="${pad}" y="${y - hs * 0.9}" width="4" height="${blockH + hs * 0.9 + 52}" fill="${C.seal}"/>`);
  out.push(text(pad + 34, y + blockH + 40, "Grandma Wei", "Newsreader-Italic", 24, C.soft));
  y += blockH + (story ? 140 : 110);

  // Pillars.
  const rowH = story ? 58 : 48;
  out.push(pillarRows(d, pad, y, inner, rowH, story ? 22 : 20));
  y += rowH * 5 + (story ? 56 : 34);

  // Chores, as many as fit above the footer.
  const footerY = h - (story ? 150 : 72);
  const cs = story ? 32 : 28;
  out.push(text(pad, y, "Her chores", "Newsreader-Medium", cs + 2, C.ink));
  if (d.chores.length) {
    let max = Math.min(3, d.chores.length);
    const ml = story ? 3 : 2;
    let rows = choreRows(d, pad, y + 26, inner, cs, max, ml);
    while (max > 1 && y + 26 + rows.height > footerY - 50) rows = choreRows(d, pad, y + 26, inner, cs, --max, ml);
    out.push(rows.svg);
  } else {
    out.push(text(pad, y + cs * 2, "None. She checked twice.", "Newsreader-Italic", cs, C.soft));
  }

  // Footer.
  if (story) {
    out.push(`<line x1="${pad}" y1="${footerY - 40}" x2="${w - pad}" y2="${footerY - 40}" stroke="${C.line}" stroke-width="2"/>`);
    out.push(text(pad, footerY + 20, "Show her your room.", "Newsreader-Italic", 44, C.ink));
    out.push(mono(pad, footerY + 70, host, 22, C.seal));
  } else {
    out.push(mono(pad, footerY, host, 20, C.seal));
    out.push(mono(w - pad, footerY, "Show her your room →", 20, C.muted, "end"));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out.join("\n")}</svg>`;
}

function wide(d: CardData, host: string): string {
  const { w, h } = SIZES.og;
  const pad = 64;
  const out: string[] = [defs(w, h)];
  out.push(text(pad, 92, "Grandma", "Newsreader-Medium", 38, C.ink));
  out.push(text(pad + measure("Grandma ", "Newsreader-Medium", 38), 92, "Wei", "Newsreader-Italic", 38, C.ink));
  const sb = scoreBlock(d, pad - 8, 380, 270);
  out.push(sb.svg);
  out.push(text(pad, 470, d.grade ?? "", "Newsreader-Italic", 54, C.ink));
  out.push(seal(388, 104, 104, 9));
  const col = 560;
  out.push(`<rect x="${col - 34}" y="110" width="4" height="330" fill="${C.seal}"/>`);
  const lines = wrap(d.headline || "She read this room. She has notes.", "Newsreader-Regular", 44, w - col - pad, 5);
  const startY = 110 + (330 - lines.length * 54) / 2 + 36;
  lines.forEach((l, i) => out.push(text(col, startY + i * 54, l, "Newsreader-Regular", 44, C.ink)));
  out.push(text(col, startY + lines.length * 54 + 16, "Grandma Wei", "Newsreader-Italic", 22, C.soft));
  out.push(`<line x1="${pad}" y1="${h - 96}" x2="${w - pad}" y2="${h - 96}" stroke="${C.line}" stroke-width="2"/>`);
  out.push(mono(pad, h - 52, host, 20, C.seal));
  out.push(mono(w - pad, h - 52, d.kind === "room" ? "show her your room →" : `${roomLabel(d.kind)} · show her your room →`, 20, C.muted, "end"));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out.join("\n")}</svg>`;
}

export interface CardOptions {
  /** Paper grain. Lovely, but slow to rasterize: off for build-time previews. */
  grain?: boolean;
}

export function cardSvg(d: CardData, format: CardFormat, host = "grandma-wei.pages.dev", opts: CardOptions = {}): string {
  grainOn = opts.grain ?? false;
  return format === "og" ? wide(d, host) : tall(d, format, host);
}
