import { useEffect, useState } from "react";
import { EFFORT_LABEL, PILLAR_LABEL, PILLARS } from "@gw/schema/src/reading";
import { BrushBar } from "../components/BrushBar";
import { Grandma } from "../components/Grandma";
import { PhotoPicker } from "../components/PhotoPicker";
import { Seal } from "../components/Seal";
import { api, type SharePayload } from "../lib/api";
import { onLinkClick } from "../lib/router";

const COLOR: Record<string, string> = { command: "var(--seal)", flow: "var(--ink)", rest: "var(--ink)", light: "var(--jade)", balance: "var(--brass)" };

/** What a friend sees when you send them your scorecard. No photo: just her verdict. */
export function Share({ id }: { id: string }) {
  const [p, setP] = useState<SharePayload | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    api.getShare(id).then(setP, () => setMissing(true));
  }, [id]);

  if (missing)
    return (
      <main className="shell trouble fade-in">
        <Grandma mood="unimpressed" size={140} />
        <p className="trouble-msg">I don't have that one. Maybe it was deleted. Maybe it was never mine.</p>
        <PhotoPicker primary="Show her your own room" />
      </main>
    );
  if (!p) return <main className="shell reading-wait" aria-busy="true" />;

  return (
    <main className="shell shared fade-in">
      <p className="shared-kicker mono">Someone showed Grandma Wei their {p.kind.replace(/_/g, " ")}.</p>
      <article className="paper scorecard">
        <header className="sc-head">
          <div className="sc-brand">
            Grandma <em>Wei</em>
          </div>
          <div className="mono">{p.sample ? "Practice room" : "Her reading"}</div>
        </header>
        <section className="sc-hero">
          <div className="sc-score">
            <span className="display">{p.score ?? "?"}</span>
            <small className="mono">/100</small>
          </div>
          <div className="sc-grade">
            <span className="mono">Her grade</span>
            <span className="italic">{p.grade}</span>
          </div>
          <div className="sc-seal stamp">
            <Seal size={92} />
          </div>
        </section>
        {p.delta !== null && p.delta !== 0 && <p className="shared-delta mono">{p.delta > 0 ? `Up ${p.delta} since last time` : `Down ${-p.delta} since last time`}</p>}
        <blockquote className="sc-verdict">
          <p>{p.headline}</p>
          <footer className="mono">— Grandma Wei</footer>
        </blockquote>
        {p.chores.length > 0 && (
          <section className="sc-chores">
            <h3>
              <span>Their chores</span>
            </h3>
            <ul>
              {p.chores.map((c, i) => (
                <li key={i}>
                  <label>
                    <span className="num" aria-hidden="true">{i + 1}</span>
                    <span className="what">
                      {c.text}
                      <span className="mono">{EFFORT_LABEL[c.effort]}</span>
                    </span>
                    <span className={`pts ${c.later ? "later" : ""}`}>+{c.points}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="sc-pillars">
          {PILLARS.map((k) => (
            <div className="sc-pillar" key={k}>
              <span className="sc-pl">
                <span className="mono">{PILLAR_LABEL[k]}</span>
              </span>
              <BrushBar value={p.pillars[k]} color={COLOR[k]!} />
              <span className="sc-val">{p.pillars[k] ?? "?"}</span>
            </div>
          ))}
        </section>
      </article>
      <section className="shared-cta">
        <Grandma mood="thinking" size={110} />
        <div>
          <h2>Your turn.</h2>
          <p>One photo. She'll tell you what's wrong with your room, and how to fix it.</p>
          <PhotoPicker />
          <p className="fine">
            Or <a href="/practice/traveler" onClick={onLinkClick}>watch her read a practice room</a> first.
          </p>
        </div>
      </section>
    </main>
  );
}
