import { useEffect, useMemo, useRef } from "react";
import type { Layout, Scene, Wall } from "@gw/schema";
import { qi } from "../lib/qi";

const GW = 48;
const GH = 40;
const INK = "30,26,22";
const RED = "194,58,34";

type Piece = Layout["pieces"][number];

interface Props {
  scene: Scene;
  suggestion?: Piece | null;
  showSuggestion?: boolean;
  label?: string;
}

/** Grandma's napkin sketch of the room, with qi flowing through it. */
export function Sketch({ scene, suggestion, showSuggestion = false, label }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([scene.layout, scene.facts.clutter, scene.facts.bed_door, scene.facts.door_window_aligned]);
  const field = useMemo(() => qi.field(scene, GW, GH), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let visible = true;
    let running = true;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let W = 0;
    let H = 0;
    let room = { x: 0, y: 0, w: 0, h: 0 };
    let bg: HTMLCanvasElement | null = null;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      W = Math.max(200, r.width);
      H = Math.max(160, r.height);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const m = Math.max(26, W * 0.07);
      room = { x: m, y: m, w: W - m * 2, h: H - m * 2 };
      bg = drawRoom(scene, W, H, dpr, room, showSuggestion ? suggestion ?? null : null);
    };
    resize();

    // Particles live in room coordinates (0..1).
    const small = W < 520;
    const N = small ? 520 : 900;
    const sources = spawnPoints(scene.layout);
    const ps = Array.from({ length: N }, () => spawn({ x: 0, y: 0, age: 0, life: 0, trail: [] as number[] }, sources, true));

    const sample = (x: number, y: number): [number, number, number, number] => {
      const fx = Math.min(GW - 1.001, Math.max(0, x * GW - 0.5));
      const fy = Math.min(GH - 1.001, Math.max(0, y * GH - 0.5));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const out: [number, number, number, number] = [0, 0, 0, 0];
      for (let c = 0; c < 4; c++) {
        const a = field[(y0 * GW + x0) * 4 + c]!;
        const b = field[(y0 * GW + x0 + 1) * 4 + c]!;
        const d = field[((y0 + 1) * GW + x0) * 4 + c]!;
        const e = field[((y0 + 1) * GW + x0 + 1) * 4 + c]!;
        out[c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
      }
      return out;
    };

    let t = 0;
    const step = () => {
      t++;
      for (const p of ps) {
        const [vx, vy, stag, sha] = sample(p.x, p.y);
        const wob = Math.sin(p.y * 13 + t * 0.02 + p.life) * 0.25;
        let dx = vx + wob * 0.3;
        let dy = vy + Math.cos(p.x * 11 - t * 0.017 + p.life) * 0.08;
        const sp = Math.hypot(dx, dy);
        let speed = 0.0032 * (0.35 + Math.min(1, sp)) * (1 + sha * 1.4);
        if (stag > 0.3) {
          speed *= 0.25;
          dx += Math.sin(t * 0.05 + p.life * 3) * 0.9;
          dy += Math.cos(t * 0.05 + p.life * 3) * 0.9;
        }
        const n = Math.hypot(dx, dy) || 1;
        p.x += (dx / n) * speed;
        p.y += (dy / n) * speed;
        p.age++;
        p.trail.push(p.x, p.y, stag > 0.3 || sha > 0.3 ? 1 : 0);
        if (p.trail.length > 24) p.trail.splice(0, 3);
        if (p.age > p.life || p.x < 0.005 || p.x > 0.995 || p.y < 0.005 || p.y > 0.995 || (sp < 0.01 && stag < 0.3)) spawn(p, sources, false);
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (bg) ctx.drawImage(bg, 0, 0, W, H);
      ctx.lineCap = "round";
      for (const p of ps) {
        const tr = p.trail;
        if (tr.length < 6) continue;
        const life = Math.sin(Math.PI * Math.min(1, p.age / p.life));
        for (let i = 3; i < tr.length; i += 3) {
          const red = tr[i + 2] === 1;
          const a = (i / tr.length) * life * (red ? 0.7 : 0.45);
          ctx.strokeStyle = `rgba(${red ? RED : INK},${a.toFixed(3)})`;
          ctx.lineWidth = red ? 1.6 : 1.1;
          ctx.beginPath();
          ctx.moveTo(room.x + tr[i - 3]! * room.w, room.y + tr[i - 2]! * room.h);
          ctx.lineTo(room.x + tr[i]! * room.w, room.y + tr[i + 1]! * room.h);
          ctx.stroke();
        }
      }
    };

    const loop = () => {
      if (!running) return;
      if (visible) {
        step();
        draw();
      }
      raf = requestAnimationFrame(loop);
    };

    if (reduce) {
      for (let i = 0; i < 240; i++) step();
      draw();
    } else {
      for (let i = 0; i < 60; i++) step();
      loop();
    }

    const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)));
    io.observe(cv);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    ro.observe(cv);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [field, scene, suggestion, showSuggestion]);

  const desc = describe(scene);
  return (
    <figure className="sketch">
      <canvas ref={canvas} role="img" aria-label={`Grandma's sketch of the room: ${desc}`} />
      {label && <figcaption className="mono">{label}</figcaption>}
    </figure>
  );
}

function describe(scene: Scene): string {
  const kinds = scene.layout.pieces.map((p) => p.kind).join(", ");
  return `${kinds || "an empty room"}${scene.layout.door ? ", with the door" : ""}${scene.layout.windows.length ? ` and ${scene.layout.windows.length} window(s)` : ""}`;
}

interface P {
  x: number;
  y: number;
  age: number;
  life: number;
  trail: number[];
}

function wallPoint(wall: Wall, at: number): [number, number] {
  switch (wall) {
    case "far":
      return [at, 0.02];
    case "near":
      return [at, 0.98];
    case "left":
      return [0.02, at];
    case "right":
      return [0.98, at];
  }
}

function spawnPoints(l: Layout): { wall: Wall; at: number; size: number }[] {
  if (l.door) return [{ wall: l.door.wall, at: l.door.at, size: 0.12 }];
  if (l.windows.length) return l.windows.map((w) => ({ wall: w.wall, at: w.at, size: Math.max(0.08, w.size) }));
  return [];
}

function spawn(p: P, sources: ReturnType<typeof spawnPoints>, scatter: boolean): P {
  if (sources.length === 0) {
    p.x = 0.1 + Math.random() * 0.8;
    p.y = 0.1 + Math.random() * 0.8;
  } else {
    const s = sources[Math.floor(Math.random() * sources.length)]!;
    const [x, y] = wallPoint(s.wall, s.at + (Math.random() - 0.5) * s.size);
    p.x = x;
    p.y = y;
  }
  p.life = 140 + Math.random() * 260;
  p.age = scatter ? Math.floor(Math.random() * p.life) : 0;
  p.trail = [];
  return p;
}

/** The static drawing: paper, walls, door, windows, furniture, Grandma's suggestion. */
function drawRoom(
  scene: Scene,
  W: number,
  H: number,
  dpr: number,
  room: { x: number; y: number; w: number; h: number },
  suggestion: Piece | null,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const X = (v: number) => room.x + v * room.w;
  const Y = (v: number) => room.y + v * room.h;
  const ink = "#1E1A16";
  const font = (size: number) => `500 ${size}px "Geist Mono", ui-monospace, monospace`;
  const jitter = (seed: number) => Math.sin(seed * 999.7) * 0.8;

  // Hand-drawn-ish line.
  const line = (x1: number, y1: number, x2: number, y2: number, w = 2.2, color = ink) => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.lineCap = "round";
    g.beginPath();
    const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 18));
    g.moveTo(x1, y1);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      g.lineTo(x1 + (x2 - x1) * t + jitter(i + x1) * 0.6, y1 + (y2 - y1) * t + jitter(i + y1) * 0.6);
    }
    g.stroke();
  };

  const l = scene.layout;
  // Walls, with gaps for the door.
  const gaps: Record<Wall, [number, number][]> = { far: [], near: [], left: [], right: [] };
  if (l.door) gaps[l.door.wall].push([l.door.at - 0.07, l.door.at + 0.07]);
  const wall = (w: Wall) => {
    const segs: [number, number][] = [];
    let cur = 0;
    for (const [a, b] of gaps[w].sort((p, q) => p[0] - q[0])) {
      segs.push([cur, Math.max(cur, a)]);
      cur = b;
    }
    segs.push([cur, 1]);
    for (const [a, b] of segs) {
      if (b - a < 0.005) continue;
      if (w === "far") line(X(a), Y(0), X(b), Y(0), 2.6);
      if (w === "near") line(X(a), Y(1), X(b), Y(1), 2.6);
      if (w === "left") line(X(0), Y(a), X(0), Y(b), 2.6);
      if (w === "right") line(X(1), Y(a), X(1), Y(b), 2.6);
    }
  };
  (["far", "near", "left", "right"] as Wall[]).forEach(wall);

  // Windows: a double jade line.
  for (const win of l.windows) {
    const a = win.at - win.size / 2;
    const b = win.at + win.size / 2;
    const off = 4;
    const color = "#2E6A58";
    if (win.wall === "far" || win.wall === "near") {
      const y = win.wall === "far" ? Y(0) : Y(1);
      line(X(a), y - off, X(b), y - off, 1.8, color);
      line(X(a), y + off, X(b), y + off, 1.8, color);
    } else {
      const x = win.wall === "left" ? X(0) : X(1);
      line(x - off, Y(a), x - off, Y(b), 1.8, color);
      line(x + off, Y(a), x + off, Y(b), 1.8, color);
    }
  }

  // Door swing.
  if (l.door) {
    const d = l.door;
    g.setLineDash([3, 4]);
    g.strokeStyle = ink;
    g.lineWidth = 1.4;
    g.beginPath();
    const r = (d.wall === "far" || d.wall === "near" ? room.w : room.h) * 0.14;
    if (d.wall === "near") g.arc(X(d.at - 0.07), Y(1), r, -Math.PI / 2, 0);
    if (d.wall === "far") g.arc(X(d.at - 0.07), Y(0), r, 0, Math.PI / 2);
    if (d.wall === "left") g.arc(X(0), Y(d.at - 0.07), r, 0, Math.PI / 2);
    if (d.wall === "right") g.arc(X(1), Y(d.at - 0.07), r, Math.PI / 2, Math.PI);
    g.stroke();
    g.setLineDash([]);
  }

  // Labels for door and windows.
  g.fillStyle = "#8C8173";
  g.font = font(9.5);
  g.textAlign = "center";
  const label = (wall: Wall, at: number, text: string) => {
    const pad = 14;
    if (wall === "far") g.fillText(text, X(at), Y(0) - pad);
    if (wall === "near") g.fillText(text, X(at), Y(1) + pad + 6);
    if (wall === "left") {
      g.save();
      g.translate(X(0) - pad, Y(at));
      g.rotate(-Math.PI / 2);
      g.fillText(text, 0, 0);
      g.restore();
    }
    if (wall === "right") {
      g.save();
      g.translate(X(1) + pad, Y(at));
      g.rotate(Math.PI / 2);
      g.fillText(text, 0, 0);
      g.restore();
    }
  };
  if (l.door) label(l.door.wall, l.door.at, "DOOR");
  l.windows.forEach((w) => label(w.wall, w.at, "WINDOW"));
  if (!l.door) label("near", 0.5, "NO DOOR IN THE PHOTO");

  // Furniture.
  for (const p of l.pieces) drawPiece(g, p, X, Y, room, false);

  // Grandma's suggestion for the bed.
  if (suggestion) {
    g.setLineDash([6, 5]);
    drawPiece(g, suggestion, X, Y, room, true);
    g.setLineDash([]);
    g.fillStyle = "#C23A22";
    g.font = `700 ${Math.max(15, room.w * 0.035)}px "Kalam", cursive`;
    g.textAlign = "center";
    g.fillText("here.", X(suggestion.x + suggestion.w / 2), Y(suggestion.y + suggestion.h / 2) + 5);
  }
  return c;
}

function drawPiece(
  g: CanvasRenderingContext2D,
  p: Piece,
  X: (v: number) => number,
  Y: (v: number) => number,
  room: { w: number; h: number },
  ghost: boolean,
) {
  const x = X(p.x);
  const y = Y(p.y);
  const w = p.w * room.w;
  const h = p.h * room.h;
  const ink = ghost ? "#C23A22" : "#1E1A16";
  if (p.kind === "rug") {
    g.strokeStyle = "rgba(30,26,22,.35)";
    g.lineWidth = 1;
    g.setLineDash([2, 3]);
    g.strokeRect(x, y, w, h);
    g.setLineDash([]);
    return;
  }
  if (p.kind === "clutter") {
    // A scribble.
    g.strokeStyle = "rgba(194,58,34,.85)";
    g.lineWidth = 1.4;
    g.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 4;
      const r = 0.5 - (i % 3) * 0.12;
      const px = x + w / 2 + Math.cos(a) * w * r;
      const py = y + h / 2 + Math.sin(a * 1.3) * h * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    return;
  }
  g.fillStyle = ghost ? "rgba(194,58,34,.06)" : p.kind === "plant" ? "rgba(46,106,88,.85)" : "#EBE3D4";
  g.strokeStyle = ink;
  g.lineWidth = ghost ? 1.8 : 1.8;
  if (p.kind === "plant") {
    g.beginPath();
    g.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    return;
  }
  g.beginPath();
  g.roundRect?.(x, y, w, h, p.kind === "bed" ? 5 : 2);
  if (!g.roundRect) g.rect(x, y, w, h);
  if (!ghost) g.fill();
  g.stroke();
  if (p.kind === "bed" && p.head) {
    // Pillows at the head end.
    g.lineWidth = 1.2;
    const pw = 0.18;
    const pillows: [number, number, number, number][] =
      p.head === "far" || p.head === "near"
        ? [
            [x + w * 0.08, p.head === "far" ? y + h * 0.05 : y + h * (0.95 - pw), w * 0.38, h * pw],
            [x + w * 0.54, p.head === "far" ? y + h * 0.05 : y + h * (0.95 - pw), w * 0.38, h * pw],
          ]
        : [
            [p.head === "left" ? x + w * 0.05 : x + w * (0.95 - pw), y + h * 0.08, w * pw, h * 0.38],
            [p.head === "left" ? x + w * 0.05 : x + w * (0.95 - pw), y + h * 0.54, w * pw, h * 0.38],
          ];
    for (const [px, py, pww, phh] of pillows) {
      g.beginPath();
      g.roundRect?.(px, py, pww, phh, 3);
      if (!g.roundRect) g.rect(px, py, pww, phh);
      if (!ghost) {
        g.fillStyle = "#F3EDE2";
        g.fill();
      }
      g.stroke();
    }
  }
  if (!ghost && w > 34 && h > 16 && p.kind !== "bed") {
    g.fillStyle = "#8C8173";
    g.font = `500 8.5px "Geist Mono", monospace`;
    g.textAlign = "center";
    g.fillText(p.kind.toUpperCase(), x + w / 2, y + h / 2 + 3);
  }
}
