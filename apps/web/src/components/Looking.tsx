import { useEffect, useState } from "react";
import { Grandma } from "./Grandma";

const LINES = [
  "Putting my glasses on.",
  "Hold still.",
  "Hmm.",
  "Where's the door?",
  "Oh.",
  "Let me get my other glasses.",
  "Is that what I think it is?",
  "Counting the chargers. Still counting.",
  "Mm-hm.",
  "Checking under the bed. Mentally.",
  "I've seen this before.",
  "Writing this down. In pen.",
  "Oh, I have notes.",
];

/** While her eyes read the photo: the photo on the table, a loupe drifting over it, her muttering. */
export function Looking({ src }: { src: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % LINES.length), 1900);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="looking" aria-live="polite" aria-busy="true">
      <h1 className="sr-only">She's looking at your room</h1>
      <div className="looking-photo paper">
        <img src={src} alt="Your room, on Grandma's table" />
        <div className="loupe" aria-hidden="true" />
      </div>
      <div className="looking-side">
        <Grandma mood="thinking" size={120} />
        <p className="looking-line" key={i}>
          {LINES[i]}
        </p>
        <p className="mono">About twenty seconds. She's thorough. She's also judging the lighting.</p>
      </div>
    </section>
  );
}
