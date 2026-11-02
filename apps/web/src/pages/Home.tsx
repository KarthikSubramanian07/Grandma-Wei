import { useEffect, useState } from "react";
import { Grandma } from "../components/Grandma";
import { PhotoPicker } from "../components/PhotoPicker";
import { navigate, onLinkClick } from "../lib/router";
import { setPending } from "../lib/pending";

const TEASERS = [
  "Show me. I won't tell anyone.",
  "Is that a mirror facing your bed?",
  "I can see the laundry from here.",
  "Your bed. We need to talk about your bed.",
  "Sit. Show Grandma.",
  "I already don't trust the mirror.",
  "Just the bedroom. For now.",
  "Everyone shows me eventually.",
  "I brought my good glasses.",
];

/** Real lines from her bank, so the home page shows exactly how she talks. Not testimonials. */
const OVERHEARD = [
  { line: "Your bed is in the coffin position. I'm not angry. I'm worried.", room: "about a bedroom" },
  { line: "Not one living thing in here. Except the dust. The dust is thriving.", room: "about a studio" },
  { line: "Your phone gets the best spot on the nightstand. What does it pay in rent?", room: "about a dorm" },
];

export const PRACTICE = [
  { id: "traveler", title: "The Traveler", note: "suitcase on the bed", photo: "/samples/traveler.jpg" },
  { id: "attic", title: "The Attic", note: "slanted ceiling", photo: "/samples/attic.jpg" },
  { id: "teak", title: "The Teak Room", note: "almost lovely", photo: "/samples/teak.jpg" },
];

export function Home() {
  const [line, setLine] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setLine((n) => (n + 1) % TEASERS.length), 3600);
    return () => clearInterval(id);
  }, []);

  // Desktop: drop a photo anywhere on the page.
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        setDragging(true);
      }
    };
    const leave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        setPending({ file });
        navigate("/read");
      }
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return (
    <main className="home">
      {dragging && <div className="dropzone">Drop it. She's ready.</div>}

      <section className="hero shell">
        <div className="hero-grandma">
          <div className="bubble paper" key={line} aria-live="polite">
            {TEASERS[line]}
          </div>
          <Grandma mood="thinking" size={210} title="Grandma Wei, peering over her glasses" />
        </div>
        <div className="hero-copy">
          <h1 className="display">
            Show Grandma
            <br />
            your room.
          </h1>
          <p className="lede">
            Take a photo. She'll score its feng shui and tell you exactly what to fix. Lovingly. Without mercy.
          </p>
          <PhotoPicker />
          <p className="fine">
            Your photo is read, then forgotten. <a href="/privacy" onClick={onLinkClick}>How that works</a>
          </p>
        </div>
      </section>

      <section className="practice shell" aria-labelledby="practice-h">
        <h2 id="practice-h">
          Not ready? <span className="italic">She'll practice on these.</span>
        </h2>
        <ul className="polaroids">
          {PRACTICE.map((s, i) => (
            <li key={s.id} style={{ ["--tilt" as string]: `${[-3, 2, -1.5][i]}deg` }}>
              <a href={`/practice/${s.id}`} onClick={onLinkClick} className="polaroid paper">
                <img src={s.photo} alt={`${s.title}: a sample room`} loading="lazy" />
                <span className="polaroid-cap">
                  <span className="hand">{s.title}</span>
                  <span className="mono">{s.note}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="overheard shell" aria-labelledby="overheard-h">
        <h2 id="overheard-h">Things she says</h2>
        <ul>
          {OVERHEARD.map((o, i) => (
            <li key={o.line} className="overheard-note" style={{ ["--tilt" as string]: `${[-1.5, 1, -0.5][i]}deg` }}>
              <p>{o.line}</p>
              <span className="mono">{o.room}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="steps shell" aria-labelledby="steps-h">
        <h2 id="steps-h" className="sr-only">
          How it works
        </h2>
        <ol>
          <li>
            <span className="step-n">1</span>
            <strong>Show her.</strong> One photo of your bedroom or office, from a corner, door in view if you can.
          </li>
          <li>
            <span className="step-n">2</span>
            <strong>Get your score.</strong> Out of 100, with notes on the photo and a short list of chores.
          </li>
          <li>
            <span className="step-n">3</span>
            <strong>Fix it, show her again.</strong> Move the bed, clear the floor, take a new photo. Watch the number climb.
          </li>
        </ol>
        <p className="steps-more">
          <a href="/how" onClick={onLinkClick}>
            What she checks, and why it's not just superstition
          </a>
        </p>
      </section>
    </main>
  );
}
