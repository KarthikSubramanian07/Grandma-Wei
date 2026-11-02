import { useEffect, useState } from "react";
import { Grandma } from "./Grandma";

const LINES = [
  "Putting my glasses on.",
  "Hold still.",
  "Hmm.",
  "Where's the door?",
  "Oh.",
  "I see.",
  "Is that what I think it is?",
  "Let me count the chargers.",
  "Mm-hm.",
  "Writing this down.",
];

/** While her eyes read the photo: the photo on the table, a loupe drifting over it, her muttering. */
export function Looking({ src }: { src: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % LINES.length), 1900);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="looking" aria-live="polite" aria-busy="true">
      <div className="looking-photo paper">
        <img src={src} alt="Your room, on Grandma's table" />
        <div className="loupe" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />
      </div>
      <div className="looking-side">
        <Grandma mood="thinking" size={120} />
        <p className="looking-line" key={i}>
          {LINES[i]}
        </p>
        <p className="mono">She takes about twenty seconds. She's thorough.</p>
      </div>
    </section>
  );
}
