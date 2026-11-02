import { useState } from "react";
import type { ChoreId, Reading } from "@gw/schema/src/reading";
import { EFFORT_LABEL, PILLAR_HINT, PILLAR_LABEL, PILLARS } from "@gw/schema/src/reading";
import { GRADE, WHY } from "@gw/voice";
import type { ReadingResult } from "../lib/api";
import { BrushBar } from "./BrushBar";
import { Odometer } from "./Odometer";
import { Seal } from "./Seal";

const PILLAR_COLOR: Record<string, string> = {
  command: "var(--seal)",
  flow: "var(--ink)",
  rest: "var(--ink)",
  light: "var(--jade)",
  balance: "var(--brass)",
};

const CHORE_NAME: Record<ChoreId, string> = {
  move_bed: "the bed",
  solid_headboard: "the headboard",
  move_desk: "the desk",
  declutter: "the piles",
  clear_door_path: "the doorway",
  free_the_door: "the door",
  clear_under_bed: "under the bed",
  break_the_line: "the door and window",
  turn_the_mirror: "the mirror",
  screens_out: "the screens",
  soften_corners: "the corner",
  let_light_in: "the curtains",
  warm_lamp: "the lamp",
  real_plant: "the plant",
  balance_elements: "the balance",
};

interface Props {
  result: ReadingResult;
  /** The reading if the ticked chores were done. */
  imagined: Reading | null;
  done: Set<ChoreId>;
  onToggle: (id: ChoreId) => void;
  stampKey: number;
}

export function Scorecard({ result, imagined, done, onToggle, stampKey }: Props) {
  const { reading, voice, scene, sample } = result;
  const shown = imagined ?? reading;
  const projected = imagined && imagined.score !== reading.score ? imagined.score : null;
  const gradeLabel = imagined?.grade ? GRADE[imagined.grade].label : voice.grade;
  const why = reading.headline ? WHY[reading.headline] : null;
  const [more, setMore] = useState(false);
  const visible = more ? reading.chores : reading.chores.slice(0, 3);
  const hidden = reading.chores.length - visible.length;

  return (
    <article className="paper scorecard" aria-label="Grandma Wei's scorecard">
      <header className="sc-head">
        <div className="sc-brand">
          Grandma <em>Wei</em>
        </div>
        <div className="mono">
          {sample ? "Practice room" : "Her reading"} · {scene.kind.replace(/_/g, " ")}
        </div>
      </header>

      <section className="sc-hero">
        <div className="sc-score" aria-live="polite">
          <Odometer value={reading.score} className="display" />
          <small className="mono">/100</small>
          {projected !== null && (
            <span className="sc-projected" title="If you do the ticked chores">
              <span aria-hidden="true">→</span> <Odometer value={projected} />
            </span>
          )}
        </div>
        <div className="sc-grade">
          <span className="mono">{imagined ? "If you do it" : "Her grade"}</span>
          <span className="italic">{gradeLabel ?? "No grade."}</span>
        </div>
        <div key={stampKey} className="sc-seal stamp">
          <Seal size={92} />
        </div>
      </section>

      <blockquote className="sc-verdict">
        <p>{voice.headline}</p>
        <footer className="mono">— Grandma Wei</footer>
        {why && reading.state === "ok" && (
          <details className="sc-why">
            <summary>Why she's right</summary>
            <p>{why}</p>
          </details>
        )}
      </blockquote>

      {reading.chores.length > 0 && (
        <section className="sc-chores" aria-label="Her chores">
          <h3>
            <span>Your chores</span>
            <span className="mono">Do them all: {reading.potential ?? "?"}</span>
          </h3>
          <p className="sc-help">Tick the ones you'll do and watch your score change.</p>
          <ul>
            {visible.map((c) => {
              const text = voice.chores.find((v) => v.id === c.id)?.text ?? "";
              const blocker = c.blocked_by && !done.has(c.blocked_by) ? CHORE_NAME[c.blocked_by] : null;
              return (
                <li key={c.id} className={done.has(c.id) ? "done" : ""}>
                  <label>
                    <input type="checkbox" checked={done.has(c.id)} onChange={() => onToggle(c.id)} />
                    <span className="box" aria-hidden="true" />
                    <span className="what">
                      {text}
                      <span className="mono">
                        {EFFORT_LABEL[c.effort]}
                        {blocker ? ` · counts once ${blocker} is done` : ""}
                      </span>
                    </span>
                    <span className={`pts ${blocker ? "later" : ""}`}>+{c.points}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {hidden > 0 && (
            <button className="link-btn sc-more" onClick={() => setMore(true)}>
              {hidden} smaller {hidden === 1 ? "chore" : "chores"}
            </button>
          )}
        </section>
      )}
      {reading.state === "ok" && (
        <section className="sc-pillars" aria-label="The five things she checks">
          <h3>
            <span>How it adds up</span>
          </h3>
          {PILLARS.map((p) => (
            <div className="sc-pillar" key={p} title={PILLAR_HINT[p]}>
              <span className="sc-pl">
                <span className="mono">{PILLAR_LABEL[p]}</span>
                <span className="sc-hint">{PILLAR_HINT[p]}</span>
              </span>
              <BrushBar value={reading.pillars[p]} ghost={imagined ? shown.pillars[p] : null} color={PILLAR_COLOR[p]!} />
              <span className="sc-val">{reading.pillars[p] ?? "?"}</span>
            </div>
          ))}
        </section>
      )}

    </article>
  );
}
