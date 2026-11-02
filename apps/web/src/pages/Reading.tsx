import { useEffect, useMemo, useRef, useState } from "react";
import type { ChoreId } from "@gw/schema";
import { MAGNETS, RULE_NAME } from "@gw/voice";
import { Grandma, moodFor, type Mood } from "../components/Grandma";
import { Looking } from "../components/Looking";
import { PhotoNotes } from "../components/PhotoNotes";
import { PhotoPicker } from "../components/PhotoPicker";
import { Scorecard } from "../components/Scorecard";
import { Sketch } from "../components/Sketch";
import { api, ApiError, type Envelope } from "../lib/api";
import { cardData, deliverImage, payloadOf, renderCardPng } from "../lib/card";
import { getVisit, saveVisit, type Visit } from "../lib/history";
import { ImageError, preparePhoto } from "../lib/image";
import { takePending } from "../lib/pending";
import { qi, qiReady } from "../lib/qi";
import { navigate, onLinkClick } from "../lib/router";
import { toast } from "../lib/toast";
import { PRACTICE } from "./Home";

export type Source = { kind: "photo" } | { kind: "practice"; name: string } | { kind: "visit"; id: string };

type Phase =
  | { t: "preparing" }
  | { t: "looking"; photo: string }
  | { t: "done"; env: Envelope; photo: string; visit: Visit | null }
  | { t: "error"; message: string; code: string; photo?: string };

export function Reading({ source }: { source: Source }) {
  const [phase, setPhase] = useState<Phase>({ t: "preparing" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run(source, setPhase).catch((e: unknown) => {
      const message = e instanceof ApiError || e instanceof ImageError ? e.message : "Something went wrong. Try again in a minute.";
      const code = e instanceof ApiError ? e.code : "image";
      setPhase((p) => ({ t: "error", message, code, photo: p.t === "looking" ? p.photo : undefined }));
    });
  }, [source]);

  if (phase.t === "preparing") return <main className="shell reading-wait" aria-busy="true" />;
  if (phase.t === "looking") return <main className="shell"><Looking src={phase.photo} /></main>;
  if (phase.t === "error") return <Trouble message={phase.message} code={phase.code} />;
  return <Result env={phase.env} photo={phase.photo} visit={phase.visit} />;
}

async function run(source: Source, set: (p: Phase) => void) {
  const engine = qiReady();
  if (source.kind === "practice") {
    const s = PRACTICE.find((p) => p.id === source.name);
    if (!s) throw new ApiError("not_found", "I don't have that room.", 404);
    const [env] = await Promise.all([api.sample(s.id), engine]);
    set({ t: "done", env, photo: s.photo, visit: null });
    return;
  }
  if (source.kind === "visit") {
    const [visit] = await Promise.all([getVisit(source.id), engine]);
    if (!visit) throw new ApiError("not_found", "That reading isn't on this device. Readings live only in the browser that made them.", 404);
    const photo = visit.photo ? URL.createObjectURL(visit.photo) : PRACTICE.find((p) => p.id === visit.envelope.result.sample)?.photo ?? "";
    set({ t: "done", env: visit.envelope, photo, visit });
    return;
  }
  const pending = takePending();
  if (!pending) {
    navigate("/", { replace: true });
    return;
  }
  const prepared = await preparePhoto(pending.file);
  const photo = URL.createObjectURL(prepared.blob);
  set({ t: "looking", photo });
  const prev = pending.prev ? { signed: pending.prev.envelope.signed, sig: pending.prev.envelope.sig } : undefined;
  const [env] = await Promise.all([api.read(prepared.base64, prepared.mediaType, prev), engine]);
  const visit: Visit = { id: env.result.id, at: Date.now(), envelope: env, photo: prepared.blob, prevId: pending.prev?.id };
  await saveVisit(visit).catch(() => {});
  history.replaceState(null, "", `/visit/${visit.id}`);
  set({ t: "done", env, photo, visit });
}

function Trouble({ message, code }: { message: string; code: string }) {
  const noEyes = code === "no_eyes" || code === "napping";
  return (
    <main className="shell trouble fade-in">
      <Grandma mood="concerned" size={150} />
      <p className="trouble-msg">{message}</p>
      <div className="trouble-actions">
        {noEyes ? (
          PRACTICE.map((p) => (
            <a key={p.id} className="btn btn-paper btn-sm" href={`/practice/${p.id}`} onClick={onLinkClick}>
              Try {p.title}
            </a>
          ))
        ) : (
          <>
            <PhotoPicker primary="Try another photo" compact />
            <a className="link-btn" href="/" onClick={onLinkClick}>
              Back to the kitchen
            </a>
          </>
        )}
      </div>
    </main>
  );
}

function Result({ env, photo, visit }: { env: Envelope; photo: string; visit: Visit | null }) {
  const { result } = env;
  const { reading, voice, scene, diff, suggestion, sample } = result;
  const [done, setDone] = useState<Set<ChoreId>>(new Set());
  const [tab, setTab] = useState<"photo" | "sketch">("photo");
  const [busy, setBusy] = useState<string | null>(null);
  const [stamp, setStamp] = useState(0);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const imagined = useMemo(() => {
    if (!done.size) return null;
    const s = qi.imagine(scene, [...done]);
    return { scene: s, reading: qi.read(s) };
  }, [done, scene]);

  // A small thunk when the seal lands, on phones that can.
  useEffect(() => {
    const t = setTimeout(() => navigator.vibrate?.([14, 40, 22]), 700);
    return () => clearTimeout(t);
  }, [stamp]);

  useEffect(() => {
    document.title = reading.score === null ? "Grandma Wei" : `${reading.score}/100 · Grandma Wei`;
    return () => void (document.title = "Grandma Wei · Show her your room");
  }, [reading.score]);

  const toggle = (id: ChoreId) => {
    setDone((d) => {
      const n = new Set(d);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const mood: Mood =
    diff && diff.delta !== null && !diff.different_room
      ? diff.delta >= 15
        ? "delighted"
        : diff.delta < 0
          ? "concerned"
          : diff.delta === 0
            ? "unimpressed"
            : "proud"
      : moodFor(reading.grade);

  const save = async (format: "post" | "story") => {
    setBusy(format);
    try {
      const blob = await renderCardPng(cardData(payloadOf(result)), format);
      const how = await deliverImage(blob, `grandma-wei-${reading.score ?? "reading"}-${format}.png`, voice.headline);
      if (how === "downloaded") toast("Saved. Go show people.");
    } catch {
      toast("I couldn't make the image. Try again?");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      let url = shareUrl;
      if (!url) {
        const s = await api.share(env.signed, env.sig);
        url = `${location.origin}${s.path}`;
        setShareUrl(url);
        if (visit) await saveVisit({ ...visit, shares: [...(visit.shares ?? []), { id: s.id, token: s.delete_token }] }).catch(() => {});
      }
      const text = `Grandma Wei gave my ${scene.kind.replace(/_/g, " ")} ${reading.score}/100. "${voice.headline}"`;
      if (navigator.share) {
        await navigator.share({ title: "Grandma Wei", text, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast("Link copied. Only the scorecard is shared, never your photo.");
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't make a link. Save the image instead?");
    } finally {
      setBusy(null);
    }
  };

  const all = reading.chores.map((c) => c.id);
  const ok = reading.state === "ok";

  return (
    <main className="result shell">
      {diff && <RetakeBanner diff={diff} line={voice.retake} />}

      <div className="result-grid">
        <div className="result-card">
          <Scorecard result={result} imagined={imagined?.reading ?? null} done={done} onToggle={toggle} stampKey={stamp} />
        </div>

        <aside className="result-talk">
          <div className="talk">
            <Grandma mood={mood} size={104} />
            <div className="talk-bubble paper">
              {voice.aside && <p>{voice.aside}</p>}
              {voice.asks.map((a) => (
                <p key={a} className="talk-ask">
                  {a}
                </p>
              ))}
            </div>
          </div>

          <div className="next">
            {sample ? (
              <>
                {ok && all.length > 0 && done.size < all.length && (
                  <button
                    className="btn btn-paper"
                    onClick={() => {
                      setDone(new Set(all));
                      setTab("sketch");
                      setStamp((n) => n + 1);
                      toast("She knows you didn't. But fine, here's how it would look.");
                    }}
                  >
                    <span className="dot" aria-hidden="true" />
                    Pretend I did every chore
                  </button>
                )}
                <PhotoPicker primary="Now show her your room" tone={done.size ? "paper" : "ink"} compact />
              </>
            ) : (
              ok && (
                <>
                  {photo && (
                    <p className="retake-tip">
                      <img src={photo} alt="" />
                      <span>Same corner, same height as this one. She compares.</span>
                    </p>
                  )}
                  <PhotoPicker prev={visit ?? undefined} primary="I did my chores. Show her again." compact />
                </>
              )
            )}
            {ok && (
              <div className="next-row">
                <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => save("story")}>
                  {busy === "story" ? "Drawing…" : "Save for Stories"}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => save("post")}>
                  {busy === "post" ? "Drawing…" : "Save as a post"}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={share}>
                  {busy === "share" ? "One sec…" : "Share a link"}
                </button>
              </div>
            )}
            <p className="fine">
              {sample
                ? "This is a practice room. Your own readings stay on this device."
                : "Saved on this device only. Shared links show the scorecard, never your photo."}
            </p>
          </div>
        </aside>

        <section className="result-photo" aria-label="Your room">
          <div
            className="tabs"
            role="tablist"
            aria-label="Photo or sketch"
            onKeyDown={(e) => {
              if (!ok || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
              const next = tab === "photo" ? "sketch" : "photo";
              setTab(next);
              (e.currentTarget.querySelector(`[data-tab=${next}]`) as HTMLElement | null)?.focus();
            }}
          >
            <button role="tab" data-tab="photo" aria-selected={tab === "photo"} tabIndex={tab === "photo" ? 0 : -1} onClick={() => setTab("photo")}>
              Her notes
            </button>
            <button
              role="tab"
              data-tab="sketch"
              aria-selected={tab === "sketch"}
              tabIndex={tab === "sketch" ? 0 : -1}
              onClick={() => setTab("sketch")}
              disabled={!ok}
            >
              How energy moves
            </button>
          </div>
          <div className="paper photo-frame">
            {tab === "photo" ? (
              <PhotoNotes src={photo} items={scene.items} notes={voice.notes} delay={600} alt={`The ${scene.kind.replace(/_/g, " ")} you showed her`} />
            ) : (
              <>
                <Sketch
                  scene={imagined?.scene ?? scene}
                  suggestion={suggestion}
                  showSuggestion={!done.has("move_bed") && reading.chores.some((c) => c.id === "move_bed")}
                />
                <p className="sketch-legend">
                  <span>
                    <i className="lg-ink" /> energy coming in
                  </span>
                  <span>
                    <i className="lg-red" /> stuck or rushing
                  </span>
                  {suggestion && !done.has("move_bed") && reading.chores.some((c) => c.id === "move_bed") && (
                    <span>
                      <i className="lg-dash" /> where she'd put the bed
                    </span>
                  )}
                </p>
                <p className="fine sketch-note">
                  {done.size
                    ? "This is your room with the ticked chores done."
                    : "A rough top-down sketch from your photo. Tick a chore to see the change."}
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function RetakeBanner({ diff, line }: { diff: NonNullable<Envelope["result"]["diff"]>; line: string | null }) {
  const up = (diff.delta ?? 0) > 0;
  return (
    <section className={`retake paper fade-in ${up ? "up" : ""}`} aria-live="polite">
      <div className="retake-nums">
        <span className="mono">Last time</span>
        <span className="retake-before">{diff.before ?? "?"}</span>
        <span aria-hidden="true">→</span>
        <span className="retake-after">{diff.after ?? "?"}</span>
        {diff.delta !== null && <span className={`retake-delta ${up ? "up" : "down"}`}>{up ? `+${diff.delta}` : diff.delta}</span>}
      </div>
      {line && <p className="retake-line">{line}</p>}
      {(diff.improved.length > 0 || diff.magnets.length > 0) && (
        <div className="retake-meta">
          {diff.improved.length > 0 && <span>Better: {diff.improved.map((r) => RULE_NAME[r]).join(", ")}.</span>}
          {diff.magnets.map((m) => (
            <span key={m} className="magnet-chip">
              {MAGNETS[m].name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
