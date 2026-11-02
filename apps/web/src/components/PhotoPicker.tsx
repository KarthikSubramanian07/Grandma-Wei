import { useRef } from "react";
import { setPending } from "../lib/pending";
import type { Visit } from "../lib/history";
import { navigate } from "../lib/router";

const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

interface Props {
  prev?: Visit;
  primary?: string;
  /** Show the secondary (library) button as a quiet link. */
  compact?: boolean;
  tone?: "paper" | "ink";
}

/**
 * The one button that matters. On phones: take a photo, or pick one.
 * On computers: pick a file (or drop it on the page).
 */
export function PhotoPicker({ prev, primary, compact = false, tone = "paper" }: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPending({ file, prev });
    navigate("/read");
  };
  const label = primary ?? (touch ? "Take a photo" : "Choose a photo");
  return (
    <div className={`picker ${compact ? "compact" : ""}`}>
      <button className={`btn btn-${tone}`} onClick={() => (touch ? camera : library).current?.click()}>
        <span className="dot" aria-hidden="true" />
        {label}
      </button>
      {touch && (
        <button className={compact ? "link-btn" : `btn btn-ghost`} onClick={() => library.current?.click()}>
          Choose from your photos
        </button>
      )}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={library} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" hidden onChange={pick} />
    </div>
  );
}
