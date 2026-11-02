import { useEffect, useRef, useState } from "react";
import type { MagnetId } from "@gw/schema";
import { MAGNETS } from "@gw/voice";
import { Grandma } from "../components/Grandma";
import { PhotoPicker } from "../components/PhotoPicker";
import { api } from "../lib/api";
import { allVisits, clearFridge, deleteVisit, magnetsOf, type Visit } from "../lib/history";
import { navigate } from "../lib/router";
import { toast } from "../lib/toast";

const ORDER: MagnetId[] = [
  "first_reading",
  "out_of_the_coffin",
  "mirror_mirror",
  "clean_under_there",
  "commanding_officer",
  "plant_parent",
  "tidy_up",
  "screens_down",
  "open_door_policy",
  "five_elements",
  "glow_up",
  "eighty_club",
  "id_sleep_here",
];

const COLORS = ["#C23A22", "#2E6A58", "#B4873A", "#1E1A16", "#5F7FA6", "#9E2D19"];

/** Grandma's fridge: your readings and magnets. Everything here lives only in this browser. */
export function Fridge() {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const load = () => allVisits().then(setVisits, () => setVisits([]));
  useEffect(() => void load(), []);

  if (!visits) return <main className="shell reading-wait" aria-busy="true" />;
  const real = visits.filter((v) => !v.envelope.result.sample);
  const earned = new Map(magnetsOf(real).map((m) => [m.id, m.at]));
  const pair = findPair(real);

  const remove = async (v: Visit) => {
    for (const s of v.shares ?? []) await api.deleteShare(s.id, s.token).catch(() => {});
    await deleteVisit(v.id);
    toast("Gone. She forgets nothing, but this browser does.");
    load();
  };
  const wipe = async () => {
    if (!confirm("Clear every reading, photo and magnet from this device? Shared links you made will be deleted too.")) return;
    for (const v of real) for (const s of v.shares ?? []) await api.deleteShare(s.id, s.token).catch(() => {});
    await clearFridge();
    load();
  };

  return (
    <main className="shell fridge fade-in">
      <header className="page-head">
        <h1>The fridge</h1>
        <p>Your readings and magnets. Kept on this device only, never on a server.</p>
      </header>

      {real.length === 0 && (
        <div className="empty-state fridge-empty-first">
          <Grandma mood="unimpressed" size={110} />
          <p>Nothing on the fridge yet. Show her a room and the magnets start coming.</p>
          <PhotoPicker />
        </div>
      )}

      <section className="fridge-door paper" aria-label="Magnets">
        <ul className="magnets">
          {ORDER.map((id, i) => {
            const at = earned.get(id);
            return (
              <li key={id} className={at ? "has" : "empty"} style={{ ["--c" as string]: COLORS[i % COLORS.length], ["--tilt" as string]: `${((i * 37) % 9) - 4}deg` }}>
                <span className="magnet-name">{at ? MAGNETS[id].name : "?"}</span>
                <span className="magnet-blurb">{MAGNETS[id].blurb}</span>
              </li>
            );
          })}
        </ul>
        <p className="mono fridge-count">
          {earned.size} of {ORDER.length} magnets
        </p>
      </section>

      {pair && <BeforeAfter before={pair[0]} after={pair[1]} />}

      <section aria-label="Your readings">
        <h2 className="section-h">Your readings</h2>
        {real.length === 0 ? (
          <p className="fine">None yet.</p>
        ) : (
          <ul className="visits">
            {real.map((v) => (
              <VisitRow key={v.id} v={v} onOpen={() => navigate(`/visit/${v.id}`)} onDelete={() => remove(v)} />
            ))}
          </ul>
        )}
      </section>

      {real.length > 0 && (
        <p className="fine wipe">
          <button className="link-btn" onClick={wipe}>
            Clear everything from this device
          </button>
        </p>
      )}
    </main>
  );
}

function useObjectUrl(blob?: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function VisitRow({ v, onOpen, onDelete }: { v: Visit; onOpen: () => void; onDelete: () => void }) {
  const url = useObjectUrl(v.photo);
  const r = v.envelope.result;
  return (
    <li className="visit paper">
      <button className="visit-open" onClick={onOpen}>
        {url ? <img src={url} alt="" /> : <span className="visit-noimg" />}
        <span className="visit-score">{r.reading.score ?? "?"}</span>
        <span className="visit-text">
          <span className="visit-head">{r.voice.headline}</span>
          <span className="mono">
            {r.scene.kind.replace(/_/g, " ")} · {new Date(v.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {r.diff?.delta ? ` · ${r.diff.delta > 0 ? "+" : ""}${r.diff.delta}` : ""}
          </span>
        </span>
      </button>
      <button className="visit-del" onClick={onDelete} aria-label="Delete this reading">
        ×
      </button>
    </li>
  );
}

/** The latest retake and the reading before it. */
function findPair(visits: Visit[]): [Visit, Visit] | null {
  for (const v of visits) {
    if (!v.prevId) continue;
    const prev = visits.find((p) => p.id === v.prevId);
    if (prev?.photo && v.photo) return [prev, v];
  }
  return null;
}

function BeforeAfter({ before, after }: { before: Visit; after: Visit }) {
  const a = useObjectUrl(before.photo);
  const b = useObjectUrl(after.photo);
  const [x, setX] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setX(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <section aria-label="Before and after" className="ba-wrap">
      <h2 className="section-h">
        Before and after{" "}
        <span className="mono">
          {before.envelope.result.reading.score} → {after.envelope.result.reading.score}
        </span>
      </h2>
      <div
        className="ba paper"
        ref={box}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && move(e.clientX)}
      >
        {b && <img src={b} alt="After" />}
        {a && <img src={a} alt="Before" className="ba-before" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }} />}
        <div className="ba-handle" style={{ left: `${x}%` }} aria-hidden="true" />
        <span className="ba-label mono left">Before</span>
        <span className="ba-label mono right">After</span>
        <input
          className="sr-only"
          type="range"
          min={0}
          max={100}
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
          aria-label="Slide between before and after"
        />
      </div>
    </section>
  );
}
